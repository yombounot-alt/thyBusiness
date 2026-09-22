# DOSSIER PREMIUM — ÉCOSYSTÈME THY

> Cahier des charges complet du produit THY Business. Ce document décrit la **vision produit complète** (32 écrans, ~25 tables, IA, paiements, abonnements, offline-sync). Le cycle de développement en cours n'en implémente qu'un sous-ensemble — voir [`decisions/0004-out-of-scope-tables.md`](decisions/0004-out-of-scope-tables.md) pour le périmètre exact du MVP actuel.

L'objectif est de construire des applications réellement exploitables, avec une architecture moderne, sécurisée, évolutive et adaptée au contexte africain/francophone.

## PARTIE I — CAHIER DES CHARGES PREMIUM DE THY BUSINESS

### 1. Présentation du projet

#### Nom

THY Business

#### Positionnement

THY Business est une application mobile SaaS destinée aux commerçants, entrepreneurs et petites/moyennes entreprises permettant de gérer leur activité depuis un smartphone.

L'application doit réunir dans une seule interface :

- caisse ;
- ventes ;
- produits ;
- stock ;
- achats ;
- clients ;
- fournisseurs ;
- dépenses ;
- dettes/crédits ;
- bénéfices ;
- employés ;
- statistiques ;
- facturation ;
- notifications ;
- sauvegarde cloud ;
- intelligence artificielle.

#### Cible

- boutiques ;
- magasins ;
- restaurants ;
- pharmacies ;
- salons de coiffure ;
- ateliers ;
- vendeurs indépendants ;
- grossistes ;
- détaillants ;
- petites entreprises ;
- microentrepreneurs.

### 2. Architecture générale

```
                    THY BUSINESS
                         │
       ┌─────────────────┼─────────────────┐
       │                 │                 │
    MOBILE APP        BACKEND           ADMIN
       │                 │                 │
       │           API / SERVICES         │
       │                 │                 │
       └──────────── DATABASE ─────────────┘
                         │
              ┌──────────┼──────────┐
              │          │          │
           Paiement      IA       Notifications
```

#### Architecture recommandée

| Composant | Choix recommandé |
|---|---|
| Frontend mobile | Flutter |
| Backend | NestJS / Node.js |
| Base de données | PostgreSQL |
| Cache | Redis |
| Authentification | JWT + refresh tokens + OTP |
| Stockage | Object Storage compatible S3 |
| Notifications | Firebase Cloud Messaging |
| Analytics | PostHog ou solution équivalente |
| IA | API LLM avec couche d'abstraction permettant de changer de fournisseur |

### 3. Écrans de THY Business

#### Écran 01 — Splash Screen

Logo THY Business. Animation très courte.

Vérification :
- session ;
- connexion ;
- version de l'application ;
- maintenance ;
- configuration distante.

Puis redirection automatique.

#### Écran 02 — Onboarding

3 à 4 pages maximum.

- Page 1 — Gérez votre commerce simplement
- Page 2 — Suivez vos ventes et votre stock
- Page 3 — Comprenez réellement vos bénéfices
- Page 4 — Votre assistant IA vous accompagne

Boutons : Commencer / Se connecter

#### Écran 03 — Création de compte

Champs : nom, téléphone, email facultatif, mot de passe.

Acceptation : ☐ Conditions d'utilisation, ☐ Politique de confidentialité

Puis : Créer mon compte

#### Écran 04 — Vérification OTP

"Un code a été envoyé au +224 XXX XXX XXX" — saisie à 6 chiffres.

Options : Renvoyer le code ; Modifier le numéro ; Vérification automatique lorsque possible.

#### Écran 05 — Création de l'entreprise

Informations : nom de l'entreprise, catégorie, adresse, ville, devise, logo, numéro de téléphone.

Catégories : commerce, restaurant, services, pharmacie, mode, électronique, alimentation, autre.

#### Écran 06 — Configuration initiale

Assistant de configuration :
1. Ajouter les premiers produits.
2. Définir les prix.
3. Définir le stock initial.
4. Ajouter les employés.
5. Configurer les moyens de paiement.

Progression : 80 % terminé

#### Écran 07 — Dashboard principal

L'écran le plus important.

"Bonjour, Tamba 👋" — Aujourd'hui : CA, Bénéfice, Dépenses, Commandes.

Puis : graphique des ventes des 7 derniers jours, produits populaires, alertes (🔴 ruptures prochaines, 🟠 crédits clients en retard).

#### Écran 08 — Caisse / POS

Interface ultra-rapide : recherche produit, catégories, panier (sous-total, réduction, total), bouton ENCAISSER.

#### Écran 09 — Paiement

Méthodes configurables : espèces, paiement mobile, carte, crédit, autre.

Le système doit gérer : succès, échec, expiration, annulation, paiement partiel, double paiement.

#### Écran 10 — Reçu

Afficher : logo, entreprise, numéro de reçu, date, produits, quantités, prix, total, moyen de paiement.

Actions : Partager, Télécharger, Imprimer, Nouvelle vente.

#### Écran 11 — Produits

Liste complète (produit, stock, prix). Actions : + Ajouter produit. Filtres : catégorie, stock faible, rupture, actif/inactif.

#### Écran 12 — Ajouter un produit

Champs : nom, photo, SKU, code-barres, catégorie, prix d'achat, prix de vente, stock, stock minimum, fournisseur, description.

Option : Scanner le code-barres.

#### Écran 13 — Détail produit

Afficher : photo, prix, stock, marge, ventes, bénéfices générés, historique, mouvements de stock. Graphique de performance du produit.

#### Écran 14 — Gestion du stock

Sections : Entrées (produits reçus), Sorties (produits vendus/perdus), Ajustements (correction manuelle), Inventaire (stock théorique vs stock réel).

#### Écran 15 — Achats

Créer un achat : fournisseur, produits, quantités, prix, date, facture, paiement.

Statuts : Brouillon → Commandé → Reçu → Payé

#### Écran 16 — Fournisseurs

Chaque fournisseur possède : nom, téléphone, adresse, historique, montant dû, achats, paiements.

#### Écran 17 — Clients

Profil client : nom, téléphone, achats, montant dépensé, crédit, dernière commande.

#### Écran 18 — Crédit / dettes clients

Très important pour le marché local. Exemple : dette 350 000 GNF, échéance 20 septembre. Actions : Enregistrer paiement, Envoyer rappel. Historique complet.

#### Écran 19 — Dépenses

Ajouter : catégorie, montant, description, date, justificatif.

Catégories : transport, loyer, salaire, électricité, internet, achat, maintenance, autre.

#### Écran 20 — Finance

Dashboard : CA, coût marchandises, dépenses, bénéfice estimé. Période : Aujourd'hui | Semaine | Mois | Année.

#### Écran 21 — Rapports

Rapports : ventes, bénéfices, dépenses, stock, produits, clients, employés. Export : PDF / Excel / CSV.

#### Écran 22 — Statistiques avancées

Indicateurs : chiffre d'affaires, panier moyen, marge, bénéfice, nombre de transactions, meilleur produit, meilleur jour, évolution. Comparaison : cette semaine vs semaine précédente.

#### Écran 23 — Employés

Créer un employé. Rôles : Administrateur (accès total), Manager (gestion opérationnelle), Caissier (ventes uniquement), Stock Manager (stock et achats). Les permissions doivent être configurables individuellement.

#### Écran 24 — Activité / Audit

Journal d'activité horodaté (ex. "Paul a modifié le prix de Produit A"). L'objectif est d'empêcher les manipulations invisibles.

#### Écran 25 — Notifications

Types : 🔴 Stock faible, 🟠 Crédit en retard, 🟢 Objectif atteint, 🔵 Rapport disponible, ⚠️ Activité inhabituelle.

#### Écran 26 — Assistant IA

Interface conversationnelle. Exemples : "Combien ai-je gagné cette semaine ?", "Quels produits dois-je commander ?", "Quel est mon produit le plus rentable ?", "Pourquoi mes bénéfices ont-ils diminué ?", "Fais-moi une publicité pour mon produit."

L'IA doit répondre à partir des données autorisées du compte, et non inventer des chiffres.

#### Écran 27 — IA Business Insights

Cartes automatiques : 💡 Recommandation, ⚠️ Alerte, 📈 Opportunité. Les recommandations doivent afficher leur source/calcul lorsque possible.

#### Écran 28 — Abonnement

Plans : FREE (fonctionnalités de base), PRO (gestion avancée), BUSINESS (fonctionnalités équipe), ENTERPRISE (fonctionnalités personnalisées).

Le système doit gérer : essai gratuit, renouvellement, expiration, changement de plan, annulation, paiement échoué.

#### Écran 29 — Paramètres

Sections : Entreprise, Compte, Employés, Paiements, Notifications, Sécurité, Abonnement, Sauvegarde, Confidentialité, Support.

#### Écran 30 — Sécurité

Fonctionnalités : changement de mot de passe, OTP, biométrie, appareils connectés, déconnexion de toutes les sessions, historique de connexion.

#### Écran 31 — Mode hors connexion

Fonctionnalité très importante : l'application doit pouvoir continuer à fonctionner lorsque la connexion Internet disparaît (vente enregistrée localement, synchronisation en attente puis automatique au retour de connexion). Il faut prévoir une vraie stratégie de résolution des conflits.

#### Écran 32 — Support

Options : FAQ, assistant IA, ticket support, contact, signaler un problème.

### 4. Design UI/UX premium

Style : Premium + moderne + professionnel + africain discret.

Éviter : interfaces surchargées, trop de couleurs, animations inutiles, tableaux illisibles.

Privilégier : espaces généreux, typographie moderne, cartes, graphiques simples, navigation intuitive, feedback visuel, dark mode, responsive design.

### 5. Navigation

Bottom navigation à 4 onglets : Accueil, Caisse, Stock, Plus. Le bouton Caisse doit être extrêmement accessible.

### 6. Base de données

Tables principales : `users`, `businesses`, `business_members`, `roles`, `permissions`, `products`, `categories`, `inventory`, `inventory_movements`, `sales`, `sale_items`, `payments`, `customers`, `customer_credits`, `credit_payments`, `suppliers`, `purchases`, `purchase_items`, `expenses`, `employees`, `notifications`, `subscriptions`, `invoices`, `audit_logs`, `ai_conversations`, `ai_messages`, `devices`, `sync_queue`.

### 7. Sécurité

Le projet doit intégrer dès le départ :
- validation côté serveur ;
- contrôle d'accès RBAC ;
- chiffrement des données sensibles ;
- tokens courts + refresh tokens ;
- rate limiting ;
- protection contre les injections ;
- validation des webhooks ;
- idempotence des paiements ;
- audit logs ;
- sauvegardes ;
- suppression sécurisée des données ;
- séparation stricte des entreprises.

Un utilisateur ne doit jamais pouvoir accéder aux données d'une autre entreprise.

### 8. Architecture commerciale

- **Gratuit** — pour attirer les utilisateurs.
- **Pro** — pour les commerçants actifs.
- **Business** — pour les entreprises avec plusieurs employés.

Revenus supplémentaires : commissions, services partenaires, fonctionnalités IA, publicité B2B éventuellement, API, intégrations.
