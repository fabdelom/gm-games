# Astralis Nakama Runtime (v0.1 bootstrap)

Ce dossier hébergera le runtime TypeScript Nakama pour la logique serveur autoritaire Astralis.

## Scope v0.1
- Match handler `map_match.ts`
- Messages: `join_map`, `move_request`, `leave_map`
- Validation serveur des déplacements
- Broadcast état map (`map_state`, `move_result`)

## Arborescence visée
- `modules/` : scripts chargés par Nakama
- `src/` : source TS du runtime
- `dist/` : build JS runtime
