# THY Business

Application SaaS mobile de gestion commerciale pour petits commerçants africains/francophones (caisse, ventes, produits, stock, clients, crédits, dépenses).

Ce dépôt implémente le **MVP "commerçant solo"** — un sous-ensemble du cahier des charges complet (voir [`docs/cahier-des-charges.md`](docs/cahier-des-charges.md)). Le périmètre et les décisions d'architecture de ce cycle sont documentés dans [`docs/decisions/`](docs/decisions/).

## État d'avancement

Le MVP « commerçant solo » du plan (étapes 0 à 9) est **fonctionnellement complet** — backend et app Flutter :

| Zone | Ce qui est en place |
|---|---|
| Compte | Inscription, OTP (simulé), connexion, refresh de session (l'utilisateur n'est jamais déconnecté parce que le réseau manque), création de l'entreprise |
| **Hors ligne** | La caisse **continue sans réseau** ([ADR 0008](docs/decisions/0008-offline-mode.md)) : catalogue, clients et tableau de bord lisibles depuis le cache ; une vente encaissée sans réseau est gardée sur le téléphone avec un reçu provisoire (partageable, PDF), le stock affiché en tient compte, et elle part automatiquement — avec sa vraie date — dès que le serveur répond. Bandeau d'état, écran « Ventes en attente », jamais de doublon (idempotence) ni de vente perdue |
| **Paiements directs** | Le client paie **directement le propriétaire** par **Orange Money, Mobile Money ou code marchand** ([ADR 0011](docs/decisions/0011-direct-payments.md)) : le propriétaire renseigne ses numéros et codes dans *Plus → Moyens de paiement* (rien n'est écrit en dur, plusieurs comptes par opérateur possibles) ; à la Caisse, le client voit le numéro ou le code à copier, le montant exact et les étapes, puis « J'ai effectué le paiement » (référence de transaction, preuve facultative). **Rien n'est validé automatiquement** : le paiement attend que le propriétaire vérifie l'argent reçu et le valide (la vente est alors enregistrée) ou le refuse avec un motif. Une référence de transaction ne sert qu'une fois (garanti par la base), le montant est calculé par le serveur, badges 🟠🔵🟢🔴 et bannière « à vérifier » |
| Accueil | CA, bénéfice estimé, dépenses, commandes (aujourd'hui / semaine / mois / année), graphique 7 jours, produits populaires, alertes (stock faible, crédits en retard) |
| Caisse | Recherche, **scan par la caméra** (le scanner reste ouvert, chaque article lu tombe dans le panier avec un retour à l'écran et au toucher — [ADR 0009](docs/decisions/0009-camera-barcode-scanning.md) ; aussi à la fiche produit pour remplir le code) ou **douchette code-barres** (lecteur USB/Bluetooth : code + Entrée = ajout direct au panier), panier avec plafond de stock, réduction, paiement (espèces / mobile / carte / crédit), monnaie à rendre, reçu partageable en texte ou **en PDF** ([ADR 0007](docs/decisions/0007-receipt-pdf.md)), annulation de vente, historique, idempotence anti-double-paiement |
| Stock | Produits et catégories, **photos** (caméra ou galerie, affichées en Stock, Caisse et fiche produit — [ADR 0006](docs/decisions/0006-product-photos.md)), entrées / sorties / inventaire avec calcul d'écart, historique des mouvements, alertes de stock faible |
| Clients | Fiche, dettes, remboursements (FIFO), relevé de compte, rappel de dette partageable, vue « Créances » |
| Dépenses | Saisie par catégorie, filtre par période avec total |

Volontairement hors périmètre pour ce cycle (voir [`docs/decisions/0004`](docs/decisions/0004-out-of-scope-tables.md)) : assistant IA, abonnements, employés/RBAC, mode hors-ligne **complet** (seules les ventes s'encaissent hors ligne ; clients, dépenses, mouvements de stock demandent encore du réseau), factures formelles / export Excel (les reçus PDF sont faits), notifications push, fournisseurs/achats. Pas encore fait non plus : statistiques par produit. Les photos sont validées dans le navigateur **et sur émulateur Android** (prise de photo avec la caméra, envoi, affichage). Le scan par caméra est validé sur émulateur (permission, refus, aperçu, et lecture des six codes-barres de démo par le vrai décodeur ML Kit) mais **pas encore devant un vrai code-barres avec un vrai téléphone** ; iOS n'est pas essayé. Les codes de démo sont de vrais EAN-13 (`6001234000013` … `6001234000068`) : une caméra refuse un chiffre de contrôle faux.

Les paiements directs sont vérifiés à la main par le propriétaire, **sans API de paiement** (ni simulée) : une API officielle Orange Money / MTN pourra déclencher plus tard la même validation. Ils sont validés sur émulateur Android (voir l'ADR 0011). **Pas encore** : les notifications push (bannière et badge rafraîchis toutes les 60 s à la place), les comptes clients, et un essai sur un vrai téléphone.

Vérifications : @@COUNTS@@ (voir plus bas). L'app est aussi rejouée de bout en bout dans un navigateur piloté par script (connexion, vente comptant et à crédit, annulation, ajustements de stock, scan, photos, export PDF — les PDF produits sont rendus en image pour contrôle visuel) et **sur émulateur Android** : caisse, reçu PDF et feuille de partage, photo prise avec la caméra, et le mode hors ligne avec un vrai réseau coupé puis rétabli.

## Structure du dépôt

```
apps/
  api/       Backend NestJS + Prisma + PostgreSQL
  mobile/    App Flutter
docs/
  decisions/ ADRs (choix techniques de ce cycle)
```

## Prérequis

- Node.js 20+ et npm
- Docker Desktop (Postgres + Redis en local)
- Pour la partie mobile : [Flutter SDK](https://docs.flutter.dev/get-started/install) + Android Studio ou Xcode (non requis pour développer/tester le backend)

## Démarrage rapide (backend)

```bash
docker compose up -d
cp apps/api/.env.example apps/api/.env
cp apps/api/.env.test.example apps/api/.env.test
npm install
npm run prisma:migrate:dev --workspace=apps/api
npm run prisma:seed --workspace=apps/api
npm run api
```

L'API est alors disponible sur `http://localhost:3333`, avec la documentation Swagger sur `http://localhost:3333/api/docs`.

> Les ports Postgres/Redis/API (5434/6380/3333) sont volontairement décalés des ports par défaut pour éviter les conflits avec d'autres projets Docker sur la même machine — voir `docker-compose.yml` et `apps/api/.env.example`.

Compte de démonstration créé par le seed : téléphone `+224600000000`, mot de passe `Demo1234!`.

## Démarrage rapide (mobile)

Nécessite le [SDK Flutter](https://docs.flutter.dev/get-started/install) (3.47+) installé au préalable, plus Android Studio ou Xcode pour un émulateur.

```bash
cd apps/mobile
flutter pub get
flutter analyze
flutter test
flutter run --dart-define=THY_API_BASE_URL=http://10.0.2.2:3333
```

`THY_API_BASE_URL` pointe par défaut vers `http://10.0.2.2:3333` (émulateur Android). Pour un simulateur iOS ou un appareil physique, ajustez cette valeur (voir `lib/core/api/api_config.dart`).

`flutter test` lance les tests de widgets (avec de faux services). Le test `test/live_api_test.dart` vérifie en plus la couche API contre un **vrai backend** seedé ; il est ignoré tant qu'on ne lui donne pas d'URL :

```bash
flutter test test/live_api_test.dart --dart-define=THY_API_BASE_URL=http://localhost:3333
```

Le scan par caméra a aussi un test **sur appareil** (`integration_test/barcode_decode_test.dart`) : il dessine les codes-barres de démo et les fait lire par le vrai décodeur du téléphone. Il tourne sur un émulateur ou un téléphone branché, pas sur le PC :

```bash
flutter test integration_test/barcode_decode_test.dart -d <id de l'appareil>   # flutter devices
```

> **Machine avec Device Guard / WDAC** : si `dart.exe` est bloqué par une politique de sécurité Windows, le SDK Flutter peut être installé et exécuté dans WSL2 (Ubuntu) — le code (`analyze` et `test`) a été validé de cette façon. Un émulateur Android nécessite en revanche les outils Android côté Windows.

### Lancer sur un émulateur Android (Windows)

Validé sur un Pixel 7 virtuel (Android 15). Prérequis : Docker et l'API démarrés (`npm run start:dev` dans `apps/api`).

```powershell
# 1. Une fois : image système + appareil virtuel (le « / » remplace le « ; » dans les identifiants)
sdkmanager "system-images/android-35/google_apis/x86_64"
sdkmanager "ndk/28.2.13676358"          # sinon Gradle tente de l'installer lui-même et échoue
avdmanager create avd -n thy_pixel -k "system-images;android-35;google_apis;x86_64" -d pixel_7

# 2. À chaque session
flutter emulators --launch thy_pixel
cd apps/mobile
flutter run                              # http://10.0.2.2:3333 = l'API de votre PC vu depuis l'émulateur
```

- Le HTTP en clair vers l'API locale n'est autorisé que dans les builds **debug/profile** (`android/app/src/{debug,profile}/AndroidManifest.xml`) ; une version release exige du HTTPS.
- Le premier build Gradle télécharge plusieurs Go (SDK, NDK, dépendances) : prévoir 15 à 30 minutes sur une connexion moyenne ; ne pas le lancer pendant un autre gros téléchargement (délais dépassés).
- Compte de démonstration : `+224600000000` / `Demo1234!`.

### Aperçu dans le navigateur (Flutter Web)

Sans émulateur, l'app se lance dans n'importe quel navigateur — pratique pour la voir tourner tout de suite :

```bash
cd apps/mobile
flutter build web --release --dart-define=THY_API_BASE_URL=http://localhost:3333
cd build/web && python3 -m http.server 5050
```

Ouvrir <http://localhost:5050> (backend et Docker démarrés), puis se connecter avec le compte de démonstration. Affichez la fenêtre en format téléphone (≈ 412 px de large) pour retrouver la mise en page mobile.

- Le backend autorise toutes les origines hors production ; en production, listez-les dans `CORS_ORIGINS` (séparées par des virgules — voir `.env.example`).
- Build fait dans WSL : le navigateur Windows atteint le serveur WSL via `localhost` ; l'app, elle, appelle l'API Windows sur `localhost:3333`.
- Le parcours complet (connexion → caisse → reçu → stock → clients → créances → dépenses) a été rejoué dans un navigateur piloté par script, sans erreur applicative.
