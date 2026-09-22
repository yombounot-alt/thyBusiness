import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/** A valid EAN-13 (its last digit is the check digit), so the demo barcodes can really be scanned by a camera. */
function ean13(first12: string): string {
  const sum = [...first12].reduce((total, digit, i) => total + Number(digit) * (i % 2 === 0 ? 1 : 3), 0);
  return first12 + String((10 - (sum % 10)) % 10);
}

async function main() {
  const phone = '+224600000000';
  const passwordHash = await bcrypt.hash('Demo1234!', 12);

  const user = await prisma.user.upsert({
    where: { phone },
    update: {},
    create: {
      phone,
      passwordHash,
      fullName: 'Tamba Camara',
      email: 'demo@thybusiness.test',
      phoneVerifiedAt: new Date(),
    },
  });

  const business = await prisma.business.upsert({
    where: { id: 'seed-business-boutique-demo' },
    update: {},
    create: {
      id: 'seed-business-boutique-demo',
      name: 'Boutique Demo',
      businessType: 'commerce',
      currency: 'GNF',
      phone,
      address: 'Kaloum, Conakry',
      ownerId: user.id,
    },
  });

  await prisma.businessMember.upsert({
    where: { businessId_userId: { businessId: business.id, userId: user.id } },
    update: {},
    create: { businessId: business.id, userId: user.id, role: 'owner' },
  });

  const categories = await Promise.all(
    ['Boissons', 'Alimentaire', 'Hygiène'].map((name) =>
      prisma.category.upsert({
        where: { businessId_name: { businessId: business.id, name } },
        update: {},
        create: { businessId: business.id, name },
      }),
    ),
  );
  const [boissons, alimentaire, hygiene] = categories;

  const products: Array<{
    name: string;
    categoryId: string;
    purchasePrice: number;
    salePrice: number;
    stock: number;
    barcode: string;
    lowStockThreshold?: number;
  }> = [
    { name: 'Eau minérale 1.5L', categoryId: boissons.id, purchasePrice: 3000, salePrice: 5000, stock: 48, barcode: ean13('600123400001'), lowStockThreshold: 12 },
    { name: 'Jus de gingembre 33cl', categoryId: boissons.id, purchasePrice: 2500, salePrice: 4000, stock: 30, barcode: ean13('600123400002'), lowStockThreshold: 10 },
    { name: 'Riz local 25kg', categoryId: alimentaire.id, purchasePrice: 180000, salePrice: 220000, stock: 8, barcode: ean13('600123400003'), lowStockThreshold: 3 },
    { name: 'Huile végétale 1L', categoryId: alimentaire.id, purchasePrice: 12000, salePrice: 16000, stock: 25, barcode: ean13('600123400004'), lowStockThreshold: 8 },
    { name: 'Sucre en poudre 1kg', categoryId: alimentaire.id, purchasePrice: 6000, salePrice: 8500, stock: 6, barcode: ean13('600123400005'), lowStockThreshold: 10 },
    { name: 'Savon de toilette', categoryId: hygiene.id, purchasePrice: 1500, salePrice: 2500, stock: 40, barcode: ean13('600123400006'), lowStockThreshold: 15 },
  ];

  for (const p of products) {
    const existing = await prisma.product.findFirst({
      where: { businessId: business.id, name: p.name },
    });
    if (existing) {
      // Demo databases seeded before barcodes existed (or with the first, invalid demo codes): bring the
      // demo barcode up to date without touching anything else.
      if (!existing.barcode || (existing.barcode.startsWith('600123400') && existing.barcode !== p.barcode)) {
        await prisma.product.update({ where: { id: existing.id }, data: { barcode: p.barcode } });
      }
      continue;
    }

    const created = await prisma.product.create({
      data: {
        businessId: business.id,
        categoryId: p.categoryId,
        name: p.name,
        barcode: p.barcode,
        purchasePrice: p.purchasePrice,
        salePrice: p.salePrice,
        currentStock: p.stock,
        lowStockThreshold: p.lowStockThreshold,
      },
    });

    if (p.stock > 0) {
      await prisma.inventoryMovement.create({
        data: {
          businessId: business.id,
          productId: created.id,
          type: 'initial',
          quantity: p.stock,
          unitCost: p.purchasePrice,
          note: 'Stock initial (seed)',
          createdBy: user.id,
        },
      });
    }
  }

  // A real UUID: the API validates customerId with @IsUUID(), so a hand-written id would be
  // rejected as soon as the demo customer is picked for a credit sale.
  const demoCustomerId = '5eed0c05-7a1e-4d1a-9b7e-0000000000c1';
  const customer = await prisma.customer.upsert({
    where: { id: demoCustomerId },
    update: {},
    create: {
      id: demoCustomerId,
      businessId: business.id,
      fullName: 'Mamadou Diallo',
      phone: '+224655555555',
      currentBalance: 0,
    },
  });

  const existingCredit = await prisma.customerCredit.findFirst({
    where: { businessId: business.id, customerId: customer.id },
  });
  if (!existingCredit) {
    await prisma.customerCredit.create({
      data: {
        businessId: business.id,
        customerId: customer.id,
        originalAmount: 350000,
        remainingAmount: 350000,
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        note: 'Achat de matériaux (seed)',
        createdBy: user.id,
      },
    });
    await prisma.customer.update({
      where: { id: customer.id },
      data: { currentBalance: { increment: 350000 } },
    });
  }

  const expenses: Array<{ category: string; amount: number; description: string }> = [
    { category: 'transport', amount: 15000, description: 'Livraison fournisseur' },
    { category: 'electricite', amount: 80000, description: 'Facture EDG du mois' },
  ];
  for (const e of expenses) {
    const existing = await prisma.expense.findFirst({
      where: { businessId: business.id, category: e.category, description: e.description },
    });
    if (existing) continue;
    await prisma.expense.create({
      data: { businessId: business.id, recordedBy: user.id, ...e },
    });
  }

  console.log('Seed terminé :');
  console.log(`  Utilisateur démo : ${phone} / Demo1234!`);
  console.log(`  Entreprise démo  : ${business.name} (${business.id})`);
  console.log(`  Catégories       : ${categories.map((c) => c.name).join(', ')}`);
  console.log(`  Produits         : ${products.length} créés/existants`);
  console.log(`  Client démo      : ${customer.fullName} (crédit ouvert)`);
  console.log(`  Dépenses         : ${expenses.length} créées/existantes`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
