const DEFAULT_BOUNDS = { width: 20, height: 20 };

const inBounds = (x, y, bounds = DEFAULT_BOUNDS) =>
	Number.isInteger(x) &&
	Number.isInteger(y) &&
	x >= 0 &&
	y >= 0 &&
	x < bounds.width &&
	y < bounds.height;

const manhattan = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

class LocalAuthoritativeSimulator {
	constructor() {
		this.position = { x: 0, y: 0 };
		this.lastMoveTick = -1;
		this.tick = 0;
		this.phase = "PLACEMENT";
	}

	joinMap({ mapId, characterId }) {
		return {
			opCode: 1002,
			data: {
				mapId,
				players: [{ characterId, x: this.position.x, y: this.position.y }],
			},
		};
	}

	startCombat() {
		this.phase = "COMBAT";
		return { opCode: 1006, data: { phase: this.phase } };
	}

	moveTo(to) {
		this.tick += 1;
		const from = { ...this.position };
		let accepted = false;
		let reason = null;

		if (this.phase !== "COMBAT") {
			reason = "NOT_IN_COMBAT";
		} else if (!inBounds(to.x, to.y)) {
			reason = "INVALID_CELL";
		} else if (manhattan(from, to) > 1) {
			reason = "TOO_FAR";
		} else if (this.lastMoveTick === this.tick) {
			reason = "TOO_FAST";
		} else {
			accepted = true;
			this.position = { ...to };
			this.lastMoveTick = this.tick;
		}

		return {
			opCode: 1004,
			data: {
				accepted,
				from,
				to,
				reason,
			},
		};
	}
}

module.exports = { LocalAuthoritativeSimulator };
