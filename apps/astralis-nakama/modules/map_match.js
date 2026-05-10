const OPS = {
	JOIN_MAP: 1001,
	MAP_STATE: 1002,
	MOVE_REQUEST: 1003,
	MOVE_RESULT: 1004,
	START_COMBAT_REQUEST: 1005,
	PHASE_RESULT: 1006,
};

const DEFAULT_MAP_BOUNDS = { width: 20, height: 20 };

const parseJSON = raw => {
	try {
		return JSON.parse(raw);
	} catch {
		return null;
	}
};

const keyFor = (x, y) => `${x}:${y}`;
const manhattanDistance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

const isInsideMap = (x, y, bounds = DEFAULT_MAP_BOUNDS) =>
	Number.isInteger(x) &&
	Number.isInteger(y) &&
	x >= 0 &&
	y >= 0 &&
	x < bounds.width &&
	y < bounds.height;

const PLACEMENT_ROWS = 3;

const findSpawnCell = state => {
	for (let y = 0; y < Math.min(PLACEMENT_ROWS, state.bounds.height); y += 1) {
		for (let x = 0; x < state.bounds.width; x += 1) {
			if (!state.occupied[keyFor(x, y)]) {
				return { x, y };
			}
		}
	}
	return null;
};

const mapInit = (ctx, logger, nk, params) => {
	const mapId = params && params.mapId ? params.mapId : "map_001";
	const state = {
		mapId,
		bounds: DEFAULT_MAP_BOUNDS,
		presences: {},
		byUserId: {},
		occupied: {},
		tick: 0,
		phase: "PLACEMENT",
	};

	logger.info(`Astralis map match initialized for ${mapId}`);

	return { state, tickRate: 5, label: mapId };
};

const mapJoinAttempt = (
	ctx,
	logger,
	nk,
	dispatcher,
	tick,
	state,
	presence,
	metadata,
) => ({ state, accept: true });

const mapJoin = (ctx, logger, nk, dispatcher, tick, state, presences) => {
	for (const presence of presences) {
		const spawn = findSpawnCell(state);
		if (!spawn) {
			logger.warn("Astralis map is full, rejecting join placement.");
			continue;
		}
		const id = presence.sessionId;

		state.presences[id] = {
			presence,
			x: spawn.x,
			y: spawn.y,
			classType: "GUARDIAN",
			characterId: presence.userId,
			lastMoveTick: -1,
		};
		state.byUserId[presence.userId] = id;
		state.occupied[keyFor(spawn.x, spawn.y)] = id;
	}

	const payload = JSON.stringify({
		mapId: state.mapId,
		phase: state.phase,
		players: Object.values(state.presences).map(p => ({
			characterId: p.characterId,
			classType: p.classType,
			x: p.x,
			y: p.y,
		})),
	});

	dispatcher.broadcastMessage(OPS.MAP_STATE, payload);

	return { state };
};

const mapLeave = (ctx, logger, nk, dispatcher, tick, state, presences) => {
	for (const presence of presences) {
		const id = presence.sessionId;
		const player = state.presences[id];
		if (player) {
			delete state.occupied[keyFor(player.x, player.y)];
			delete state.byUserId[presence.userId];
			delete state.presences[id];
		}
	}

	const payload = JSON.stringify({
		mapId: state.mapId,
		phase: state.phase,
		players: Object.values(state.presences).map(p => ({
			characterId: p.characterId,
			classType: p.classType,
			x: p.x,
			y: p.y,
		})),
	});
	dispatcher.broadcastMessage(OPS.MAP_STATE, payload);

	return { state };
};

const mapLoop = (ctx, logger, nk, dispatcher, tick, state, messages) => {
	state.tick = tick;

	for (const message of messages) {
		if (message.opCode === OPS.START_COMBAT_REQUEST) {
			const senderId = message.sender && message.sender.sessionId;
			if (!senderId || !state.presences[senderId] || state.phase === "COMBAT") {
				continue;
			}

			state.phase = "COMBAT";
			const phaseResult = JSON.stringify({ phase: state.phase });
			dispatcher.broadcastMessage(OPS.PHASE_RESULT, phaseResult);
			continue;
		}

		if (message.opCode !== OPS.MOVE_REQUEST) {
			continue;
		}

		const payload = parseJSON(message.data);
		const senderId = message.sender.sessionId;
		const player = state.presences[senderId];
		if (!payload || !player) {
			continue;
		}

		const to = payload.to || {};
		const validCell = isInsideMap(to.x, to.y, state.bounds);
		const targetKey = keyFor(to.x, to.y);
		const occupied = !!state.occupied[targetKey];

		let accepted = false;
		let reason = null;
		const from = { x: player.x, y: player.y };

		if (state.phase !== "COMBAT") {
			reason = "NOT_IN_COMBAT";
		} else if (player.lastMoveTick === tick) {
			reason = "TOO_FAST";
		} else if (!validCell) {
			reason = "INVALID_CELL";
		} else if (manhattanDistance(from, to) > 1) {
			reason = "TOO_FAR";
		} else if (occupied) {
			reason = "CELL_OCCUPIED";
		} else {
			delete state.occupied[keyFor(from.x, from.y)];
			state.occupied[targetKey] = senderId;
			player.x = to.x;
			player.y = to.y;
			player.lastMoveTick = tick;
			accepted = true;
		}

		const result = JSON.stringify({
			accepted,
			characterId: player.characterId,
			from,
			to: { x: to.x, y: to.y },
			reason,
		});

		dispatcher.broadcastMessage(OPS.MOVE_RESULT, result);
	}

	return { state };
};

const mapTerminate = (
	ctx,
	logger,
	nk,
	dispatcher,
	tick,
	state,
	graceSeconds,
) => {
	logger.info(`Astralis map match terminated for ${state.mapId}`);
	return { state };
};

module.exports = {
	OPS,
	mapInit,
	mapJoinAttempt,
	mapJoin,
	mapLeave,
	mapLoop,
	mapTerminate,
};
