const mapMatch = require("./map_match");

const InitModule = (ctx, logger, nk, initializer) => {
	initializer.registerMatch("astralis.map", {
		matchInit: mapMatch.mapInit,
		matchJoinAttempt: mapMatch.mapJoinAttempt,
		matchJoin: mapMatch.mapJoin,
		matchLeave: mapMatch.mapLeave,
		matchLoop: mapMatch.mapLoop,
		matchTerminate: mapMatch.mapTerminate,
		matchSignal: (ctx, logger, nk, dispatcher, tick, state, data) => ({
			state,
			data,
		}),
	});

	logger.info("Astralis Nakama modules loaded.");
};

global.InitModule = InitModule;
