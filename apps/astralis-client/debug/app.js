const inBounds = (x, y, bounds = { width: 20, height: 20 }) =>
	Number.isInteger(x) &&
	Number.isInteger(y) &&
	x >= 0 &&
	y >= 0 &&
	x < bounds.width &&
	y < bounds.height;

const manhattan = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const getMaxRange = spell => {
	if (!spell || !spell.range) {
		return 0;
	}
	const nums = `${spell.range}`.match(/\d+/g);
	if (!nums || nums.length === 0) {
		return 0;
	}
	return Number(nums[nums.length - 1]);
};

class LocalAuthoritativeSimulator {
	constructor() {
		this.position = { x: 0, y: 0 };
		this.otherPlayers = [{ characterId: "debug-char-2", x: 1, y: 1 }];
		this.tick = 0;
	}

	joinMap({ mapId, characterId }) {
		return {
			opCode: 1002,
			data: {
				mapId,
				players: [
					{ characterId, x: this.position.x, y: this.position.y },
					...this.otherPlayers,
				],
			},
		};
	}

	moveTo(to) {
		this.tick += 1;
		const from = { ...this.position };
		if (!inBounds(to.x, to.y)) {
			return {
				opCode: 1004,
				data: { accepted: false, from, to, reason: "INVALID_CELL" },
			};
		}
		if (manhattan(from, to) > 1) {
			return {
				opCode: 1004,
				data: { accepted: false, from, to, reason: "TOO_FAR" },
			};
		}
		if (this.otherPlayers.some(p => p.x === to.x && p.y === to.y)) {
			return {
				opCode: 1004,
				data: { accepted: false, from, to, reason: "CELL_OCCUPIED" },
			};
		}
		this.position = { ...to };
		return { opCode: 1004, data: { accepted: true, from, to, reason: null } };
	}
}

const logEl = document.getElementById("log");
const posEl = document.getElementById("pos");
const gameModeEl = document.getElementById("gameMode");
const initiativeOrderEl = document.getElementById("initiativeOrder");
const gridEl = document.getElementById("grid");
const lastErrorEl = document.getElementById("lastError");
const classSelectEl = document.getElementById("classSelect");
const skinSelectEl = document.getElementById("skinSelect");
const spellsListEl = document.getElementById("spellsList");
const spellDetailEl = document.getElementById("spellDetail");
const equipmentListEl = document.getElementById("equipmentList");
const hudHpEl = document.getElementById("hudHp");
const hudPaEl = document.getElementById("hudPa");
const hudPmEl = document.getElementById("hudPm");
const endTurnBtn = document.getElementById("endTurnBtn");
const castSpellBtn = document.getElementById("castSpellBtn");
const turnOwnerEl = document.getElementById("turnOwner");
const spellBarEl = document.getElementById("spellBar");
const enterCombatBtn = document.getElementById("enterCombatBtn");
const resetRunBtn = document.getElementById("resetRunBtn");
const startCombatBtn = document.getElementById("startCombatBtn");
const isoCanvas = document.getElementById("isoCanvas");
const isoCtx = isoCanvas ? isoCanvas.getContext("2d") : null;
const GRID_SIZE = 10;
const CLASS_CONFIG = {
	GARDIEN: {
		skins: ["gardien-bronze", "gardien-acier"],
		spells: [
			{
				name: "Frappe Lourde",
				pa: 3,
				range: "1",
				damage: "12-16 Terre",
				cooldown: 0,
			},
			{
				name: "Coup de Bouclier",
				pa: 3,
				range: "1",
				damage: "8-12 Neutre",
				cooldown: 0,
			},
			{
				name: "Charge Courte",
				pa: 4,
				range: "2-3",
				damage: "10-14 Terre",
				cooldown: 1,
			},
			{
				name: "Peau de Fer",
				pa: 2,
				range: "Soi",
				damage: "+10 Résistance (1 tour)",
				cooldown: 3,
			},
		],
		equipment: ["Casque du Gardien", "Armure du Gardien", "Ceinture de Fer"],
	},
	TIREUR: {
		skins: ["tireur-forestier", "tireur-ombre"],
		spells: [
			{
				name: "Tir Précis",
				pa: 3,
				range: "2-6",
				damage: "10-15 Air",
				cooldown: 0,
			},
			{
				name: "Tir Repoussant",
				pa: 3,
				range: "1-4",
				damage: "7-10 Air",
				cooldown: 1,
			},
			{
				name: "Flèche Rapide",
				pa: 2,
				range: "2-5",
				damage: "6-9 Eau",
				cooldown: 0,
			},
			{
				name: "Piège Léger",
				pa: 3,
				range: "1-4",
				damage: "10-14 Air (piège)",
				cooldown: 2,
			},
		],
		equipment: ["Capuche du Tireur", "Anneau de Précision", "Bottes Légères"],
	},
	ECLAIREUR: {
		skins: ["eclaireur-rouge", "eclaireur-azur"],
		spells: [
			{
				name: "Lame d’Énergie",
				pa: 3,
				range: "1-2",
				damage: "9-13 Feu",
				cooldown: 0,
			},
			{
				name: "Rayon Instable",
				pa: 4,
				range: "2-5",
				damage: "13-18 Feu",
				cooldown: 1,
			},
			{
				name: "Bond Agile",
				pa: 3,
				range: "1-3",
				damage: "Déplacement",
				cooldown: 3,
			},
			{
				name: "Concentration",
				pa: 2,
				range: "Soi",
				damage: "+20 Puissance (1 tour)",
				cooldown: 3,
			},
		],
		equipment: [
			"Coiffe de l’Érudit",
			"Amulette Brillante",
			"Sandales Mystiques",
		],
	},
};

const log = msg => {
	logEl.textContent += `${msg}\n`;
};

const isoProject = (x, y) => ({
	x: 320 + (x - y) * 18,
	y: 70 + (x + y) * 10,
});

let sceneTime = 0;

const drawToken = (x, y, color, bob = 0) => {
	const pos = isoProject(x, y);
	const cy = pos.y + 8 + bob;
	isoCtx.fillStyle = "rgba(0,0,0,0.25)";
	isoCtx.beginPath();
	isoCtx.ellipse(pos.x, pos.y + 15, 9, 4, 0, 0, Math.PI * 2);
	isoCtx.fill();
	isoCtx.fillStyle = color;
	isoCtx.beginPath();
	isoCtx.arc(pos.x, cy, 7, 0, Math.PI * 2);
	isoCtx.fill();
	isoCtx.fillStyle = "rgba(255,255,255,0.28)";
	isoCtx.beginPath();
	isoCtx.arc(pos.x - 2, cy - 2, 2, 0, Math.PI * 2);
	isoCtx.fill();
};

const renderIsoScene = playerPos => {
	if (!isoCtx) {
		return;
	}
	isoCtx.clearRect(0, 0, isoCanvas.width, isoCanvas.height);
	const pulse = (Math.sin(sceneTime / 380) + 1) * 0.5;
	const pulseAlpha = 0.25 + pulse * 0.35;
	for (let y = 0; y < 10; y += 1) {
		for (let x = 0; x < 10; x += 1) {
			const p = isoProject(x, y);
			const inPlacementZone = hudState.mode === "PLACEMENT" && y <= 2;
			const inEnemyZone = hudState.mode === "PLACEMENT" && y >= 7;
			isoCtx.beginPath();
			isoCtx.moveTo(p.x, p.y);
			isoCtx.lineTo(p.x + 18, p.y + 10);
			isoCtx.lineTo(p.x, p.y + 20);
			isoCtx.lineTo(p.x - 18, p.y + 10);
			isoCtx.closePath();
			isoCtx.fillStyle = (x + y) % 2 === 0 ? "#4f8a4f" : "#5a9a5a";
			if (inPlacementZone) {
				isoCtx.fillStyle = `rgba(74, 222, 128, ${pulseAlpha})`;
			}
			if (inEnemyZone) {
				isoCtx.fillStyle = `rgba(248, 113, 113, ${pulseAlpha})`;
			}
			isoCtx.fill();
			isoCtx.strokeStyle = "rgba(0,0,0,0.25)";
			isoCtx.stroke();
		}
	}
	if (hudState.enemyHp > 0) {
		const enemyBob = Math.sin(sceneTime / 240 + 1.5) * 1.8;
		drawToken(hudState.enemyPos.x, hudState.enemyPos.y, "#ef4444", enemyBob);
	}

	const heroBob = Math.sin(sceneTime / 260) * 1.8;
	drawToken(playerPos.x, playerPos.y, "#3b82f6", heroBob);
};

const hudState = {
	hp: 50,
	pa: 6,
	pm: 3,
	selectedSpell: null,
	cooldowns: {},
	mode: "EXPLORATION",
	enemyHp: 45,
	enemyPos: { x: 1, y: 1 },
	turn: "NONE",
	initiative: ["PLAYER", "ENEMY"],
};

const renderHud = () => {
	hudHpEl.textContent = String(hudState.hp);
	hudPaEl.textContent = String(hudState.pa);
	hudPmEl.textContent = String(hudState.pm);
	enemyHpEl.textContent = String(hudState.enemyHp);
	turnOwnerEl.textContent = hudState.turn;
	initiativeOrderEl.textContent = hudState.initiative.join(" > ");
	if (hudState.mode === "EXPLORATION") {
		gameModeEl.textContent = "Exploration";
	} else if (hudState.mode === "PLACEMENT") {
		gameModeEl.textContent = "Placement";
	} else {
		gameModeEl.textContent = "Combat";
	}
};

const enemyTakeTurn = () => {
	if (hudState.enemyHp <= 0) {
		return;
	}
	const enemyDamage = 5;
	const playerPos = parsePos();
	if (hudState.enemyPos.x < playerPos.x) {
		hudState.enemyPos.x += 1;
	} else if (hudState.enemyPos.x > playerPos.x) {
		hudState.enemyPos.x -= 1;
	} else if (hudState.enemyPos.y < playerPos.y) {
		hudState.enemyPos.y += 1;
	} else if (hudState.enemyPos.y > playerPos.y) {
		hudState.enemyPos.y -= 1;
	}
	hudState.hp = Math.max(0, hudState.hp - enemyDamage);
	log(`[ENEMY] Le monstre inflige ${enemyDamage} dégâts.`);
	renderHud();
	renderIsoScene(playerPos);
	if (hudState.hp <= 0) {
		log("[DEFAITE] Tu es KO.");
	}
};

const simulator = new LocalAuthoritativeSimulator();

const fakeSocket = {
	sendMatchState(opCode, payloadRaw) {
		const payload = JSON.parse(payloadRaw);
		if (opCode === 1001) {
			const message = simulator.joinMap(payload);
			window.onServerMessage({
				opCode: message.opCode,
				data: JSON.stringify(message.data),
			});
			return;
		}
		if (opCode === 1003) {
			const message = simulator.moveTo(payload.to);
			window.onServerMessage({
				opCode: message.opCode,
				data: JSON.stringify(message.data),
			});
		}
	},
};

const client = {
	joinMap() {
		fakeSocket.sendMatchState(
			1001,
			JSON.stringify({ mapId: "map_001", characterId: "debug-char" }),
		);
	},
	moveTo(x, y) {
		fakeSocket.sendMatchState(1003, JSON.stringify({ to: { x, y } }));
	},
};

const renderClassOptions = () => {
	classSelectEl.innerHTML = "";
	for (const className of Object.keys(CLASS_CONFIG)) {
		const option = document.createElement("option");
		option.value = className;
		option.textContent = className;
		classSelectEl.appendChild(option);
	}
};

const renderSkinOptions = className => {
	skinSelectEl.innerHTML = "";
	for (const skin of CLASS_CONFIG[className].skins) {
		const option = document.createElement("option");
		option.value = skin;
		option.textContent = skin;
		skinSelectEl.appendChild(option);
	}
};

const renderSpells = className => {
	spellsListEl.innerHTML = "";
	CLASS_CONFIG[className].spells.forEach((spell, index) => {
		const li = document.createElement("li");
		const remainingCd = hudState.cooldowns[spell.name] || 0;
		li.textContent = `${spell.name} (PA ${spell.pa})${
			remainingCd > 0 ? ` [CD ${remainingCd}]` : ""
		}`;
		li.style.cursor = "pointer";
		li.dataset.spellIndex = String(index);
		if (remainingCd > 0 || hudState.pa < spell.pa) {
			li.style.opacity = "0.5";
		}
		if (hudState.selectedSpell && hudState.selectedSpell.name === spell.name) {
			li.style.fontWeight = "bold";
		}
		li.addEventListener("click", () => {
			spellDetailEl.textContent = `${spell.name} — Portée ${spell.range} — ${spell.damage}`;
			hudState.selectedSpell = spell;
			log(`[SPELL_SELECTED] ${spell.name}`);
			renderSpells(className);
			renderSpellBar(className);
			const p = parsePos();
			renderGrid([
				{ characterId: "debug-char", x: p.x, y: p.y },
				{ characterId: "debug-char-2", x: 1, y: 1 },
			]);
			renderIsoScene(p);
		});
		spellsListEl.appendChild(li);
	});
};

const renderSpellBar = className => {
	spellBarEl.innerHTML = "";
	CLASS_CONFIG[className].spells.forEach((spell, index) => {
		const slot = document.createElement("div");
		slot.className = "spell-slot";
		const remainingCd = hudState.cooldowns[spell.name] || 0;
		if (remainingCd > 0 || hudState.pa < spell.pa) {
			slot.classList.add("disabled");
		}
		if (hudState.selectedSpell && hudState.selectedSpell.name === spell.name) {
			slot.classList.add("selected");
		}
		slot.innerHTML = `<div><strong>${index + 1}</strong> · ${
			spell.name
		}</div><div>PA ${spell.pa} ${
			remainingCd > 0 ? `· CD ${remainingCd}` : ""
		}</div>`;
		slot.addEventListener("click", () => {
			hudState.selectedSpell = spell;
			spellDetailEl.textContent = `${spell.name} — Portée ${spell.range} — ${spell.damage}`;
			log(`[SPELL_SELECTED] ${spell.name} (barre)`);
			renderSpells(className);
			renderSpellBar(className);
			const p = parsePos();
			renderGrid([
				{ characterId: "debug-char", x: p.x, y: p.y },
				{ characterId: "debug-char-2", x: 1, y: 1 },
			]);
			renderIsoScene(p);
		});
		spellBarEl.appendChild(slot);
	});
};

const renderEquipment = className => {
	equipmentListEl.innerHTML = "";
	for (const item of CLASS_CONFIG[className].equipment) {
		const li = document.createElement("li");
		li.textContent = item;
		equipmentListEl.appendChild(li);
	}
};

const syncClassUI = className => {
	renderSkinOptions(className);
	hudState.cooldowns = {};
	renderSpells(className);
	renderEquipment(className);
	const firstSpell = CLASS_CONFIG[className].spells[0];
	spellDetailEl.textContent = `${firstSpell.name} — Portée ${firstSpell.range} — ${firstSpell.damage}`;
	hudState.selectedSpell = firstSpell;
	renderSpellBar(className);
	log(`[CLASS] ${className} / skin=${CLASS_CONFIG[className].skins[0]}`);
};

window.onServerMessage = message => {
	const payload = JSON.parse(message.data);
	if (message.opCode === 1002) {
		log(`[MAP_STATE] map=${payload.mapId} players=${payload.players.length}`);
		renderGrid(payload.players || []);
	}
	if (message.opCode === 1004) {
		posEl.textContent = `(${payload.to.x},${payload.to.y})`;
		if (payload.accepted) {
			lastErrorEl.textContent = "Aucune";
			const players = [
				{ characterId: "debug-char", x: payload.to.x, y: payload.to.y },
				{ characterId: "debug-char-2", x: 1, y: 1 },
			];
			renderGrid(players);
			renderIsoScene(payload.to);
		} else {
			lastErrorEl.textContent = payload.reason || "UNKNOWN";
		}
		log(
			`[MOVE_RESULT] accepted=${payload.accepted} from=${payload.from.x},${payload.from.y} to=${payload.to.x},${payload.to.y}`,
		);
	}
};

const parsePos = () => {
	const m = posEl.textContent.match(/\(([-\d]+),([-\d]+)\)/);
	return { x: Number(m[1]), y: Number(m[2]) };
};

document
	.getElementById("joinBtn")
	.addEventListener("click", () => client.joinMap());
document.getElementById("leftBtn").addEventListener("click", () => {
	const p = parsePos();
	client.moveTo(p.x - 1, p.y);
});
document.getElementById("rightBtn").addEventListener("click", () => {
	const p = parsePos();
	client.moveTo(p.x + 1, p.y);
});
document.getElementById("upBtn").addEventListener("click", () => {
	const p = parsePos();
	client.moveTo(p.x, p.y - 1);
});
document.getElementById("downBtn").addEventListener("click", () => {
	const p = parsePos();
	client.moveTo(p.x, p.y + 1);
});

log("Debug client prêt. Clique sur Join map_001.");

const renderGrid = players => {
	gridEl.innerHTML = "";
	const byPos = new Map();
	for (const p of players) {
		byPos.set(`${p.x}:${p.y}`, p.characterId);
	}
	const me = players.find(p => p.characterId === "debug-char") || {
		x: 0,
		y: 0,
	};
	const maxRange = getMaxRange(hudState.selectedSpell);
	for (let y = 0; y < GRID_SIZE; y += 1) {
		for (let x = 0; x < GRID_SIZE; x += 1) {
			const cell = document.createElement("div");
			cell.className = "cell";
			cell.title = `(${x},${y})`;
			cell.addEventListener("click", () => {
				if (hudState.mode === "PLACEMENT") {
					if (y > 2) {
						log(
							"[PLACEMENT] Choisis une case de départ dans la zone haute (lignes 0 à 2).",
						);
						return;
					}
					posEl.textContent = `(${x},${y})`;
					renderGrid([
						{ characterId: "debug-char", x, y },
						{ characterId: "debug-char-2", x: 1, y: 1 },
					]);
					renderIsoScene({ x, y });
					log(`[PLACEMENT] Position de départ fixée sur (${x},${y}).`);
					return;
				}
				client.moveTo(x, y);
			});
			const key = `${x}:${y}`;
			const playerId = byPos.get(key);
			if (hudState.mode === "PLACEMENT") {
				if (y <= 2) {
					cell.style.boxShadow = "inset 0 0 0 2px rgba(52,211,153,0.65)";
				}
				if (y >= 7) {
					cell.style.boxShadow = "inset 0 0 0 2px rgba(248,113,113,0.65)";
				}
			}
			if (playerId) {
				cell.classList.add("player");
				if (playerId !== "debug-char") {
					cell.style.background = "#ff9800";
					cell.innerHTML = "<span>👾</span>";
				} else {
					cell.innerHTML = "<span>🧙</span>";
				}
			} else if (maxRange > 0 && manhattan(me, { x, y }) <= maxRange) {
				cell.classList.add("in-range");
				cell.innerHTML = "<span>·</span>";
			}
			gridEl.appendChild(cell);
		}
	}
};

renderGrid([
	{ characterId: "debug-char", x: 0, y: 0 },
	{ characterId: "debug-char-2", x: 1, y: 1 },
]);
renderIsoScene({ x: 0, y: 0 });

const animateScene = now => {
	sceneTime = now;
	renderIsoScene(parsePos());
	requestAnimationFrame(animateScene);
};
requestAnimationFrame(animateScene);

renderClassOptions();
syncClassUI("GARDIEN");
classSelectEl.addEventListener("change", event => {
	syncClassUI(event.target.value);
});
skinSelectEl.addEventListener("change", event => {
	log(`[SKIN] ${event.target.value}`);
});

document.addEventListener("keydown", event => {
	const key = Number(event.key);
	if (!Number.isInteger(key) || key < 1 || key > 4) {
		return;
	}
	const className = classSelectEl.value;
	const spell = CLASS_CONFIG[className].spells[key - 1];
	if (!spell) {
		return;
	}
	hudState.selectedSpell = spell;
	spellDetailEl.textContent = `${spell.name} — Portée ${spell.range} — ${spell.damage}`;
	log(`[SPELL_SELECTED] ${spell.name} (shortcut ${key})`);
	renderSpells(className);
	renderSpellBar(className);
	const p = parsePos();
	renderGrid([
		{ characterId: "debug-char", x: p.x, y: p.y },
		{ characterId: "debug-char-2", x: 1, y: 1 },
	]);
	renderIsoScene(p);
});

endTurnBtn.addEventListener("click", () => {
	if (hudState.mode !== "COMBAT") {
		log("[TURN] Impossible: tu n'es pas en combat.");
		return;
	}
	if (hudState.turn !== "PLAYER") {
		log("[TURN] Ce n'est pas ton tour.");
		return;
	}
	hudState.turn = "ENEMY";
	hudState.pa = 6;
	hudState.pm = 3;
	for (const name of Object.keys(hudState.cooldowns)) {
		hudState.cooldowns[name] = Math.max(0, hudState.cooldowns[name] - 1);
	}
	renderSpells(classSelectEl.value);
	renderSpellBar(classSelectEl.value);
	renderHud();
	enemyTakeTurn();
	hudState.turn = "PLAYER";
	renderHud();
	log("[TURN] Nouveau tour: PA/PM réinitialisés.");
});

castSpellBtn.addEventListener("click", () => {
	if (hudState.mode !== "COMBAT") {
		log("[SPELL] Le combat n'est pas encore démarré.");
		return;
	}
	if (hudState.turn !== "PLAYER") {
		log("[SPELL] Ce n'est pas ton tour.");
		return;
	}
	if (!hudState.selectedSpell) {
		log("[SPELL] Aucun sort sélectionné.");
		return;
	}
	if (hudState.pa < hudState.selectedSpell.pa) {
		log(`[SPELL] PA insuffisants pour ${hudState.selectedSpell.name}.`);
		return;
	}
	if ((hudState.cooldowns[hudState.selectedSpell.name] || 0) > 0) {
		log(`[SPELL] ${hudState.selectedSpell.name} est en cooldown.`);
		return;
	}
	hudState.pa -= hudState.selectedSpell.pa;
	if (hudState.selectedSpell.cooldown > 0) {
		hudState.cooldowns[hudState.selectedSpell.name] =
			hudState.selectedSpell.cooldown;
	}
	renderHud();
	renderSpells(classSelectEl.value);
	renderSpellBar(classSelectEl.value);
	const p = parsePos();
	if (
		hudState.enemyHp > 0 &&
		manhattan(p, hudState.enemyPos) <= getMaxRange(hudState.selectedSpell)
	) {
		const nums = `${hudState.selectedSpell.damage}`.match(/\d+/g);
		const dmg = nums ? Number(nums[0]) : 6;
		hudState.enemyHp = Math.max(0, hudState.enemyHp - dmg);
		log(`[HIT] ${hudState.selectedSpell.name} touche le monstre pour ${dmg}.`);
		renderHud();
		if (hudState.enemyHp <= 0) {
			log("[VICTOIRE] Monstre vaincu.");
		}
	} else if (hudState.enemyHp > 0) {
		log("[SPELL] Aucun monstre à portée.");
	}
	renderIsoScene(p);
	log(
		`[SPELL_CAST] ${hudState.selectedSpell.name} (${hudState.selectedSpell.pa} PA).`,
	);
});

renderHud();

enterCombatBtn.addEventListener("click", () => {
	const p = parsePos();
	const dist = manhattan(p, hudState.enemyPos);
	if (dist > 2) {
		log(
			"[COMBAT] Approche-toi d'un groupe de monstres pour engager le combat.",
		);
		return;
	}
	hudState.mode = "PLACEMENT";
	hudState.initiative =
		Math.random() > 0.5 ? ["PLAYER", "ENEMY"] : ["ENEMY", "PLAYER"];
	hudState.turn = hudState.initiative[0];
	hudState.pa = 6;
	hudState.pm = 3;
	hudState.hp = 50;
	hudState.enemyHp = 45;
	hudState.cooldowns = {};
	hudState.enemyPos = { x: 1, y: 1 };
	renderHud();
	renderSpells(classSelectEl.value);
	renderSpellBar(classSelectEl.value);
	log("[COMBAT] Placement en cours. Clique 'Valider placement'.");
});

resetRunBtn.addEventListener("click", () => {
	hudState.mode = "EXPLORATION";
	hudState.turn = "NONE";
	hudState.initiative = ["PLAYER", "ENEMY"];
	hudState.hp = 50;
	hudState.pa = 6;
	hudState.pm = 3;
	hudState.enemyHp = 45;
	hudState.enemyPos = { x: 1, y: 1 };
	hudState.cooldowns = {};
	renderHud();
	renderSpells(classSelectEl.value);
	renderSpellBar(classSelectEl.value);
	renderGrid([
		{ characterId: "debug-char", x: 0, y: 0 },
		{ characterId: "debug-char-2", x: 1, y: 1 },
	]);
	renderIsoScene({ x: 0, y: 0 });
	log("[RESET] Nouvelle partie prête.");
});

startCombatBtn.addEventListener("click", () => {
	if (hudState.mode !== "PLACEMENT") {
		log("[PLACEMENT] Aucun combat en phase de placement.");
		return;
	}
	hudState.mode = "COMBAT";
	renderHud();
	log("[COMBAT] Combat démarré !");
	if (hudState.turn === "ENEMY") {
		enemyTakeTurn();
		hudState.turn = "PLAYER";
		renderHud();
	}
});
