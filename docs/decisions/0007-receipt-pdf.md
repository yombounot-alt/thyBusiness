# 0007 — Reçus en PDF

## Contexte

Le reçu se partageait en texte brut (WhatsApp, SMS). Un client ou un fournisseur attend souvent un document : un fichier propre, imprimable, qui se conserve et se transfère tel quel.

## Décision

- **Le PDF est généré dans l'app**, pas par le serveur : le reçu est déjà entièrement connu du téléphone (vente + fiche de l'entreprise), la génération est instantanée, ne coûte rien côté serveur et fonctionnera hors-ligne le jour où la synchronisation existera. Bibliothèque : `pdf` (Dart pur, donc aussi valable sur le web).
- **Bouton « Reçu en PDF »** dans la barre du reçu (juste avant le menu « Annuler la vente »), disponible aussi pour une vente annulée — le PDF porte alors le bandeau « VENTE ANNULÉE » et n'affiche plus de « Reste à payer ».
- **Format A5 portrait**, plusieurs pages si la vente est longue (pagination automatique, « Page x/y » en pied de page). Contenu : en-tête (nom, adresse, téléphone), numéro, date, client, tableau des articles (quantité, prix unitaire, total), sous-total, réduction, TOTAL, paiements, monnaie rendue (juste après l'encaissement), reste à payer.
- **La police est embarquée** (Roboto Regular/Bold, licence Apache 2.0, `assets/fonts/`) : les polices de base d'un PDF ne savent pas tout dessiner (accents, espace fine insécable des montants). L'espace fine insécable (U+202F) produite par `intl` est remplacée par une espace insécable ordinaire, présente dans la police et qui empêche « 13 500 GNF » de se couper en fin de ligne.
- **Envoi via la feuille de partage du système** (`share_plus`, derrière `fileSharerProvider` comme `textSharerProvider`) : WhatsApp, e-mail, « enregistrer dans Fichiers »… Nom du fichier : `recu-VTE-0001.pdf`. Dans un navigateur sans partage de fichiers, le fichier est simplement téléchargé.

## Limites assumées

- Pas de logo de l'entreprise (il n'y a pas encore de logo dans le modèle de données).
- L'en-tête du tableau n'est pas répété sur les pages suivantes d'un très long reçu.
- Pas d'impression directe ni de ticket thermique (ESC/POS) : à traiter avec un vrai matériel. En attendant, on imprime depuis le PDF.
- Une facture formelle (numérotation fiscale, mentions légales, TVA) reste hors périmètre : ceci est un **reçu de vente**.
- Tests : la structure (PDF valide, pages, police embarquée, aucun caractère manquant) est vérifiée automatiquement ; la mise en page a été contrôlée en rendant les fichiers produits par un vrai navigateur avec pdf.js.
