const assert = require("assert");
const { AstralisRealtimeClient, DEFAULT_OPS } = require("./realtimeClient");

const makeSocket = () => {
	const calls = [];
	return {
		calls,
		async sendMatchState(opCode, payload) {
			calls.push({ opCode, payload: JSON.parse(payload) });
		},
	};
};

const testJoinMapMessage = async () => {
	const socket = makeSocket();
	const client = new AstralisRealtimeClient({ socket, logger: { warn() {} } });

	await client.joinMap({ mapId: "map_001", characterId: "char_1" });
	assert.equal(socket.calls.length, 1);
	assert.equal(socket.calls[0].opCode, DEFAULT_OPS.JOIN_MAP);
	assert.equal(socket.calls[0].payload.mapId, "map_001");
	assert.equal(socket.calls[0].payload.characterId, "char_1");
};

const testMoveMessage = async () => {
	const socket = makeSocket();
	const client = new AstralisRealtimeClient({ socket, logger: { warn() {} } });

	await client.moveTo({ x: 4, y: 6 });
	assert.equal(socket.calls[0].opCode, DEFAULT_OPS.MOVE_REQUEST);
	assert.deepEqual(socket.calls[0].payload.to, { x: 4, y: 6 });
};

const testDispatchIncomingMessages = () => {
	const socket = makeSocket();
	const seen = { mapState: null, moveResult: null };
	const client = new AstralisRealtimeClient({ socket, logger: { warn() {} } });

	client.on("onMapState", payload => {
		seen.mapState = payload;
	});
	client.on("onMoveResult", payload => {
		seen.moveResult = payload;
	});

	client.handleMatchState({
		opCode: DEFAULT_OPS.MAP_STATE,
		data: JSON.stringify({ mapId: "map_001", players: [] }),
	});
	client.handleMatchState({
		opCode: DEFAULT_OPS.MOVE_RESULT,
		data: JSON.stringify({ accepted: true, to: { x: 1, y: 1 } }),
	});

	assert.equal(seen.mapState.mapId, "map_001");
	assert.equal(seen.moveResult.accepted, true);
};

const run = async () => {
	await testJoinMapMessage();
	await testMoveMessage();
	testDispatchIncomingMessages();
	console.log("realtimeClient tests passed");
};

run();
