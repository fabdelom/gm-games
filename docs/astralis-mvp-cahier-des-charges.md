# Cahier des charges MVP — Les Terres d’Astralis

## Vision produit
- **Type de jeu** : RPG tactique isométrique multijoueur au tour par tour (navigateur).
- **Objectif MVP** : livrer une boucle jouable et stable `exploration → combat instancié → loot/XP → progression`.
- **Contraintes de conception** : architecture prête à évoluer vers un MMO (sans choix bloquants court terme).

## Principes non négociables
1. **Serveur autoritaire (Nakama)**
   - Le client envoie des intentions ; le serveur valide, calcule, et diffuse l’état officiel.
   - Aucune logique critique de confiance côté client (déplacements finaux, dégâts, loot, XP, niveaux, stats).
2. **Multijoueur dès le MVP**
   - Co-présence joueurs sur map, déplacements synchronisés, groupes de monstres visibles.
3. **Combats PVM instanciés**
   - Monde ouvert séparé des rooms de combat.
4. **Isométrique + Tiled**
   - Rendu Phaser, maps JSON issues de Tiled.
5. **MVP petit mais propre**
   - Contenu limité, fondations techniques solides.

## Stack technique validée
- **Frontend** : Angular + TypeScript
- **Moteur 2D** : Phaser
- **Game server** : Nakama
- **Base de données** : PostgreSQL
- **Back-office admin** : Spring Boot REST + PostgreSQL
- **Déploiement MVP** : Docker Compose
- **Évolutivité ciblée** : Kubernetes, services séparés, logs/monitoring centralisés

## Architecture et responsabilités

### Client Web (Angular + Phaser)
- Angular : authentification, création perso, inventaire, équipement, UI hors-canvas.
- Phaser : maps isométriques, rendu entités, sélection cellules, feedback combat.

### Nakama
- Auth/session, présence, rooms de map/combats, validations autoritaires.
- Calculs combat, tours, IA monstres, loot/XP, persistance état joueur.

### PostgreSQL
- Comptes, personnages, stats, inventaires, équipements, contenu (items/sorts/monstres/maps), historique.

### Spring Boot (admin)
- CRUD contenu (items/sorts/monstres/panoplies/loot/maps), modération, consultation historique.

## Monde et contenu MVP
- **~20 maps** en **4 zones** :
  1. Plaine des Débuts (1–5)
  2. Forêt Épaisse (6–10)
  3. Ruines Anciennes (11–15)
  4. Caverne Oubliée (16–20)
- Chaque map : cellules walkables/bloquantes, spawns joueurs/monstres, transitions.
- **3 classes jouables**, **3 familles de monstres** (+ sous-monstres), **3 boss**, **~5 panoplies**.

## Flux map (rooms Nakama)
- 1 map = 1 room (`map_001`, etc.)
- Événements clés : `joinMap`, `leaveMap`, `moveToCell`, `changeMap`, `startFight`.
- État room : joueurs, positions, groupes monstres, horodatage spawn.

## Déplacement (MVP)
- Déplacement case par case.
- Client peut proposer un chemin visuel ; serveur valide la destination/cohérence.
- Évolution future : pathfinding serveur complet + anti-TP avancé.

## Spawn monstres
- 0 à 3 groupes par map.
- Groupes verrouillables en combat, respawn périodique, composition aléatoire par zone.
- Boss : map dédiée ou rare spawn.

## Combat PVM instancié
- Démarrage : `startFight` → lock groupe → création room combat → placement → exécution.
- MVP : 1 joueur vs 1 groupe, extensible multijoueur plus tard.
- Tours : PA/PM reset début de tour, timer 30–45s, auto-pass si inaction.

## Actions de combat (serveur autoritaire)
- `move` : validation portée PM, cellule, chemin libre.
- `castSpell` : validation tour, PA, portée, LoS, cooldown, cible.
- `passTurn` : fin de tour + rotation initiative.

## Grille de combat
- Isométrique (12x12 ou 14x14), obstacles, cellules validées.
- Option simple : 1 grille par zone.

## Progression RPG
- Niveau max MVP : **20**.
- Gain niveau : **+5 PV auto** + **5 points de caractéristiques**.
- Caractéristiques distribuables : Vitalité/Force/Intelligence/Chance/Agilité/Sagesse.
- Recommandation MVP : 1 Vitalité = +5 PV ; autres = +1 stat.

## Classes (résumé)
- **Gardien** : mêlée/tank (Terre/Neutre)
- **Tireur** : distance/mobile (Air/Eau)
- **Éclaireur** : hybride mobile (Feu/Air)

## Monstres et IA
- Familles : Crocs-Sauvages, Mandragores, Gardiens des Ruines.
- IA MVP simple : Agressif, Distance, Défensif, Boss (rotation lisible).

## Items, inventaire, équipement
- Slots : HEAD/CAPE/AMULET/RING_1/RING_2/BELT/BOOTS/WEAPON.
- Raretés : COMMON → BOSS.
- Inventaire persistant, empilement ressources, équipement/déséquipement.
- Recalcul serveur : base + points + équipement + bonus panoplies + effets combat.

## Loot et XP (MVP)
- Loot table par monstre (`drop_rate`, quantités min/max).
- Chance finale loot : `chance_base × (prospection / 100)`.
- XP : somme monstres × multiplicateur sagesse.

## Sécurité / anti-triche
- Validation stricte de tous les messages temps réel.
- État officiel serveur, logs combat, rate limiting, détection d’actions impossibles.

## Reconnexion
- Sur map : retour dernière map.
- En combat : tour auto-pass si absent ; réintégration room si combat en cours.

## Roadmap de livraison
- **v0.1** : socle multi map isométrique synchronisée
- **v0.2** : groupes monstres sur map
- **v0.3** : premier combat instancié
- **v0.4** : progression (XP/loot/inventaire/équipement)
- **v0.5** : contenu MVP complet
- **v0.6** : base MMO sociale (chat/groupe/reconnexion/admin)

## Priorités d’exécution
1. Serveur autoritaire
2. Multijoueur sur map
3. Combat instancié
4. Boucle XP/loot/équipement
5. Contenu

## Hors-scope MVP (immédiat)
- Hôtel de vente, craft/métiers, guildes, PvP complet, économie avancée, boutique.

## Critère d’acceptation global MVP
Un joueur peut progresser du niveau 1 à 20 via la boucle :
`connexion → exploration multijoueur → combat PVM instancié → victoire/défaite → XP/loot → équipement/stats → zones plus difficiles`.
