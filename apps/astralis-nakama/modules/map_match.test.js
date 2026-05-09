const assert = require("assert");
const { OPS, mapInit, mapJoin, mapLeave, mapLoop } = require("./map_match");

const makeDispatcher = () => {
	const messages = [];
	return {
		messages,
		broadcastMessage(opCode, data, presences) {
			messages.push({
				opCode,
				data: JSON.parse(data),
				presences: presences || null,
			});
		},
	};
};

const basePresence = {
	sessionId: "s1",
	userId: "u1",
};

const secondPresence = {
	sessionId: "s2",
	userId: "u2",
};

const initState = () =>
	mapInit({}, { info() {} }, {}, { mapId: "map_001" }).state;

const testJoinBroadcastsMapState = () => {
	const state = initState();
	const dispatcher = makeDispatcher();

	mapJoin({}, { info() {}, warn() {} }, {}, dispatcher, 0, state, [
		basePresence,
	]);

	assert.equal(dispatcher.messages.length, 1);
	assert.equal(dispatcher.messages[0].opCode, OPS.MAP_STATE);
	assert.equal(dispatcher.messages[0].data.mapId, "map_001");
	assert.equal(dispatcher.messages[0].data.players.length, 1);
	assert.equal(dispatcher.messages[0].data.players[0].characterId, "u1");
};

const testJoinAllocatesDifferentSpawnCells = () => {
	const state = initState();
	const dispatcher = makeDispatcher();

	mapJoin({}, { info() {}, warn() {} }, {}, dispatcher, 0, state, [
		basePresence,
		secondPresence,
	]);

	const players = dispatcher.messages[0].data.players;
	assert.equal(players.length, 2);
	assert.notDeepEqual(
		{ x: players[0].x, y: players[0].y },
		{ x: players[1].x, y: players[1].y },
	);
};

const testLeaveBroadcastsUpdatedMapState = () => {
	const state = initState();
	const dispatcher = makeDispatcher();
	mapJoin({}, { info() {}, warn() {} }, {}, dispatcher, 0, state, [
		basePresence,
		secondPresence,
	]);

	dispatcher.messages.length = 0;
	mapLeave({}, { info() {} }, {}, dispatcher, 1, state, [secondPresence]);

	assert.equal(dispatcher.messages.length, 1);
	assert.equal(dispatcher.messages[0].opCode, OPS.MAP_STATE);
	assert.equal(dispatcher.messages[0].data.players.length, 1);
	assert.equal(dispatcher.messages[0].data.players[0].characterId, "u1");
};

const testMoveAccepted = () => {
	const state = initState();
	const dispatcher = makeDispatcher();
	mapJoin({}, { info() {}, warn() {} }, {}, dispatcher, 0, state, [
		basePresence,
	]);
	dispatcher.messages.length = 0;

	mapLoop({}, { info() {} }, {}, dispatcher, 1, state, [
		{
			opCode: OPS.MOVE_REQUEST,
			data: JSON.stringify({ to: { x: 1, y: 0 } }),
			sender: basePresence,
		},
	]);

	assert.equal(dispatcher.messages.length, 1);
	assert.equal(dispatcher.messages[0].opCode, OPS.MOVE_RESULT);
	assert.equal(dispatcher.messages[0].data.accepted, true);
	assert.equal(dispatcher.messages[0].data.reason, null);
	assert.deepEqual(dispatcher.messages[0].data.from, { x: 0, y: 0 });
	assert.deepEqual(dispatcher.messages[0].data.to, { x: 1, y: 0 });
};

const testMoveRejectedWhenTooFastSameTick = () => {
	const state = initState();
	const dispatcher = makeDispatcher();
	mapJoin({}, { info() {}, warn() {} }, {}, dispatcher, 0, state, [
		basePresence,
	]);
	dispatcher.messages.length = 0;

	mapLoop({}, { info() {} }, {}, dispatcher, 5, state, [
		{
			opCode: OPS.MOVE_REQUEST,
			data: JSON.stringify({ to: { x: 1, y: 0 } }),
			sender: basePresence,
		},
		{
			opCode: OPS.MOVE_REQUEST,
			data: JSON.stringify({ to: { x: 2, y: 0 } }),
			sender: basePresence,
		},
	]);

	assert.equal(dispatcher.messages.length, 2);
	assert.equal(dispatcher.messages[0].data.accepted, true);
	assert.equal(dispatcher.messages[1].data.accepted, false);
	assert.equal(dispatcher.messages[1].data.reason, "TOO_FAST");
};

const testMoveRejectedOutsideBounds = () => {
	const state = initState();
	const dispatcher = makeDispatcher();
	mapJoin({}, { info() {}, warn() {} }, {}, dispatcher, 0, state, [
		basePresence,
	]);
	dispatcher.messages.length = 0;

	mapLoop({}, { info() {} }, {}, dispatcher, 2, state, [
		{
			opCode: OPS.MOVE_REQUEST,
			data: JSON.stringify({ to: { x: -1, y: 0 } }),
			sender: basePresence,
		},
	]);

	assert.equal(dispatcher.messages[0].data.accepted, false);
	assert.equal(dispatcher.messages[0].data.reason, "INVALID_CELL");
};

const testMoveRejectedWhenTooFar = () => {
	const state = initState();
	const dispatcher = makeDispatcher();
	mapJoin({}, { info() {}, warn() {} }, {}, dispatcher, 0, state, [
		basePresence,
	]);
	dispatcher.messages.length = 0;

	mapLoop({}, { info() {} }, {}, dispatcher, 9, state, [
		{
			opCode: OPS.MOVE_REQUEST,
			data: JSON.stringify({ to: { x: 3, y: 0 } }),
			sender: basePresence,
		},
	]);

	assert.equal(dispatcher.messages[0].data.accepted, false);
	assert.equal(dispatcher.messages[0].data.reason, "TOO_FAR");
};

const testMoveRejectedWhenCellOccupied = () => {
	const state = initState();
	const dispatcher = makeDispatcher();
	mapJoin({}, { info() {}, warn() {} }, {}, dispatcher, 0, state, [
		basePresence,
		secondPresence,
	]);
	dispatcher.messages.length = 0;

	mapLoop({}, { info() {} }, {}, dispatcher, 4, state, [
		{
			opCode: OPS.MOVE_REQUEST,
			data: JSON.stringify({ to: { x: 1, y: 0 } }),
			sender: basePresence,
		},
	]);

	assert.equal(dispatcher.messages[0].data.accepted, false);
	assert.equal(dispatcher.messages[0].data.reason, "CELL_OCCUPIED");
};

const run = () => {
	testJoinBroadcastsMapState();
	testJoinAllocatesDifferentSpawnCells();
	testLeaveBroadcastsUpdatedMapState();
	testMoveAccepted();
	testMoveRejectedWhenTooFastSameTick();
	testMoveRejectedOutsideBounds();
	testMoveRejectedWhenTooFar();
	testMoveRejectedWhenCellOccupied();
	console.log("map_match tests passed");
};

run();
