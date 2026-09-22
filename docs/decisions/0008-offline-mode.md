# 0008 — Mode hors ligne (caisse qui continue sans réseau)

## Contexte

Pour un commerce de quartier, le réseau mobile coupe. Une caisse qui s'arrête à ce moment-là perd des ventes, et une app qui se déconnecte quand elle ne trouve pas le serveur est inutilisable : se reconnecter demande… du réseau. Le périmètre de ce cycle est volontairement limité à ce qui compte le plus : **encaisser sans réseau, sans jamais perdre une vente**, et rester utilisable (lecture) hors ligne.

## Décisions

### 1. Ne jamais confondre « pas de réseau » et « session terminée »

- Au démarrage, si le profil ne peut pas être lu (réseau absent, serveur en panne), les jetons sont **conservés** : l'écran de démarrage propose « Réessayer » (et « Se déconnecter »). Seul un refus explicite du serveur (401/403) met fin à la session.
- Le renouvellement de session (`/auth/refresh`) ne détruit les jetons que si le serveur **refuse** le jeton de rafraîchissement ; une absence de réponse ou un 5xx les garde.
- Correction de fond découverte au passage : `/auth/me` était exclue du renouvellement automatique (toutes les routes `/auth/*` l'étaient). Rouvrir l'app plus de 15 minutes après la dernière utilisation déconnectait donc l'utilisateur. Seules les routes réellement publiques (login, signup, OTP, refresh, logout) sont exclues.

### 2. Lecture hors ligne : un cache des dernières réponses, au niveau du client HTTP

- Chaque lecture (`GET`) réussie est mémorisée (profil, catalogue, clients, tableau de bord, historique…) ; quand le serveur est **injoignable**, la dernière réponse connue est servie (`extra['fromCache']`). Une vraie erreur HTTP (400, 500…) n'est **jamais** masquée par le cache.
- Aucun changement dans les écrans : le cache est un intercepteur `dio`. Le catalogue complet mis en cache répond aussi aux **recherches** (nom, SKU, code-barres — donc la douchette), aux filtres par catégorie et au stock faible, calculés localement.
- Cloisonnement : les entrées sont rattachées à `utilisateur:entreprise` et **effacées à la déconnexion** ; une entrée d'un compte n'est jamais servie à un autre. Cache borné (80 entrées, les plus anciennes sont éliminées). Les photos (binaires) et les écritures ne sont jamais mises en cache.
- Après la connexion, l'app lit discrètement les données de référence de la caisse (fiche du commerce, catalogue, clients) pour que le mode hors ligne marche dès le premier jour, sans dépendre des écrans visités.
- Stockage : `LocalStore` (SharedPreferences / localStorage) derrière une interface, remplaçable par SQLite plus tard.

### 3. Encaisser sans réseau : la file d'attente des ventes

- L'encaissement essaie le serveur ; **seule** une absence de réponse met la vente en file d'attente (une réponse du serveur — refus, erreur — est montrée à la caissière comme avant). La vente est écrite sur le téléphone **avant** de rendre la main, avec sa clé d'idempotence (`clientRequestId`, [ADR 0005](0005-sale-idempotency.md)) : l'envoyer deux fois ne vend jamais deux fois, même si le serveur l'avait déjà enregistrée sans que la réponse arrive.
- **Reçu provisoire** immédiat (partage texte et PDF possibles), numéro `HL-xxxxxx` provisoire ; le vrai numéro (VTE-…) est attribué à l'envoi et le reçu ouvert bascule alors sur le vrai.
- **Le stock affiché est net des ventes en attente**, pour ne pas vendre deux fois la dernière unité hors ligne.
- **Envoi** dans l'ordre : dès qu'une requête aboutit à nouveau, toutes les 30 s tant que quelque chose attend ou que l'app se croit hors ligne, au retour au premier plan et après la connexion. Un refus définitif (4xx : produit inconnu, client supprimé…) passe la vente en **« à vérifier »** avec la raison, sans bloquer les suivantes ; une panne temporaire (réseau, 5xx, 401, 429) la laisse en attente. Rien n'est jamais supprimé sans action explicite (Réessayer / Supprimer, avec confirmation).
- La file survit au redémarrage de l'app et à la déconnexion (elle appartient à l'utilisateur ; un avertissement s'affiche à la déconnexion).
- Un bandeau au-dessus des onglets dit ce qui se passe : hors ligne, N ventes à envoyer, envoi en cours, N ventes à vérifier.

### 4. Côté serveur : une vente hors ligne a déjà eu lieu

`POST /sales` accepte deux champs facultatifs :

- `soldAt` : la vraie date de la vente (conservée sur la vente **et** sur son mouvement de stock, donc le tableau de bord la range dans la bonne journée). Une date future (horloge du téléphone en avance) est ramenée à maintenant ; au-delà de 60 jours dans le passé, la vente est refusée ;
- `offline: true` : les marchandises sont déjà parties, donc la vente est enregistrée **même si le stock du serveur est devenu insuffisant** (le stock passe alors sous zéro, signal à régulariser par un inventaire) ou si le produit a été désactivé entre-temps. Toutes les autres règles (isolation entre entreprises, client existant, paiement couvrant le total ou client pour le crédit) restent appliquées.

## Limites assumées

- **Seules les ventes sont possibles hors ligne.** Créer un client, une dépense, un mouvement de stock, encaisser une dette, annuler une vente déjà envoyée demandent du réseau (message clair). Chacune pourra rejoindre la même file plus tard.
- Le tableau de bord et l'historique hors ligne montrent les dernières données connues, sans les ventes en attente (l'historique le signale).
- Un produit ou un prix modifié pendant que le téléphone était hors ligne n'est pas connu : le prix appliqué est celui du serveur **à l'envoi** (le reçu remis au client porte le prix vu hors ligne).
- Pas de synchronisation dans l'autre sens (plusieurs téléphones qui modifient les mêmes données hors ligne) : hors périmètre.
- Les photos de produits ne sont pas conservées hors ligne (la lettre initiale s'affiche).
