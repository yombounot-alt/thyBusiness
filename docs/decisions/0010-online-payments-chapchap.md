> **Statut : remplacé par [0011 — Paiements directs](0011-direct-payments.md).** L'intégration de Chap Chap Pay décrite ici a été **supprimée** (code, tables, configuration). Ce texte est conservé comme historique : il documente ce que la passerelle faisait réellement, au cas où une passerelle serait reconsidérée plus tard.

# 0010 — Paiement en ligne avec Chap Chap Pay

## Contexte

Le « paiement mobile » de la Caisse n'était qu'une case : le commerçant déclarait avoir reçu l'argent, rien ne le prouvait. [Chap Chap Pay](https://chapchappay.com/guide/) est une passerelle guinéenne qui unifie Orange Money, MTN MoMo, Kulu, Soutra Money, Akiba, PayCard et les cartes Visa/Mastercard : le client paie sur **sa** page, le commerçant n'a plus qu'à attendre la confirmation.

Deux difficultés d'intégration, qui ont orienté toute la conception :

- **Le guide public est inexact et incomplet.** Il documente `POST /api/ecommerce/operation`, qui répond 405 ; la route qui crée réellement un paiement est `POST /api/ecommerce/create`. La « Référence API » (signature des webhooks, contenu exact des notifications) est derrière une connexion. Tout ce qui suit a donc été **vérifié contre l'API réelle en mode test** (voir la fiche mémoire du dépôt de travail et les tests), pas déduit du guide.
- **Un webhook est une information non fiable** (n'importe qui peut envoyer une requête à une URL publique), et il peut se perdre, arriver en double ou dans le désordre.

## Décision

### 1. La vente n'existe qu'une fois l'argent confirmé

Démarrer un paiement (`POST /payments/mobile`) crée une **intention de paiement** (`payment_intents`) : le panier figé (produits, quantités, **prix vus par le client**, réduction, client) et la référence chez Chap Chap Pay. Rien n'est vendu, le stock ne bouge pas. Quand Chap Chap Pay confirme, le serveur enregistre la vente (paiement `mobile_money`, référence de transaction Chap Chap dans `providerReference`).

- **Le montant est calculé par le serveur** à partir du catalogue (même logique que `POST /sales`, factorisée dans `SalesService.quote`). Le client de l'API ne peut envoyer ni montant ni liste de paiements (400).
- La vente est enregistrée **aux prix montrés au client**, même si un prix est modifié pendant l'attente, et **sans jamais refuser** (stock devenu insuffisant, produit désactivé) : l'argent est déjà encaissé. Le stock peut alors passer sous zéro, à régulariser par un inventaire (même règle que pour une vente hors ligne, [ADR 0008](0008-offline-mode.md)).
- Total entier de GNF et **au moins 3 000 GNF** (minimum de Chap Chap Pay, vérifié) : refusé avec un message clair avant que le client soit sollicité.

### 2. Idempotence, sans compter sur le fournisseur

Chap Chap Pay **n'interdit pas** deux opérations avec le même `order_id` (il en crée une seconde). L'anti-doublon est donc à nous :

- une clé `clientRequestId` par panier (unique par commerce) : la redemander renvoie **le même paiement et le même lien** ;
- un `order_id` **unique par paiement** (`THY-` + 20 caractères aléatoires), jamais réutilisé ; tout est ensuite identifié par `operation_id` ;
- la vente créée reprend la même clé : la créer deux fois renvoie la première.

### 3. L'état vient toujours de Chap Chap Pay, jamais du webhook

Une confirmation est **une lecture directe** de l'état (`GET /ecommerce/order/<order_id>`) avec notre clé API, sur TLS. Le webhook n'est qu'un **déclencheur** : quoi qu'il affirme, le serveur relit l'état, puis exige que l'`operation_id` et le **montant** correspondent à ce qu'il a créé. Un faux webhook, même bien formé, ne peut donc pas marquer une vente payée ; au pire il déclenche une lecture (limitée à une toutes les 2 s par paiement, et seulement pour un paiement qui existe chez nous).

Trois chemins mènent à la même fonction (`PaymentsService.sync`), sûre à appeler n'importe où, en parallèle :

1. le **webhook** (`POST /webhooks/chapchap`, public, répond toujours 200 vite : Chap Chap Pay ne retente pas les 4xx/5xx) ;
2. la **lecture par l'app** (`GET /payments/mobile/:id`, toutes les 3 s) ;
3. le **rapprochement toutes les 30 s** côté serveur (filet si le webhook est perdu et l'app fermée).

Chaque transition est un *compare-and-set* sur le statut courant ; l'enregistrement de la vente est une seconde étape idempotente (statut `paid` sans `saleId` = « argent confirmé, vente à finir », reprise automatique). L'argent confirmé n'est donc jamais perdu, même si l'enregistrement de la vente échoue (ex. client supprimé entre-temps : `reviewReason = sale_not_recorded…`).

États (Chap Chap Pay → nous) : `success` → payé ; `new`/`pending`/**tout code inconnu** → en attente (jamais « payé ») ; `canceled` → annulé ; `expired` → expiré ; **`error`** (un essai échoué, observé) → reste en attente : le client peut réessayer sur le même lien. Après une annulation ou une expiration, le lien peut encore être payé : ce paiement **tardif est enregistré** et marqué `reviewReason = paid_after_canceled|paid_after_expired`.

### 4. Sécurité

- Clés uniquement en variables d'environnement (`CHAPCHAP_*`), validées au démarrage (64 hexadécimaux) ; jamais dans une réponse, un message d'erreur ou un journal ; `.env` est ignoré par git, `.env.example` ne contient que des valeurs vides. `PAYMENTS_DRIVER=mock` (défaut) ne parle à personne et est **refusé en production**.
- Appels sortants : délai de 10 s, **`redirect: 'error'`** (la clé voyage dans un en-tête personnalisé qu'une redirection transmettrait), réponses validées (champs obligatoires, montant numérique).
- Le **lien de paiement** vers lequel on envoie le client doit être en HTTPS **sur le domaine du fournisseur** (ou un sous-domaine, pas un domaine qui « ressemble ») : sinon refusé.
- Isolation multi-commerces : tout est filtré par `{ id, businessId }`, 404 (pas 403) pour le paiement d'un autre commerce.
- Le webhook est public : journal d'audit (`payment_webhook_events` : corps brut, en-têtes `ccp-*`, verdict de signature, issue), **jamais** d'en-tête ressemblant à un identifiant (`authorization`, cookies, clés). Limite de 16 Ko stockés.
- **Signature du webhook** : la référence de Chap Chap Pay n'étant pas publique, le schéma implémenté est une **hypothèse** (HMAC-SHA256 du corps brut, en hexadécimal, en-tête `CCP-HMAC-Signature`, clé = clé d'encryptage du compte). Elle est comparée en temps constant et son verdict (`valid`/`invalid`/`absent`/`unchecked`) est **enregistré avec chaque webhook** ; par défaut (`CHAPCHAP_WEBHOOK_SIGNATURE_MODE=advisory`) elle n'est pas bloquante, puisque l'état est de toute façon relu chez le fournisseur. Dès que de vrais webhooks ont confirmé le schéma dans le journal, passer en `enforce` (rejet 401). Il n'existe volontairement **aucune option « accepter sans signature »**.

### 5. Côté application

Nouveau moyen « Chap Chap Pay » dans l'écran de paiement (le total entier est payé en ligne : ni montant à saisir, ni monnaie, ni crédit). Puis un écran d'attente : QR code du lien, boutons partager/copier, état du client (« paie avec Orange Money… »), compte à rebours, lecture toutes les 3 s et **immédiatement au retour au premier plan**. Chaque issue est traitée : payé → reçu (panier vidé) ; essai échoué → bandeau, on continue d'attendre ; annulé/expiré → message, panier conservé, nouveau paiement avec une **nouvelle clé** ; connexion perdue → bandeau, on réessaie ; retour arrière → confirmation avant d'abandonner. La clé du paiement en ligne est **distincte** de celle d'une vente en espèces (un lien annulé qui serait payé plus tard ne doit jamais être rattaché à une vente en espèces). Les lectures `/payments` ne sont jamais mises en cache hors ligne : un état de paiement doit être vivant.

## Limites assumées

- **Un seul compte Chap Chap Pay** (clés dans l'environnement du serveur) : tous les paiements arrivent sur le compte propriétaire de ces clés. C'est correct pour développer et démontrer ; pour de vrais commerçants il faudra soit **des clés par commerce** (chacun connecte son compte, clés chiffrées en base, l'argent va directement chez lui — recommandé), soit un reversement (API PUSH/Payout) avec ses obligations. À décider avant la production.
- **Pas de remboursement.** Annuler une vente payée en ligne remet le stock mais ne rend pas l'argent au client : le remboursement se fait depuis Chap Chap Pay.
- Paiement **partiel** (une part en ligne, le reste en crédit ou espèces) non géré : le total entier est payé en ligne.
- Pas encore d'écran listant les paiements « à vérifier » (`reviewReason`) : ils sont visibles via l'API.
- Si l'app est fermée pendant l'attente, le serveur enregistre quand même la vente à la confirmation, mais le panier affiché dans l'app est perdu.

## Ce qui est vérifié, et ce qui ne l'est pas

Vérifié : tests unitaires et de bout en bout (fournisseur simulé) sur tout ce qui précède ; adaptateur testé avec de vraies réponses relevées sur l'API ; et un **paiement réel en mode test de Chap Chap Pay** de bout en bout (création, page de paiement, « Succès » / « Échec » / « Annuler » simulés sur la vraie page, lecture, vente enregistrée avec la référence Chap Chap, stock décrémenté).

**Non vérifié** : la réception d'un **vrai webhook** (il faut une adresse HTTPS publique) — donc le schéma de signature reste une hypothèse et `callback_url` n'est pas confirmé ; la saisie d'un numéro Orange Money / MTN MoMo (non testée : le mode test peut encore solliciter l'opérateur, on ne l'a pas fait avec le numéro d'un tiers) ; le statut `expired` renvoyé par Chap Chap Pay (documenté, jamais observé) ; les **clés de production** (compte validé KYC).

## Mise en production

`PAYMENTS_DRIVER=chapchap`, clés de production dans l'environnement du serveur (jamais dans le dépôt), `PUBLIC_API_URL` en HTTPS et le même chemin `/webhooks/chapchap` déclaré dans le tableau de bord Chap Chap Pay ; lire quelques lignes de `payment_webhook_events` pour confirmer la signature puis passer en `enforce` ; sauvegarder la base ; décider du modèle de compte (clés par commerce).
