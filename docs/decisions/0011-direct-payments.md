# 0011 — Paiements directs : Orange Money, Mobile Money, code marchand

## Contexte

L'intégration de la passerelle Chap Chap Pay ([ADR 0010](0010-online-payments-chapchap.md)) est **supprimée**. Elle faisait arriver l'argent sur le compte propriétaire des clés de la passerelle — pas sur celui du commerçant — et dépendait d'une API externe dont la documentation était incomplète (signature des webhooks non publique), pour un bénéfice faible : un petit commerçant guinéen se fait payer sur **son** numéro Orange Money ou **son** code marchand.

Le besoin est donc plus simple : le client envoie l'argent directement au propriétaire, dit qu'il l'a fait, et **le propriétaire vérifie** que l'argent est bien arrivé avant que la vente soit enregistrée. Aucune API de paiement n'est utilisée ni simulée.

## Correspondance avec THY Business

La demande parle de clients, de commandes et d'abonnements ; THY est un outil de caisse pour le commerçant. La transposition :

| Demande | Dans THY Business |
|---|---|
| Propriétaire / administrateur | Le commerçant (rôle `owner`), qui règle ses moyens dans **Plus → Moyens de paiement** |
| Client | Celui qui paie à la Caisse. Il n'a pas de compte : sa déclaration se remplit sur le téléphone du commerçant |
| Commande non payée (`payment_status = pending`) | Un paiement en attente (`pending` / `submitted`) : il n'y a **pas de vente** tant qu'il n'est pas validé, et rien n'est jamais supprimé automatiquement |
| Mes paiements (côté client) | La liste **Paiements** du commerçant (pas de compte client) |
| Notification au propriétaire | Une bannière « N paiements à vérifier » et un badge sur « Plus », rafraîchis toutes les 60 s (pas de notification push : elle est hors périmètre) |
| Notification au client | Un message prêt à envoyer (WhatsApp, SMS…) : « Votre paiement de … a été confirmé » / « … n'a pas pu être confirmé. Motif : … » |
| Abonnements | N'existent pas encore dans THY ([ADR 0004](0004-out-of-scope-tables.md)) ; le paiement porte un panier figé et pourra financer autre chose plus tard |

## Décision

### 1. Suppression de l'ancien système
Retirés : le module `payments` du serveur (fournisseur, webhook, rapprochement), ses tables `payment_intents` et `payment_webhook_events` (6 lignes de test), la configuration et les variables `CHAPCHAP_*` / `PAYMENTS_*` / `PUBLIC_API_URL`, l'option `rawBody`, les écrans et le paquet `qr_flutter` de l'app, et leurs tests. **Conservés** car génériques et réutilisés : `SalesService.quote` (montant calculé par le serveur) et les prix figés à l'enregistrement de la vente.

### 2. Données
- **`payment_methods`** — par commerce : type (`orange_money`, `mobile_money`, `merchant_code`, `other`), nom affiché, titulaire, numéro, code marchand, instructions, code USSD, logo, actif. **Plusieurs comptes d'un même opérateur** sont permis ; `isActive` dit lesquels sont proposés.
- **`manual_payments`** (le nom `payments` est déjà pris par les lignes d'encaissement d'une vente) — le panier figé aux prix montrés au client, **ce que le client a vu** (titulaire, numéro, code : copiés au démarrage, car le propriétaire peut modifier son moyen ensuite), la déclaration du payeur, la preuve, l'issue (qui a validé ou refusé, quand, pourquoi).
- Statuts : `pending` (le client sait où payer) → `submitted` (il a déclaré) → `verified` | `rejected`, ou `cancelled`.

### 3. Règles
- **Rien n'est validé automatiquement** : « J'ai effectué le paiement » ne fait que passer à `submitted`. Seul le propriétaire valide ; la vente est alors enregistrée (paiement `mobile_money`, référence de transaction conservée), **au prix montré au client** et sans jamais être refusée pour un stock devenu insuffisant (l'argent est reçu). Validation idempotente : la refaire ne crée pas de seconde vente, et si l'enregistrement de la vente échoue le paiement reste validé (« terminer l'enregistrement »).
- **Montant** : calculé par le serveur, jamais envoyé par le client, total entier de GNF, et la déclaration doit envoyer **exactement** ce montant.
- **Référence de transaction** : obligatoire (4 à 64 caractères), et **utilisable une seule fois** par opérateur et par commerce tant que le paiement qui la porte est déclaré ou validé, quelle que soit l'écriture (« TX-12 34 », « tx1234 »). Garantie **par la base** (index unique partiel, écrit à la main dans la migration) et pas seulement par le code : trois déclarations simultanées de la même référence donnent une réussite et deux refus. Un paiement refusé ou annulé libère sa référence (le client s'est peut-être trompé).
- **Double clic / rafraîchissement** : redemander le même paiement (même clé) renvoie le même ; redéclarer à l'identique ne change rien, autrement c'est un conflit. Un paiement **refusé** peut être re-déclaré avec des informations corrigées.
- **Permissions** : le propriétaire seul règle les moyens de paiement, valide, refuse, et annule un paiement déjà déclaré. Toute l'équipe peut démarrer et déclarer un paiement, et voir les moyens actifs (`OwnerGuard`). Un commerce ne voit jamais les données d'un autre (404, pas 403).

### 4. Sécurité
Authentification partout ; validation serveur stricte (champs inconnus refusés) ; textes nettoyés (caractères de contrôle, espaces) ; numéro, code marchand et code USSD validés. **USSD** : il dépend de l'opérateur et du pays, donc c'est le propriétaire qui le définit (chiffres, `*`, `#`, `+` et `{numero}` `{montant}` `{code}`) ; l'app ne compose rien qui soit incomplet, et `{code}` ne fonctionne que pour un code numérique. **Fichiers** (logo 1 Mo, preuve 3 Mo) : le format (JPEG/PNG/WebP) est lu **dans les octets**, jamais dans le nom ou le type annoncé ; la clé de stockage est générée par le serveur ; `nosniff`, et pas de cache pour les preuves. Une preuve n'est qu'une aide : elle ne valide rien. **Aucun numéro, code ou nom n'est écrit dans le code** : sans réglage, aucun moyen n'est proposé.

### 5. Côté application
- **Plus → Moyens de paiement** (propriétaire) : liste avec interrupteur actif/inactif, formulaire (type, nom, titulaire, numéro ou code, USSD, instructions, logo).
- **Caisse → Paiement mobile → Choisir le moyen de paiement** : cartes des moyens actifs ; après le choix, titulaire, numéro ou code avec **Copier** (« Numéro copié »), montant exact avec **Copier**, instructions numérotées adaptées au moyen, **Payer maintenant** (si un USSD est configuré), **J'ai effectué le paiement**.
- **Formulaire de déclaration** : téléphone utilisé, référence, montant envoyé (prérempli), nom du payeur, date et heure, preuve facultative. Envoyé → « Paiement envoyé – En attente de vérification » ; le panier de la Caisse est libéré pour le client suivant.
- **Paiements** : liste filtrable avec badges 🟠 En attente · 🔵 Vérification en cours · 🟢 Payé · 🔴 Refusé (· ⚪ Annulé) ; détail avec la déclaration, la preuve, et **Valider** (avec un rappel de vérifier le SMS ou le relevé) / **Refuser** (motifs proposés) / **Annuler**.

### 6. Prêt pour une API officielle
Le point d'entrée d'une vérification automatique est déjà `verify` : un fournisseur officiel (Orange Money, MTN…) n'aurait qu'à déclencher la même validation, sans toucher aux écrans ni aux données.

## Limites assumées
- **La vérification est humaine** : le propriétaire regarde son SMS ou son relevé. Ni l'app ni le serveur ne peuvent savoir si l'argent est arrivé.
- Pas de notification push : la bannière et le badge se rafraîchissent toutes les 60 s quand l'app est ouverte.
- Pas de comptes clients, donc pas de « Mes paiements » côté client.
- Le **remboursement d'une dette** par un client reste un enregistrement manuel (flux séparé, inchangé).
- Annuler une vente payée par ce moyen remet le stock mais ne rend pas l'argent au client : cela se fait hors de l'app.
- « Payer maintenant » ouvre le composeur avec le code du propriétaire ; l'utilisateur confirme lui-même l'appel (l'app ne compose pas seule).
- Le logo de l'opérateur n'est pas fourni (marque déposée) : chaque type a une icône générique, le propriétaire peut envoyer le sien.
