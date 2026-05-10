# Les Terres d’Astralis — Plan d’implémentation v0.1

## Objectif v0.1
Avoir **2 joueurs connectés** qui se voient et se déplacent en temps réel sur **une map isométrique**.

## Définition de terminé (DoD)
- Connexion compte (Nakama) fonctionnelle.
- Création d’un personnage minimal (nom + classe).
- Chargement map Tiled JSON côté client.
- Join room map (`map_001`) et présence temps réel.
- Déplacement case par case validé côté serveur.
- Synchronisation des positions entre clients (< 250 ms en LAN/dev).

## Architecture technique ciblée (v0.1)

### Frontend (`apps/astralis-client`)
- Angular pour shell app + écrans auth/char select.
- Phaser intégré dans un composant Angular dédié (`GameCanvasComponent`).
- Service websocket Nakama (`NakamaRealtimeService`).
- Store local minimal (signals ou RxJS) pour l’état map/joueurs.

### Game server (`apps/astralis-nakama`)
- Runtime TypeScript Nakama.
- Match handler `map_match.ts`:
  - `join_map`
  - `move_request`
  - `leave_map`
- Validation serveur des moves:
  - cellule existe,
  - cellule walkable,
  - distance max/cadence,
  - joueur présent dans match.

### Données (`PostgreSQL`)
Tables minimales:
- `accounts` (Nakama auth)
- `characters` (id, account_id, name, class_type, map_id, x, y, level)
- `maps` (id, tiled_json_path)

## Contrat réseau minimal

### Client -> Serveur
- `join_map`
```json
{ "mapId": "map_001", "characterId": "uuid" }
```
- `move_request`
```json
{ "characterId": "uuid", "to": { "x": 12, "y": 7 } }
```

### Serveur -> Clients
- `map_state`
```json
{
  "mapId": "map_001",
  "players": [{ "characterId": "uuid", "x": 10, "y": 6, "classType": "GUARDIAN" }]
}
```
- `move_result`
```json
{
  "accepted": true,
  "characterId": "uuid",
  "from": { "x": 10, "y": 6 },
  "to": { "x": 11, "y": 6 },
  "reason": null
}
```

## Plan d’exécution (tickets)

### Sprint A — Socle projet
1. Créer arborescence Astralis (`apps/astralis-client`, `apps/astralis-nakama`, `infra/docker`).
2. Ajouter `docker-compose.astralis.yml` (nakama + postgres + migrations).
3. Ajouter scripts npm:
   - `astralis:dev:up`
   - `astralis:dev:down`
   - `astralis:client:serve`

### Sprint B — Client isométrique
4. Initialiser Angular + Phaser bridge.
5. Intégrer `map_001.json` export Tiled.
6. Afficher grille + cellule sélectionnée + avatar local.

### Sprint C — Temps réel Nakama
7. Connexion/session Nakama.
8. `join_map` + réception `map_state`.
9. Broadcast `player_joined` / `player_left`.

### Sprint D — Déplacements autoritaires
10. `move_request` + validation serveur.
11. Diffusion `move_result` à tous.
12. Gestion rejet (`accepted=false`, affichage raison).

### Sprint E — Validation finale v0.1
13. Test manuel 2 clients simultanés.
14. Vérifier collisions simples (2 joueurs même case: refus).
15. Geler API et préparer v0.2 (groupes monstres).

## Stratégie de test
- **Tests unitaires serveur**: validation cellules + règles déplacement.
- **Tests contrat**: payload JSON (zod côté client + serveur).
- **Smoke test E2E manuel**:
  1. lancer infra,
  2. ouvrir 2 navigateurs,
  3. connexion de 2 comptes,
  4. vérification synchro positions.

## Risques et décisions
- **Risque**: couplage fort Angular/Phaser.
  - **Décision**: isoler Phaser dans une façade dédiée.
- **Risque**: triche déplacement.
  - **Décision**: aucune interpolation faisant foi, serveur source of truth.
- **Risque**: complexité trop tôt.
  - **Décision**: 1 seule map, 0 monstres en v0.1.

## Prochaine étape immédiate
Implémenter **Sprint A** puis livrer un PR technique “bootstrap astralis runtime” avant logique gameplay.
