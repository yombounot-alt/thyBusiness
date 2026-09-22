# 0009 — Scan de code-barres par la caméra

## Contexte

La caisse gérait déjà la **douchette matérielle** (un lecteur USB/Bluetooth qui « tape » le code puis Entrée). Un petit commerçant a rarement une douchette, mais toujours un téléphone : la caméra doit pouvoir faire le même travail, à la caisse (ajouter des articles au panier) et à la fiche produit (remplir le champ code-barres au lieu de le taper).

## Décision

- **Le plugin `mobile_scanner`** (ML Kit embarqué sur Android, Vision sur iOS) : la lecture se fait sur le téléphone, sans réseau — elle marche donc aussi en mode hors ligne ([ADR 0008](0008-offline-mode.md)), puisque le catalogue en cache répond à la recherche par code.
- **Deux modes, un seul écran** (`BarcodeScanScreen`) :
  - *continu* (Caisse) : la caméra reste ouverte, chaque code lu ajoute l'article au panier et l'écran dit ce qui s'est passé (« Eau minérale ajouté · 2 dans le panier », « Aucun produit avec le code … », « Stock insuffisant … ») avec un retour haptique différent pour un succès et un problème ; un bouton **Terminer** ferme le scanner ;
  - *unique* (fiche produit) : se ferme dès le premier code et le met dans le champ.
- **L'écran ne sait pas ce qu'un code signifie** : il lit, filtre les doublons, affiche la réponse du appelant (`ScanHandler`). Un même code n'est pas relu avant 1,2 s (`ScanDebouncer`), sinon une caméra qui « voit » l'étiquette 15 fois par seconde ajouterait 15 articles.
- **Correspondance exacte seulement** (code-barres ou SKU, un seul produit) : un scan n'ajoute jamais un produit qui *ressemble* au code, comme pour la douchette.
- **Formats** : EAN-13/8, UPC-A/E, Code 128/39/93, ITF-14 et QR (pour les commerces qui impriment leurs propres étiquettes).
- **La caméra est derrière un fournisseur** (`barcodeScannerProvider`) : les tests injectent un faux scanner qui « lit » des codes, sans caméra. Sur le web (l'aperçu de bureau) le bouton caméra n'est pas proposé (`cameraScanningAvailableProvider`) ; la douchette clavier reste disponible partout.
- **Permission refusée / caméra indisponible** : un message clair (où réactiver l'autorisation) et un bouton Réessayer, jamais un écran noir. Le scanner s'ouvre sur le navigateur racine pour couvrir la barre d'onglets.
- **`uses-feature camera required=false`** : l'app reste installable sur un téléphone sans caméra arrière (la douchette et la saisie fonctionnent).

## Les codes de démo doivent être de vrais EAN-13

Les premiers produits de démo avaient des codes de la forme `6001234000011…66` dont le **chiffre de contrôle était faux**. Une douchette qui tape n'y voit rien, mais une caméra applique la règle EAN-13 et **refuse** un tel code — le scan de démo n'aurait jamais marché. Le seed calcule maintenant le chiffre de contrôle (`ean13()`), donne `6001234000013`, `…020`, `…037`, `…044`, `…051`, `…068`, et corrige les produits de démo déjà en base.

## Ce qui est vérifié, et ce qui ne l'est pas

- Tests unitaires/widgets (sans caméra) : ajout au panier (même article deux fois, SKU accepté comme un code-barres), code inconnu, stock insuffisant, code partiel refusé, bouton caméra absent sur le web, remplissage du champ de la fiche produit et enregistrement, anti-doublon du scanner ; et validité EAN-13 des codes de démo.
- **Test sur appareil** (`integration_test/barcode_decode_test.dart`, à lancer sur un émulateur ou un téléphone) : il dessine chaque code-barres de démo et le fait lire par le vrai décodeur ML Kit ; les six sont lus, et un code au chiffre de contrôle faux ne l'est pas.
- Sur émulateur : demande de permission, refus et récupération, aperçu caméra en marche avec le décodeur actif, scanner qui recouvre la barre d'onglets et « Terminer » qui ramène à la Caisse. Ce contrôle visuel a fait corriger un défaut : le titre et les boutons blancs disparaissaient sur une scène claire (étiquette, mur blanc) — le haut de l'image est maintenant assombri, et un indicateur d'attente s'affiche pendant que la caméra démarre.
- **Non vérifié** : la lecture d'une *vraie* étiquette devant l'objectif d'un vrai téléphone (l'émulateur n'a pas de caméra utilisable pour cela) — la qualité de lecture en lumière faible, sur du plastique brillant ou un code abîmé dépend du téléphone. À essayer sur un appareil réel ; iOS n'a pas non plus été essayé.

## Limites assumées

- Pas de saisie de la quantité au scan : chaque lecture ajoute 1 unité (on scanne deux fois pour deux articles, ou on ajuste la quantité dans le panier).
- Pas de création de produit « à la volée » quand un code est inconnu : le message le dit, on l'ajoute ensuite depuis Stock (le scanner de la fiche produit remplit alors le code).
