const assert = require("assert");
const {
	LocalAuthoritativeSimulator,
} = require("./localAuthoritativeSimulator");

const testJoin = () => {
	const sim = new LocalAuthoritativeSimulator();
	const msg = sim.joinMap({ mapId: "map_001", characterId: "c1" });
	assert.equal(msg.opCode, 1002);
	assert.equal(msg.data.players[0].x, 0);
};

const testMoveRules = () => {
	const sim = new LocalAuthoritativeSimulator();
	const blocked = sim.moveTo({ x: 1, y: 0 });
	assert.equal(blocked.data.accepted, false);
	assert.equal(blocked.data.reason, "NOT_IN_COMBAT");

	sim.startCombat();
	const ok = sim.moveTo({ x: 1, y: 0 });
	assert.equal(ok.data.accepted, true);

	const tooFar = sim.moveTo({ x: 3, y: 0 });
	assert.equal(tooFar.data.accepted, false);
	assert.equal(tooFar.data.reason, "TOO_FAR");

	const invalid = sim.moveTo({ x: -1, y: 0 });
	assert.equal(invalid.data.reason, "INVALID_CELL");
};

testJoin();
testMoveRules();
console.log("localAuthoritativeSimulator tests passed");
