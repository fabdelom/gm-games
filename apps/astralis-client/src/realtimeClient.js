const DEFAULT_OPS = {
	JOIN_MAP: 1001,
	MAP_STATE: 1002,
	MOVE_REQUEST: 1003,
	MOVE_RESULT: 1004,
};

const safeParse = raw => {
	try {
		return JSON.parse(raw);
	} catch {
		return null;
	}
};

class AstralisRealtimeClient {
	constructor({ socket, logger = console, ops = DEFAULT_OPS }) {
		this.socket = socket;
		this.logger = logger;
		this.ops = ops;
		this.handlers = {
			onMapState: () => {},
			onMoveResult: () => {},
		};
	}

	on(eventName, handler) {
		if (this.handlers[eventName]) {
			this.handlers[eventName] = handler;
		}
	}

	async joinMap({ mapId, characterId }) {
		const payload = JSON.stringify({ mapId, characterId });
		await this.socket.sendMatchState(this.ops.JOIN_MAP, payload);
	}

	async moveTo({ x, y }) {
		const payload = JSON.stringify({ to: { x, y } });
		await this.socket.sendMatchState(this.ops.MOVE_REQUEST, payload);
	}

	handleMatchState(message) {
		const payload = safeParse(message.data);
		if (!payload) {
			this.logger.warn("AstralisRealtimeClient: invalid JSON payload", message);
			return;
		}

		if (message.opCode === this.ops.MAP_STATE) {
			this.handlers.onMapState(payload);
			return;
		}

		if (message.opCode === this.ops.MOVE_RESULT) {
			this.handlers.onMoveResult(payload);
		}
	}
}

module.exports = {
	AstralisRealtimeClient,
	DEFAULT_OPS,
};
