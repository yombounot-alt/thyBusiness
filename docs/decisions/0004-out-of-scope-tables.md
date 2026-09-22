# 0004 — Tables et fonctionnalités différées après le MVP

Le cahier des charges complet de THY Business décrit ~25 tables et 32 écrans. Le cycle MVP "commerçant solo" n'en implémente qu'un sous-ensemble.

## Tables NON créées dans les migrations du MVP

`suppliers`, `purchases`, `purchase_items`, `employees`, `roles`, `permissions`, `notifications`, `subscriptions`, `invoices`, `audit_logs`, `ai_conversations`, `ai_messages`, `devices`, `sync_queue`.

Elles ne sont pas créées comme des tables vides prématurées — elles seront conçues au moment où la fonctionnalité correspondante sera réellement construite.

## Tables ajoutées par rapport au cahier des charges original

`refresh_tokens` et `otp_verifications` — nécessaires pour implémenter le flux d'authentification (rotation des tokens, vérification OTP), non listées explicitement dans le dossier initial.

## Fonctionnalités explicitement hors périmètre pour ce cycle

- Assistant IA réel (interface conversationnelle, insights automatiques)
- Paiement mobile réel (intégration d'un vrai fournisseur guinéen) — **remplacé par les paiements directs** vérifiés par le propriétaire : voir [0011](0011-direct-payments.md) (la passerelle Chap Chap Pay de [0010](0010-online-payments-chapchap.md) a été essayée puis supprimée ; une API officielle Orange Money / MTN reste à faire)
- Abonnements / facturation (plans FREE/PRO/BUSINESS/ENTERPRISE)
- RBAC multi-employés (rôles Manager/Caissier/Stock Manager avec permissions fines)
- Synchronisation hors-ligne **complète** avec résolution de conflits (l'encaissement sans réseau et la lecture hors ligne sont faits : voir [0008](0008-offline-mode.md) ; restent les autres écritures hors ligne et le multi-appareils)
- Factures PDF formelles / export Excel-CSV (les **reçus** PDF, eux, sont faits : voir [0007](0007-receipt-pdf.md))
- Statistiques avancées et comparaisons de périodes
- Notifications push (Firebase Cloud Messaging)
- Fournisseurs et achats (workflow brouillon → commandé → reçu → payé)
- Audit log (interface de consultation)

Ces éléments restent dans le cahier des charges complet et seront repris dans un cycle ultérieur.
