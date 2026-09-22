# 0003 — Gestion d'état côté mobile : Riverpod

## Décision

Utiliser **Riverpod** (`flutter_riverpod`, providers classiques sans générateur de code au démarrage) plutôt que Bloc pour l'app Flutter.

## Raisons

- Pas de plomberie `BuildContext`, DI vérifiée à la compilation.
- `FutureProvider`/`AsyncNotifier` collent naturellement aux appels REST (chargement/erreur/données).
- Nettement moins de code cérémonial que le couple événement/état de Bloc — priorité à la vitesse d'itération pour un MVP solo.
- `riverpod_generator` pourra être introduit plus tard si la base de code grossit ; on évite la friction `build_runner` au démarrage.

## Routing

`go_router` avec des gardes de redirection : pas de token → `/login` ; token présent mais pas d'entreprise active → `/business/create`.
