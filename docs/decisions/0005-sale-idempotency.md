# 0005 — Idempotence des ventes (`clientRequestId`)

## Contexte

Le cahier des charges exige que la caisse gère le « double paiement ». Sur un réseau mobile instable, une requête `POST /sales` peut aboutir côté serveur alors que la réponse se perd : le commerçant retape « Confirmer », et la vente (et la sortie de stock) serait enregistrée deux fois.

## Décision

- `POST /sales` accepte une clé optionnelle `clientRequestId` (8 à 64 caractères), générée par l'app (UUID v4) **une fois par écran de paiement**.
- `sales` porte une colonne `client_request_id` avec un index unique `(business_id, client_request_id)` (NULL autorisé plusieurs fois : les ventes sans clé ne sont pas concernées).
- Rejouer la même clé renvoie **la vente d'origine** (HTTP 201, même corps) sans toucher au stock ni aux crédits.
- Deux requêtes identiques simultanées : l'index unique n'en laisse passer qu'une ; la perdante échoue soit sur `client_request_id`, soit sur `sale_number` (même numéro calculé) — dans les deux cas le service relit et renvoie la vente gagnante.
- Le payload n'est pas comparé : rejouer une clé avec un contenu différent renvoie quand même la vente d'origine. C'est voulu (la clé identifie *une tentative de vente*), et l'app ne réutilise jamais une clé pour un panier modifié (nouvel écran de paiement = nouvelle clé).

## Conséquences

- Le même mécanisme servira de base à la synchronisation hors-ligne (file d'attente de ventes rejouables), hors périmètre de ce cycle.
- Les paiements mobile money réels devront aussi transmettre cette clé au prestataire.
- Vente 100 % à crédit : `payments` peut être vide si `customerId` est fourni ; sans client, le serveur répond 400.
