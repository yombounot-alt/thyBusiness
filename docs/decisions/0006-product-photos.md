# 0006 — Photos des produits

## Contexte

Un commerçant reconnaît ses produits à l'image plus vite qu'au nom, surtout à la caisse. Le schéma avait une colonne `image_url` que le client pouvait remplir avec n'importe quelle chaîne — jamais utilisée, et une URL fournie par le client n'est pas une donnée de confiance (lien externe, tracking, contenu qui disparaît).

## Décision

- **Le serveur est propriétaire du fichier.** `image_url` devient `image_key` : une clé de stockage générée côté serveur (`{businessId}/products/{productId}/{uuid}.{ext}`), jamais saisie par le client. `imageUrl` n'est plus accepté par `POST/PATCH /products` (400).
- **Port de stockage remplaçable** (`StoragePort`, comme l'OTP) : `put / get / delete` sur des clés opaques. Seul le pilote `local` (disque, `STORAGE_LOCAL_PATH`) existe pour ce cycle ; un pilote S3/MinIO remplacera l'adaptateur sans toucher au code métier.
- **Trois routes, toutes protégées par le JWT et filtrées par entreprise** (404 — pas 403 — pour le produit d'une autre entreprise) :
  - `PUT /products/:id/image` (multipart, champ `file`) remplace la photo et supprime l'ancien fichier ;
  - `GET /products/:id/image` sert les octets ;
  - `DELETE /products/:id/image` retire la photo.
- **Le type est déduit des octets**, jamais du nom de fichier ni du `Content-Type` envoyé : JPEG, PNG ou WebP uniquement (un `.png` contenant du HTML est refusé). 2 Mo maximum (413 au-delà). La réponse porte `Content-Type` exact et `X-Content-Type-Options: nosniff`.
- **Les photos ne sont pas publiques** : l'app les lit par l'API authentifiée (client `dio`, donc avec le refresh de session), pas par une URL ouverte. La clé change à chaque envoi, ce qui sert de clé de cache côté app (`Cache-Control: private, max-age=86400`).
- **Côté app**, la photo est réduite à 1024 px / qualité 80 avant l'envoi (`image_picker`), envoyée *après* l'enregistrement du produit ; si l'envoi échoue, le produit reste enregistré et l'utilisateur est prévenu (il ne refait pas le formulaire).

## Limites assumées

- Le serveur ne décode pas l'image (pas de bibliothèque de traitement d'image) : il vérifie la signature du format, pas que le fichier est un JPEG/PNG/WebP valide de bout en bout. Un fichier corrompu s'affiche en icône « image cassée » côté app.
- Pas de miniatures serveur : l'app réduit avant l'envoi, ce qui suffit pour un catalogue de commerce de quartier.
- Un produit désactivé garde sa photo ; il n'existe pas de suppression définitive de produit.

## Conséquences

- Une future synchronisation hors-ligne devra envoyer les photos séparément des ventes (elles ne sont pas dans les payloads de vente).
- Passage en production : brancher un pilote objet (S3/MinIO) et sauvegarder le stockage avec la base — la table ne contient que des clés.
