-- CreateTable
CREATE TABLE "payment_methods" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "account_name" TEXT,
    "phone_number" TEXT,
    "merchant_code" TEXT,
    "instructions" TEXT,
    "ussd_code" TEXT,
    "logo_key" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manual_payments" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "payment_method_id" TEXT,
    "method_provider" TEXT NOT NULL,
    "method_name" TEXT NOT NULL,
    "sent_to_holder" TEXT,
    "sent_to_phone" TEXT,
    "sent_to_code" TEXT,
    "client_request_id" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GNF',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "checkout" JSONB NOT NULL,
    "sale_id" TEXT,
    "payer_name" TEXT,
    "payer_phone" TEXT,
    "transaction_reference" TEXT,
    "reference_key" TEXT,
    "amount_sent" DECIMAL(14,2),
    "paid_at" TIMESTAMP(3),
    "proof_key" TEXT,
    "submitted_at" TIMESTAMP(3),
    "verified_at" TIMESTAMP(3),
    "verified_by" TEXT,
    "rejected_at" TIMESTAMP(3),
    "rejected_by" TEXT,
    "rejection_reason" TEXT,
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manual_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payment_methods_business_id_is_active_idx" ON "payment_methods"("business_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "manual_payments_sale_id_key" ON "manual_payments"("sale_id");

-- CreateIndex
CREATE INDEX "manual_payments_business_id_status_created_at_idx" ON "manual_payments"("business_id", "status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "manual_payments_business_id_client_request_id_key" ON "manual_payments"("business_id", "client_request_id");

-- AddForeignKey
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manual_payments" ADD CONSTRAINT "manual_payments_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manual_payments" ADD CONSTRAINT "manual_payments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manual_payments" ADD CONSTRAINT "manual_payments_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manual_payments" ADD CONSTRAINT "manual_payments_rejected_by_fkey" FOREIGN KEY ("rejected_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manual_payments" ADD CONSTRAINT "manual_payments_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "payment_methods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manual_payments" ADD CONSTRAINT "manual_payments_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- A transaction id can be used only once per operator: a payment whose reference is currently
-- claimed (submitted, or verified) blocks any other from claiming it. Rejected and cancelled
-- payments release it, so a customer can correct a wrong reference. Prisma cannot express a partial
-- unique index, so it is written by hand here (and is invisible to `prisma migrate diff`).
CREATE UNIQUE INDEX "manual_payments_reference_in_use_key"
  ON "manual_payments" ("business_id", "method_provider", "reference_key")
  WHERE "reference_key" IS NOT NULL AND "status" IN ('submitted', 'verified');
