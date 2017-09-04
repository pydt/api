require("source-map-support").install();
require("reflect-metadata");
(function(e, a) { for(var i in a) e[i] = a[i]; }(exports, /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 15);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var AWS = __webpack_require__(5);
AWS.config.update({ region: 'us-east-1' });
var Config = /** @class */ (function () {
    function Config() {
    }
    Config.activeStage = function () {
        return process.env.SERVERLESS_STAGE;
    };
    Config.resourcePrefix = function () {
        return process.env.RESOURCE_PREFIX;
    };
    Config.webUrl = function () {
        return process.env.WEB_URL;
    };
    Config.jwtSecret = function () {
        return process.env.JWT_SECRET;
    };
    Config.discourseApiKey = function () {
        return process.env.DISCOURSE_API_KEY;
    };
    Config.steamApiKey = function () {
        return process.env.STEAM_API_KEY;
    };
    return Config;
}());
exports.Config = Config;


/***/ }),
/* 1 */
/***/ (function(module, exports) {

module.exports = require("lodash");

/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
__export(__webpack_require__(21));
__export(__webpack_require__(22));
__export(__webpack_require__(23));
__export(__webpack_require__(24));


/***/ }),
/* 3 */
/***/ (function(module, exports) {

module.exports = require("tsoa");

/***/ }),
/* 4 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var inversify_1 = __webpack_require__(18);
exports.inject = inversify_1.inject;
var inversify_binding_decorators_1 = __webpack_require__(19);
exports.autoProvide = inversify_binding_decorators_1.autoProvide;
var iocContainer = new inversify_1.Container();
exports.iocContainer = iocContainer;
var provide = inversify_binding_decorators_1.makeProvideDecorator(iocContainer);
exports.provide = provide;
var fluentProvider = inversify_binding_decorators_1.makeFluentProvideDecorator(iocContainer);
var provideNamed = function (identifier, name) {
    return fluentProvider(identifier)
        .whenTargetNamed(name)
        .done();
};
exports.provideNamed = provideNamed;
var provideSingleton = function (identifier) {
    return fluentProvider(identifier)
        .inSingletonScope()
        .done();
};
exports.provideSingleton = provideSingleton;


/***/ }),
/* 5 */
/***/ (function(module, exports) {

module.exports = require("aws-sdk");

/***/ }),
/* 6 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var common_1 = __webpack_require__(8);
var config_1 = __webpack_require__(0);
var _ = __webpack_require__(1);
exports.userRepository = common_1.dynamoose.createVersionedModel(config_1.Config.resourcePrefix() + 'user', {
    steamId: {
        type: String,
        hashKey: true
    },
    displayName: {
        type: String,
        required: true
    },
    avatarSmall: String,
    avatarMedium: String,
    avatarFull: String,
    emailAddress: String,
    activeGameIds: [String],
    inactiveGameIds: [String],
    turnsPlayed: {
        type: Number,
        default: 0
    },
    turnsSkipped: {
        type: Number,
        default: 0
    },
    timeTaken: {
        type: Number,
        default: 0
    },
    fastTurns: {
        type: Number,
        default: 0
    },
    slowTurns: {
        type: Number,
        default: 0
    }
});
exports.userRepository.createS3GameCacheKey = function (steamId) {
    return steamId + '/' + 'gameCache.json';
};
exports.userRepository.getUsersForGame = function (game) {
    var steamIds = _.compact(_.map(game.players, 'steamId'));
    return exports.userRepository.batchGet(steamIds).then(function (users) {
        // make sure they're sorted correctly...
        var playersWithSteamIds = _.filter(game.players, function (player) {
            return !!player.steamId;
        });
        return _.map(playersWithSteamIds, function (player) {
            return _.find(users, function (user) {
                return user.steamId === player.steamId;
            });
        });
    });
};


/***/ }),
/* 7 */
/***/ (function(module, exports) {

module.exports = require("winston");

/***/ }),
/* 8 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var baseDynamoose = __webpack_require__(27);
var _ = __webpack_require__(1);
baseDynamoose.setDefaults({
    create: false
});
exports.dynamoose = _.merge(baseDynamoose, {
    createVersionedModel: function (name, schema) {
        schema.version = {
            type: Number,
            default: 0,
            set: function (value) {
                return value + 1;
            }
        };
        var model = baseDynamoose.model(name, new baseDynamoose.Schema(schema, { timestamps: true }));
        model.saveVersioned = function (m) {
            if (!(m instanceof model)) {
                m = new model(m);
            }
            return m.save({
                condition: 'attribute_not_exists(version) OR version = :version',
                conditionValues: { version: (m.version || 0) - 1 }
            });
        };
        return model;
    }
});


/***/ }),
/* 9 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var common_1 = __webpack_require__(8);
var config_1 = __webpack_require__(0);
var _ = __webpack_require__(1);
var internalGameRepository = common_1.dynamoose.createVersionedModel(config_1.Config.resourcePrefix() + 'game', {
    gameId: {
        type: String,
        hashKey: true,
        required: true
    },
    createdBySteamId: {
        type: String,
        required: true
    },
    dlc: [String],
    inProgress: Boolean,
    completed: Boolean,
    hashedPassword: String,
    displayName: {
        type: String,
        required: true
    },
    allowJoinAfterStart: Boolean,
    description: String,
    slots: Number,
    humans: Number,
    players: [
        {
            steamId: String,
            civType: String,
            hasSurrendered: Boolean,
            turnsPlayed: {
                type: Number,
                default: 0
            },
            turnsSkipped: {
                type: Number,
                default: 0
            },
            timeTaken: {
                type: Number,
                default: 0
            },
            fastTurns: {
                type: Number,
                default: 0
            },
            slowTurns: {
                type: Number,
                default: 0
            }
        }
    ],
    discourseTopicId: Number,
    currentPlayerSteamId: {
        type: String,
        required: true
    },
    turnTimerMinutes: Number,
    round: {
        type: Number,
        required: true,
        default: 1
    },
    gameTurnRangeKey: {
        type: Number,
        required: true,
        default: 1
    },
    gameSpeed: String,
    mapFile: String,
    mapSize: String
});
exports.gameRepository = internalGameRepository;
if (!internalGameRepository.origBatchGet) {
    internalGameRepository.origBatchGet = internalGameRepository.batchGet;
}
exports.gameRepository.batchGet = function (gameKeys) {
    return internalGameRepository.origBatchGet(gameKeys).then(function (games) {
        return _.orderBy(games, ['createdAt'], ['desc']);
    });
};
exports.gameRepository.getGamesForUser = function (user) {
    var gameKeys = user.activeGameIds || [];
    if (gameKeys.length > 0) {
        return exports.gameRepository.batchGet(gameKeys);
    }
    else {
        return Promise.resolve([]);
    }
};


/***/ }),
/* 10 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var config_1 = __webpack_require__(0);
var passport = __webpack_require__(25);
var passportSteam = __webpack_require__(26);
var rp = __webpack_require__(11);
passport.use(new passportSteam.Strategy({
    returnURL: config_1.Config.webUrl() + '/steamreturn',
    realm: config_1.Config.webUrl(),
    apiKey: config_1.Config.steamApiKey()
}, function (identifier, profile, done) {
    done(null, {
        identifier: identifier,
        profile: profile
    });
}));
exports.steamPassport = passport;
function getPlayerSummaries(steamIds) {
    return rp({
        uri: "http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=" + config_1.Config.steamApiKey() + "&steamids=" + steamIds,
        json: true
    }).then(function (resp) {
        return resp.response.players;
    });
}
exports.getPlayerSummaries = getPlayerSummaries;
;


/***/ }),
/* 11 */
/***/ (function(module, exports) {

module.exports = require("request-promise");

/***/ }),
/* 12 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var jwt = __webpack_require__(28);
var config_1 = __webpack_require__(0);
var JwtUtil;
(function (JwtUtil) {
    function createToken(payload) {
        return jwt.sign(payload, config_1.Config.jwtSecret());
    }
    JwtUtil.createToken = createToken;
    function parseToken(token) {
        return jwt.verify(token, config_1.Config.jwtSecret());
    }
    JwtUtil.parseToken = parseToken;
})(JwtUtil = exports.JwtUtil || (exports.JwtUtil = {}));


/***/ }),
/* 13 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
__export(__webpack_require__(31));


/***/ }),
/* 14 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var rp = __webpack_require__(11);
var config_1 = __webpack_require__(0);
var winston = __webpack_require__(7);
function addDiscourseGameTopic(game) {
    if (config_1.Config.activeStage() === 'prod') {
        return rp({
            method: 'POST',
            uri: "https://discourse.playyourdamnturn.com/posts/?api_key=" + config_1.Config.discourseApiKey() + "&api_username=system",
            form: {
                title: game.displayName + " (" + game.gameId.substring(0, 8) + ")",
                raw: "Smack talk goes here for " + game.displayName + "!  Game URL: https://playyourdamnturn.com/game/" + game.gameId,
                category: 5
            },
            json: true
        });
    }
    else {
        winston.info("Ignoring request to create discourse topic for game " + game.displayName + ", stage is " + config_1.Config.activeStage());
        return Promise.resolve();
    }
}
exports.addDiscourseGameTopic = addDiscourseGameTopic;
;
function deleteDiscourseGameTopic(game) {
    if (config_1.Config.activeStage() === 'prod') {
        return rp({
            method: 'DELETE',
            uri: "https://discourse.playyourdamnturn.com/t/" + game.discourseTopicId + "?api_key=" + config_1.Config.discourseApiKey() + "&api_username=system",
            json: true
        });
    }
    else {
        winston.info("Ignoring request to delete discourse topic for game " + game.displayName + ", stage is " + config_1.Config.activeStage());
        return Promise.resolve();
    }
}
exports.deleteDiscourseGameTopic = deleteDiscourseGameTopic;
;


/***/ }),
/* 15 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = __webpack_require__(16);
var routes_1 = __webpack_require__(17);
var framework_1 = __webpack_require__(2);
var logging_1 = __webpack_require__(43);
var winston = __webpack_require__(7);
logging_1.configureLogging();
var router = express_1.Router();
router.get('/swagger.json', function (req, res) {
    res.status(200).json(__webpack_require__(45));
});
function methodHandler(method) {
    return function (route) {
        var routeExecs = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            routeExecs[_i - 1] = arguments[_i];
        }
        router[method](route, function (req, res) {
            winston.info("Found route " + route);
            var runNext = function (runExecs) {
                var curExec = runExecs[0];
                curExec(req, res, function (err) {
                    if (err) {
                        var status = 500;
                        var message = 'There was an error processing your request.';
                        var logError = true;
                        if (err.constructor.name === 'InvalidRequestException') {
                            // TODO: These probably shouldn't go to an end user, they come from TSOA and look like:
                            // 'landingPageURL' is a required undefined parameter.
                            status = err.status;
                            message = err.message;
                            logError = false;
                        }
                        if (err instanceof framework_1.HttpResponseError) {
                            status = err.statusCode;
                            message = err.message;
                            logError = false;
                        }
                        if (logError) {
                            winston.error(err);
                        }
                        res.status(status).json(new framework_1.ErrorResponse(message));
                    }
                    else if (runExecs.length > 1) {
                        runNext(runExecs.slice(1));
                    }
                });
            };
            runNext(routeExecs);
        });
    };
}
var mockApp = {
    delete: methodHandler('delete'),
    get: methodHandler('get'),
    patch: methodHandler('patch'),
    post: methodHandler('post'),
    put: methodHandler('put')
};
routes_1.RegisterRoutes(mockApp);
function handler(event, context, callback) {
    // Typeorm will prevent the event loop from emptying
    context.callbackWaitsForEmptyEventLoop = false;
    winston.info("handling " + event.httpMethod + " " + event.path);
    var response = new framework_1.HttpResponse(callback);
    if (event.httpMethod.toLowerCase() === 'options') {
        response.status(200).end();
    }
    else {
        router.handle(new framework_1.HttpRequest(event, response), response, function (err) {
            winston.info("404 for " + event.httpMethod + " " + event.path);
            response.status(404).json(new framework_1.ErrorResponse('Not Found'));
        });
    }
}
exports.handler = handler;
;


/***/ }),
/* 16 */
/***/ (function(module, exports) {

module.exports = require("express");

/***/ }),
/* 17 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
/* tslint:disable */
var tsoa_1 = __webpack_require__(3);
var ioc_1 = __webpack_require__(4);
var authController_1 = __webpack_require__(20);
var gameController_1 = __webpack_require__(30);
var userController_1 = __webpack_require__(40);
var usersController_1 = __webpack_require__(41);
var expressAuthentication_1 = __webpack_require__(42);
var models = {
    "AuthenticateResponse": {
        "properties": {
            "redirectURL": { "dataType": "string", "required": true },
        },
    },
    "SteamProfile": {
        "properties": {
            "steamid": { "dataType": "string", "required": true },
            "personaname": { "dataType": "string", "required": true },
            "profileurl": { "dataType": "string", "required": true },
            "avatar": { "dataType": "string", "required": true },
            "avatarmedium": { "dataType": "string", "required": true },
            "avatarfull": { "dataType": "string", "required": true },
        },
    },
    "ValidateResponse": {
        "properties": {
            "token": { "dataType": "string", "required": true },
            "steamProfile": { "ref": "SteamProfile", "required": true },
        },
    },
    "GamePlayer": {
        "properties": {
            "steamId": { "dataType": "string", "required": true },
            "civType": { "dataType": "string", "required": true },
            "hasSurrendered": { "dataType": "boolean" },
            "turnsPlayed": { "dataType": "double" },
            "turnsSkipped": { "dataType": "double" },
            "timeTaken": { "dataType": "double" },
            "fastTurns": { "dataType": "double" },
            "slowTurns": { "dataType": "double" },
        },
    },
    "Game": {
        "properties": {
            "gameId": { "dataType": "string", "required": true },
            "createdBySteamId": { "dataType": "string", "required": true },
            "inProgress": { "dataType": "boolean" },
            "hashedPassword": { "dataType": "string" },
            "players": { "dataType": "array", "array": { "ref": "GamePlayer" }, "required": true },
            "discourseTopicId": { "dataType": "double" },
            "currentPlayerSteamId": { "dataType": "string", "required": true },
            "turnTimerMinutes": { "dataType": "double" },
            "round": { "dataType": "double" },
            "gameTurnRangeKey": { "dataType": "double" },
            "completed": { "dataType": "boolean" },
            "createdAt": { "dataType": "datetime" },
            "updatedAt": { "dataType": "datetime" },
            "version": { "dataType": "double" },
            "displayName": { "dataType": "string", "required": true },
            "description": { "dataType": "string", "required": true },
            "dlc": { "dataType": "array", "array": { "dataType": "string" }, "required": true },
            "slots": { "dataType": "double", "required": true },
            "humans": { "dataType": "double", "required": true },
            "gameSpeed": { "dataType": "string", "required": true },
            "mapFile": { "dataType": "string", "required": true },
            "mapSize": { "dataType": "string", "required": true },
            "allowJoinAfterStart": { "dataType": "boolean" },
        },
    },
    "ErrorResponse": {
        "properties": {
            "message": { "dataType": "string", "required": true },
        },
    },
    "ChangeCivRequestBody": {
        "properties": {
            "playerCiv": { "dataType": "string", "required": true },
        },
    },
    "CreateGameRequestBody": {
        "properties": {
            "player1Civ": { "dataType": "string", "required": true },
            "password": { "dataType": "string", "required": true },
            "displayName": { "dataType": "string", "required": true },
            "description": { "dataType": "string", "required": true },
            "dlc": { "dataType": "array", "array": { "dataType": "string" }, "required": true },
            "slots": { "dataType": "double", "required": true },
            "humans": { "dataType": "double", "required": true },
            "gameSpeed": { "dataType": "string", "required": true },
            "mapFile": { "dataType": "string", "required": true },
            "mapSize": { "dataType": "string", "required": true },
            "allowJoinAfterStart": { "dataType": "boolean" },
        },
    },
    "GameRequestBody": {
        "properties": {
            "password": { "dataType": "string", "required": true },
            "displayName": { "dataType": "string", "required": true },
            "description": { "dataType": "string", "required": true },
            "dlc": { "dataType": "array", "array": { "dataType": "string" }, "required": true },
            "slots": { "dataType": "double", "required": true },
            "humans": { "dataType": "double", "required": true },
            "gameSpeed": { "dataType": "string", "required": true },
            "mapFile": { "dataType": "string", "required": true },
            "mapSize": { "dataType": "string", "required": true },
            "allowJoinAfterStart": { "dataType": "boolean" },
        },
    },
    "JoinGameRequestBody": {
        "properties": {
            "password": { "dataType": "string", "required": true },
            "playerCiv": { "dataType": "string", "required": true },
        },
    },
    "OpenGamesResponse": {
        "properties": {
            "notStarted": { "dataType": "array", "array": { "ref": "Game" }, "required": true },
            "openSlots": { "dataType": "array", "array": { "ref": "Game" }, "required": true },
        },
    },
    "SurrenderBody": {
        "properties": {
            "kickUserId": { "dataType": "string", "required": true },
        },
    },
    "GamesByUserResponse": {
        "properties": {
            "data": { "dataType": "array", "array": { "ref": "Game" }, "required": true },
            "pollUrl": { "dataType": "string", "required": true },
        },
    },
    "User": {
        "properties": {
            "steamId": { "dataType": "string", "required": true },
            "displayName": { "dataType": "string", "required": true },
            "avatarSmall": { "dataType": "string", "required": true },
            "avatarMedium": { "dataType": "string", "required": true },
            "avatarFull": { "dataType": "string", "required": true },
            "emailAddress": { "dataType": "string", "required": true },
            "activeGameIds": { "dataType": "array", "array": { "dataType": "string" }, "required": true },
            "inactiveGameIds": { "dataType": "array", "array": { "dataType": "string" }, "required": true },
            "turnsPlayed": { "dataType": "double", "required": true },
            "turnsSkipped": { "dataType": "double", "required": true },
            "timeTaken": { "dataType": "double", "required": true },
            "fastTurns": { "dataType": "double", "required": true },
            "slowTurns": { "dataType": "double", "required": true },
        },
    },
    "SetNotificationEmailBody": {
        "properties": {
            "emailAddress": { "dataType": "string", "required": true },
        },
    },
};
function RegisterRoutes(app) {
    app.get('/auth/steam', function (request, response, next) {
        var args = {};
        var validatedArgs = [];
        try {
            validatedArgs = getValidatedArgs(args, request);
        }
        catch (err) {
            return next(err);
        }
        var controller = ioc_1.iocContainer.get(authController_1.AuthController);
        var promise = controller.authenticate.apply(controller, validatedArgs);
        promiseHandler(controller, promise, response, next);
    });
    app.get('/auth/steam/validate', function (request, response, next) {
        var args = {
            request: { "in": "request", "name": "request", "required": true, "dataType": "object" },
        };
        var validatedArgs = [];
        try {
            validatedArgs = getValidatedArgs(args, request);
        }
        catch (err) {
            return next(err);
        }
        var controller = ioc_1.iocContainer.get(authController_1.AuthController);
        var promise = controller.validate.apply(controller, validatedArgs);
        promiseHandler(controller, promise, response, next);
    });
    app.post('/game/:gameId/changeCiv', authenticateMiddleware([{ "name": "api_key" }]), function (request, response, next) {
        var args = {
            request: { "in": "request", "name": "request", "required": true, "dataType": "object" },
            gameId: { "in": "path", "name": "gameId", "required": true, "dataType": "string" },
            body: { "in": "body", "name": "body", "required": true, "ref": "ChangeCivRequestBody" },
        };
        var validatedArgs = [];
        try {
            validatedArgs = getValidatedArgs(args, request);
        }
        catch (err) {
            return next(err);
        }
        var controller = ioc_1.iocContainer.get(gameController_1.GameController);
        var promise = controller.changeCiv.apply(controller, validatedArgs);
        promiseHandler(controller, promise, response, next);
    });
    app.post('/game/create', authenticateMiddleware([{ "name": "api_key" }]), function (request, response, next) {
        var args = {
            request: { "in": "request", "name": "request", "required": true, "dataType": "object" },
            body: { "in": "body", "name": "body", "required": true, "ref": "CreateGameRequestBody" },
        };
        var validatedArgs = [];
        try {
            validatedArgs = getValidatedArgs(args, request);
        }
        catch (err) {
            return next(err);
        }
        var controller = ioc_1.iocContainer.get(gameController_1.GameController);
        var promise = controller.create.apply(controller, validatedArgs);
        promiseHandler(controller, promise, response, next);
    });
    app.post('/game/:gameId/delete', authenticateMiddleware([{ "name": "api_key" }]), function (request, response, next) {
        var args = {
            request: { "in": "request", "name": "request", "required": true, "dataType": "object" },
            gameId: { "in": "path", "name": "gameId", "required": true, "dataType": "string" },
        };
        var validatedArgs = [];
        try {
            validatedArgs = getValidatedArgs(args, request);
        }
        catch (err) {
            return next(err);
        }
        var controller = ioc_1.iocContainer.get(gameController_1.GameController);
        var promise = controller.delete.apply(controller, validatedArgs);
        promiseHandler(controller, promise, response, next);
    });
    app.post('/game/:gameId/edit', authenticateMiddleware([{ "name": "api_key" }]), function (request, response, next) {
        var args = {
            request: { "in": "request", "name": "request", "required": true, "dataType": "object" },
            gameId: { "in": "path", "name": "gameId", "required": true, "dataType": "string" },
            body: { "in": "body", "name": "body", "required": true, "ref": "GameRequestBody" },
        };
        var validatedArgs = [];
        try {
            validatedArgs = getValidatedArgs(args, request);
        }
        catch (err) {
            return next(err);
        }
        var controller = ioc_1.iocContainer.get(gameController_1.GameController);
        var promise = controller.edit.apply(controller, validatedArgs);
        promiseHandler(controller, promise, response, next);
    });
    app.post('/game/:gameId/join', authenticateMiddleware([{ "name": "api_key" }]), function (request, response, next) {
        var args = {
            request: { "in": "request", "name": "request", "required": true, "dataType": "object" },
            gameId: { "in": "path", "name": "gameId", "required": true, "dataType": "string" },
            body: { "in": "body", "name": "body", "required": true, "ref": "JoinGameRequestBody" },
        };
        var validatedArgs = [];
        try {
            validatedArgs = getValidatedArgs(args, request);
        }
        catch (err) {
            return next(err);
        }
        var controller = ioc_1.iocContainer.get(gameController_1.GameController);
        var promise = controller.join.apply(controller, validatedArgs);
        promiseHandler(controller, promise, response, next);
    });
    app.post('/game/:gameId/leave', authenticateMiddleware([{ "name": "api_key" }]), function (request, response, next) {
        var args = {
            request: { "in": "request", "name": "request", "required": true, "dataType": "object" },
            gameId: { "in": "path", "name": "gameId", "required": true, "dataType": "string" },
        };
        var validatedArgs = [];
        try {
            validatedArgs = getValidatedArgs(args, request);
        }
        catch (err) {
            return next(err);
        }
        var controller = ioc_1.iocContainer.get(gameController_1.GameController);
        var promise = controller.leave.apply(controller, validatedArgs);
        promiseHandler(controller, promise, response, next);
    });
    app.get('/game/listOpen', function (request, response, next) {
        var args = {
            request: { "in": "request", "name": "request", "required": true, "dataType": "object" },
        };
        var validatedArgs = [];
        try {
            validatedArgs = getValidatedArgs(args, request);
        }
        catch (err) {
            return next(err);
        }
        var controller = ioc_1.iocContainer.get(gameController_1.GameController);
        var promise = controller.listOpen.apply(controller, validatedArgs);
        promiseHandler(controller, promise, response, next);
    });
    app.post('/game/:gameId/start', authenticateMiddleware([{ "name": "api_key" }]), function (request, response, next) {
        var args = {
            request: { "in": "request", "name": "request", "required": true, "dataType": "object" },
            gameId: { "in": "path", "name": "gameId", "required": true, "dataType": "string" },
        };
        var validatedArgs = [];
        try {
            validatedArgs = getValidatedArgs(args, request);
        }
        catch (err) {
            return next(err);
        }
        var controller = ioc_1.iocContainer.get(gameController_1.GameController);
        var promise = controller.start.apply(controller, validatedArgs);
        promiseHandler(controller, promise, response, next);
    });
    app.post('/game/:gameId/surrender', authenticateMiddleware([{ "name": "api_key" }]), function (request, response, next) {
        var args = {
            request: { "in": "request", "name": "request", "required": true, "dataType": "object" },
            gameId: { "in": "path", "name": "gameId", "required": true, "dataType": "string" },
            body: { "in": "body", "name": "body", "required": true, "ref": "SurrenderBody" },
        };
        var validatedArgs = [];
        try {
            validatedArgs = getValidatedArgs(args, request);
        }
        catch (err) {
            return next(err);
        }
        var controller = ioc_1.iocContainer.get(gameController_1.GameController);
        var promise = controller.surrender.apply(controller, validatedArgs);
        promiseHandler(controller, promise, response, next);
    });
    app.get('/game/:gameId', function (request, response, next) {
        var args = {
            request: { "in": "request", "name": "request", "required": true, "dataType": "object" },
            gameId: { "in": "path", "name": "gameId", "required": true, "dataType": "string" },
        };
        var validatedArgs = [];
        try {
            validatedArgs = getValidatedArgs(args, request);
        }
        catch (err) {
            return next(err);
        }
        var controller = ioc_1.iocContainer.get(gameController_1.GameController);
        var promise = controller.get.apply(controller, validatedArgs);
        promiseHandler(controller, promise, response, next);
    });
    app.get('/user/games', authenticateMiddleware([{ "name": "api_key" }]), function (request, response, next) {
        var args = {
            request: { "in": "request", "name": "request", "required": true, "dataType": "object" },
        };
        var validatedArgs = [];
        try {
            validatedArgs = getValidatedArgs(args, request);
        }
        catch (err) {
            return next(err);
        }
        var controller = ioc_1.iocContainer.get(userController_1.UserController);
        var promise = controller.games.apply(controller, validatedArgs);
        promiseHandler(controller, promise, response, next);
    });
    app.get('/user/', authenticateMiddleware([{ "name": "api_key" }]), function (request, response, next) {
        var args = {
            request: { "in": "request", "name": "request", "required": true, "dataType": "object" },
        };
        var validatedArgs = [];
        try {
            validatedArgs = getValidatedArgs(args, request);
        }
        catch (err) {
            return next(err);
        }
        var controller = ioc_1.iocContainer.get(userController_1.UserController);
        var promise = controller.all.apply(controller, validatedArgs);
        promiseHandler(controller, promise, response, next);
    });
    app.get('/user/getCurrent', authenticateMiddleware([{ "name": "api_key" }]), function (request, response, next) {
        var args = {
            request: { "in": "request", "name": "request", "required": true, "dataType": "object" },
        };
        var validatedArgs = [];
        try {
            validatedArgs = getValidatedArgs(args, request);
        }
        catch (err) {
            return next(err);
        }
        var controller = ioc_1.iocContainer.get(userController_1.UserController);
        var promise = controller.getCurrent.apply(controller, validatedArgs);
        promiseHandler(controller, promise, response, next);
    });
    app.post('/user/setNotificationEmail', authenticateMiddleware([{ "name": "api_key" }]), function (request, response, next) {
        var args = {
            request: { "in": "request", "name": "request", "required": true, "dataType": "object" },
            body: { "in": "body", "name": "body", "required": true, "ref": "SetNotificationEmailBody" },
        };
        var validatedArgs = [];
        try {
            validatedArgs = getValidatedArgs(args, request);
        }
        catch (err) {
            return next(err);
        }
        var controller = ioc_1.iocContainer.get(userController_1.UserController);
        var promise = controller.setNotificationEmail.apply(controller, validatedArgs);
        promiseHandler(controller, promise, response, next);
    });
    app.get('/user/steamProfile', authenticateMiddleware([{ "name": "api_key" }]), function (request, response, next) {
        var args = {
            request: { "in": "request", "name": "request", "required": true, "dataType": "object" },
        };
        var validatedArgs = [];
        try {
            validatedArgs = getValidatedArgs(args, request);
        }
        catch (err) {
            return next(err);
        }
        var controller = ioc_1.iocContainer.get(userController_1.UserController);
        var promise = controller.steamProfile.apply(controller, validatedArgs);
        promiseHandler(controller, promise, response, next);
    });
    app.get('/user/steamProfiles', function (request, response, next) {
        var args = {
            rawSteamIds: { "in": "query", "name": "steamIds", "required": true, "dataType": "string" },
        };
        var validatedArgs = [];
        try {
            validatedArgs = getValidatedArgs(args, request);
        }
        catch (err) {
            return next(err);
        }
        var controller = ioc_1.iocContainer.get(userController_1.UserController);
        var promise = controller.steamProfiles.apply(controller, validatedArgs);
        promiseHandler(controller, promise, response, next);
    });
    app.get('/user/:steamId', function (request, response, next) {
        var args = {
            request: { "in": "request", "name": "request", "required": true, "dataType": "object" },
            steamId: { "in": "path", "name": "steamId", "required": true, "dataType": "string" },
        };
        var validatedArgs = [];
        try {
            validatedArgs = getValidatedArgs(args, request);
        }
        catch (err) {
            return next(err);
        }
        var controller = ioc_1.iocContainer.get(userController_1.UserController);
        var promise = controller.byId.apply(controller, validatedArgs);
        promiseHandler(controller, promise, response, next);
    });
    app.get('/users/', function (request, response, next) {
        var args = {
            request: { "in": "request", "name": "request", "required": true, "dataType": "object" },
        };
        var validatedArgs = [];
        try {
            validatedArgs = getValidatedArgs(args, request);
        }
        catch (err) {
            return next(err);
        }
        var controller = ioc_1.iocContainer.get(usersController_1.UsersController);
        var promise = controller.all.apply(controller, validatedArgs);
        promiseHandler(controller, promise, response, next);
    });
    function authenticateMiddleware(security) {
        if (security === void 0) { security = []; }
        return function (request, response, next) {
            var responded = 0;
            var success = false;
            for (var _i = 0, security_1 = security; _i < security_1.length; _i++) {
                var secMethod = security_1[_i];
                expressAuthentication_1.expressAuthentication(request, secMethod.name, secMethod.scopes).then(function (user) {
                    // only need to respond once
                    if (!success) {
                        success = true;
                        responded++;
                        request['user'] = user;
                        next();
                    }
                })
                    .catch(function (error) {
                    responded++;
                    if (responded == security.length && !success) {
                        response.status(401);
                        next(error);
                    }
                });
            }
        };
    }
    function promiseHandler(controllerObj, promise, response, next) {
        return Promise.resolve(promise)
            .then(function (data) {
            var statusCode;
            if (controllerObj instanceof tsoa_1.Controller) {
                var controller = controllerObj;
                var headers_1 = controller.getHeaders();
                Object.keys(headers_1).forEach(function (name) {
                    response.set(name, headers_1[name]);
                });
                statusCode = controller.getStatus();
            }
            if (data) {
                response.status(statusCode | 200).json(data);
            }
            else {
                response.status(statusCode | 204).end();
            }
        })
            .catch(function (error) { return next(error); });
    }
    function getValidatedArgs(args, request) {
        var fieldErrors = {};
        var values = Object.keys(args).map(function (key) {
            var name = args[key].name;
            switch (args[key].in) {
                case 'request':
                    return request;
                case 'query':
                    return tsoa_1.ValidateParam(args[key], request.query[name], models, name, fieldErrors);
                case 'path':
                    return tsoa_1.ValidateParam(args[key], request.params[name], models, name, fieldErrors);
                case 'header':
                    return tsoa_1.ValidateParam(args[key], request.header(name), models, name, fieldErrors);
                case 'body':
                    return tsoa_1.ValidateParam(args[key], request.body, models, name, fieldErrors, name + '.');
                case 'body-prop':
                    return tsoa_1.ValidateParam(args[key], request.body[name], models, name, fieldErrors, 'body.');
            }
        });
        if (Object.keys(fieldErrors).length > 0) {
            throw new tsoa_1.ValidateError(fieldErrors, '');
        }
        return values;
    }
}
exports.RegisterRoutes = RegisterRoutes;


/***/ }),
/* 18 */
/***/ (function(module, exports) {

module.exports = require("inversify");

/***/ }),
/* 19 */
/***/ (function(module, exports) {

module.exports = require("inversify-binding-decorators");

/***/ }),
/* 20 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
var framework_1 = __webpack_require__(2);
var tsoa_1 = __webpack_require__(3);
var ioc_1 = __webpack_require__(4);
var steamUtil_1 = __webpack_require__(10);
var userRepository_1 = __webpack_require__(6);
var jwtUtil_1 = __webpack_require__(12);
var winston = __webpack_require__(7);
var querystring = __webpack_require__(29);
var AuthController = /** @class */ (function () {
    function AuthController() {
    }
    AuthController_1 = AuthController;
    AuthController.prototype.authenticate = function () {
        return new Promise(function (resolve, reject) {
            var location = null;
            // Since passport expects to work with something like express,
            // mock the req/res/next middleware format...
            var req = {};
            var res = {
                setHeader: function (key, value) {
                    if (key === 'Location') {
                        location = value;
                    }
                },
                end: function () {
                    resolve({
                        redirectURL: location
                    });
                }
            };
            var next = function () {
                // Nothing to do here
            };
            steamUtil_1.steamPassport.authenticate('steam', function (err, user, info) {
                if (err) {
                    reject(err);
                }
                else {
                    winston.info('Callback called without error?', user, info);
                }
            })(req, res, next);
        });
    };
    AuthController.prototype.validate = function (request) {
        return new Promise(function (resolve, reject) {
            var req = {
                query: request.query,
                url: '/blah?' + querystring.stringify(request.query)
            };
            var res = {
                setHeader: function (key, value) {
                    if (key === 'Location') {
                        // We shouldn't get here in validate...
                        reject(new framework_1.HttpResponseError(400, 'Bad Request'));
                    }
                }
            };
            var next = function () {
                // We shouldn't get here in validate...
                reject(new framework_1.HttpResponseError(400, 'Bad Request'));
            };
            steamUtil_1.steamPassport.authenticate('steam', function (err, user, info) {
                if (err) {
                    reject(err);
                }
                else {
                    userRepository_1.userRepository.get(user.profile.id).then(function (dbUser) {
                        if (!dbUser) {
                            dbUser = {
                                steamId: user.profile.id
                            };
                        }
                        var steamProfile = user.profile._json;
                        dbUser.displayName = user.profile.displayName;
                        dbUser.avatarSmall = steamProfile.avatar;
                        dbUser.avatarMedium = steamProfile.avatarmedium;
                        dbUser.avatarFull = steamProfile.avatarfull;
                        return userRepository_1.userRepository.saveVersioned(dbUser);
                    }).then(function () {
                        resolve({
                            token: jwtUtil_1.JwtUtil.createToken({ steamId: user.profile.id }),
                            steamProfile: user.profile._json
                        });
                    }).catch(function (perr) {
                        reject(perr);
                    });
                }
            })(req, res, next);
        });
    };
    __decorate([
        tsoa_1.Get('steam'),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", []),
        __metadata("design:returntype", Promise)
    ], AuthController.prototype, "authenticate", null);
    __decorate([
        tsoa_1.Get('steam/validate'),
        __param(0, tsoa_1.Request()),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [framework_1.HttpRequest]),
        __metadata("design:returntype", Promise)
    ], AuthController.prototype, "validate", null);
    AuthController = AuthController_1 = __decorate([
        tsoa_1.Route('auth'),
        ioc_1.provideSingleton(AuthController_1)
    ], AuthController);
    return AuthController;
    var AuthController_1;
}());
exports.AuthController = AuthController;


/***/ }),
/* 21 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var ErrorResponse = /** @class */ (function () {
    function ErrorResponse(message) {
        this.message = message;
    }
    return ErrorResponse;
}());
exports.ErrorResponse = ErrorResponse;


/***/ }),
/* 22 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var _ = __webpack_require__(1);
var HttpRequest = /** @class */ (function () {
    // HACK: We pass in response here to work around limitations in the TSOA framework,
    // when they make it easier to create your own templates for authentication we can
    // revisit this.
    function HttpRequest(event, response) {
        this.response = response;
        if (event.body) {
            this.body = JSON.parse(event.body);
        }
        this.headers = _.reduce(event.headers || {}, function (result, value, key) {
            result[key.toLowerCase()] = value;
            return result;
        }, {});
        this.method = event.httpMethod;
        this.params = event.pathParameters;
        this.query = event.queryStringParameters;
        this.url = event.path;
    }
    return HttpRequest;
}());
exports.HttpRequest = HttpRequest;


/***/ }),
/* 23 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var HttpResponse = /** @class */ (function () {
    function HttpResponse(callback) {
        this.callback = callback;
        this.headers = {
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            'Access-Control-Expose-Headers': 'Authorization',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, HEAD, POST, PUT, DELETE, OPTIONS, PATCH'
        };
    }
    HttpResponse.prototype.json = function (data) {
        this.data = data;
        this.end();
    };
    HttpResponse.prototype.status = function (code) {
        this.statusCode = code;
        return this;
    };
    HttpResponse.prototype.addHeader = function (name, value) {
        this.headers[name] = value;
    };
    HttpResponse.prototype.end = function () {
        if (this.callback) {
            this.callback(null, {
                body: JSON.stringify(this.data),
                headers: this.headers,
                statusCode: this.statusCode,
            });
            this.callback = null;
        }
    };
    return HttpResponse;
}());
exports.HttpResponse = HttpResponse;


/***/ }),
/* 24 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var HttpResponseError = /** @class */ (function (_super) {
    __extends(HttpResponseError, _super);
    function HttpResponseError(statusCode, message) {
        var _this = _super.call(this, message) || this;
        _this.statusCode = statusCode;
        // Set the prototype explicitly:
        // tslint:disable-next-line
        // https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
        Object.setPrototypeOf(_this, HttpResponseError.prototype);
        return _this;
    }
    HttpResponseError.createUnauthorized = function () {
        return new HttpResponseError(401, 'Unauthorized');
    };
    return HttpResponseError;
}(Error));
exports.HttpResponseError = HttpResponseError;


/***/ }),
/* 25 */
/***/ (function(module, exports) {

module.exports = require("passport");

/***/ }),
/* 26 */
/***/ (function(module, exports) {

module.exports = require("passport-steam");

/***/ }),
/* 27 */
/***/ (function(module, exports) {

module.exports = require("dynamoose");

/***/ }),
/* 28 */
/***/ (function(module, exports) {

module.exports = require("jsonwebtoken");

/***/ }),
/* 29 */
/***/ (function(module, exports) {

module.exports = require("querystring");

/***/ }),
/* 30 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var tsoa_1 = __webpack_require__(3);
var ioc_1 = __webpack_require__(4);
var models_1 = __webpack_require__(13);
var userRepository_1 = __webpack_require__(6);
var framework_1 = __webpack_require__(2);
var gameRepository_1 = __webpack_require__(9);
var discourse_1 = __webpack_require__(14);
var gameService_1 = __webpack_require__(32);
var gameTurnRepository_1 = __webpack_require__(33);
var sns_1 = __webpack_require__(37);
var config_1 = __webpack_require__(0);
var _ = __webpack_require__(1);
var uuid = __webpack_require__(38);
var bcrypt = __webpack_require__(39);
var AWS = __webpack_require__(5);
var ses = new AWS.SES();
var GameController = /** @class */ (function () {
    function GameController() {
    }
    GameController_1 = GameController;
    GameController.prototype.changeCiv = function (request, gameId, body) {
        return __awaiter(this, void 0, void 0, function () {
            var game, player;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, gameRepository_1.gameRepository.get(gameId)];
                    case 1:
                        game = _a.sent();
                        if (game.inProgress) {
                            throw new framework_1.HttpResponseError(400, 'Game in Progress');
                        }
                        if (body.playerCiv !== 'LEADER_RANDOM' && _.map(game.players, 'civType').indexOf(body.playerCiv) >= 0) {
                            throw new framework_1.HttpResponseError(400, 'Civ already in Game');
                        }
                        player = _.find(game.players, function (p) {
                            return p.steamId === request.user.steamId;
                        });
                        if (!player) {
                            throw new framework_1.HttpResponseError(400, 'Player not in Game');
                        }
                        player.civType = body.playerCiv;
                        return [2 /*return*/, gameRepository_1.gameRepository.saveVersioned(game)];
                }
            });
        });
    };
    GameController.prototype.create = function (request, body) {
        return __awaiter(this, void 0, void 0, function () {
            var user, games, hasFormingGame, newGame, topic, salt, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, userRepository_1.userRepository.get(request.user.steamId)];
                    case 1:
                        user = _b.sent();
                        if (!user.emailAddress) {
                            throw new framework_1.HttpResponseError(400, 'You need to set a notification email address before you can create a game.');
                        }
                        return [4 /*yield*/, gameRepository_1.gameRepository.getGamesForUser(user)];
                    case 2:
                        games = _b.sent();
                        hasFormingGame = _.some(games, function (game) {
                            return game.createdBySteamId === request.user.steamId && !game.inProgress;
                        });
                        if (hasFormingGame) {
                            throw new framework_1.HttpResponseError(400, "You cannot create a new game at the moment because you already have one game that hasn't been started yet!");
                        }
                        newGame = {
                            gameId: uuid.v4(),
                            createdBySteamId: user.steamId,
                            currentPlayerSteamId: user.steamId,
                            dlc: body.dlc,
                            players: [{
                                    steamId: user.steamId,
                                    civType: body.player1Civ
                                }],
                            displayName: body.displayName,
                            description: body.description,
                            slots: body.slots,
                            humans: body.humans,
                            gameSpeed: body.gameSpeed,
                            mapFile: body.mapFile,
                            mapSize: body.mapSize
                        };
                        return [4 /*yield*/, discourse_1.addDiscourseGameTopic(newGame)];
                    case 3:
                        topic = _b.sent();
                        if (topic) {
                            newGame.discourseTopicId = topic.topic_id;
                        }
                        if (!body.password) return [3 /*break*/, 6];
                        return [4 /*yield*/, bcrypt.genSalt(10)];
                    case 4:
                        salt = _b.sent();
                        _a = newGame;
                        return [4 /*yield*/, bcrypt.hash(body.password, salt)];
                    case 5:
                        _a.hashedPassword = _b.sent();
                        _b.label = 6;
                    case 6: return [4 /*yield*/, gameRepository_1.gameRepository.saveVersioned(newGame)];
                    case 7:
                        _b.sent();
                        user.activeGameIds = user.activeGameIds || [];
                        user.activeGameIds.push(newGame.gameId);
                        return [4 /*yield*/, userRepository_1.userRepository.saveVersioned(user)];
                    case 8:
                        _b.sent();
                        return [2 /*return*/, newGame];
                }
            });
        });
    };
    GameController.prototype.delete = function (request, gameId) {
        return __awaiter(this, void 0, void 0, function () {
            var game;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, gameRepository_1.gameRepository.get(gameId)];
                    case 1:
                        game = _a.sent();
                        if (game.createdBySteamId !== request.user.steamId) {
                            throw new framework_1.HttpResponseError(400, 'Only the creator of the game can delete the game!');
                        }
                        if (game.inProgress && game.gameTurnRangeKey > 1) {
                            throw new framework_1.HttpResponseError(400, "Can't delete an in progress game!");
                        }
                        return [4 /*yield*/, gameService_1.deleteGame(game, request.user.steamId)];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    GameController.prototype.edit = function (request, gameId, body) {
        return __awaiter(this, void 0, void 0, function () {
            var game, salt, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, gameRepository_1.gameRepository.get(gameId)];
                    case 1:
                        game = _b.sent();
                        if (game.createdBySteamId !== request.user.steamId) {
                            throw new framework_1.HttpResponseError(400, "You didn't create this game!");
                        }
                        if (game.slots < game.players.length) {
                            throw new framework_1.HttpResponseError(400, "You can't change the number of slots to less than the current number of players!");
                        }
                        if (game.humans < game.players.length) {
                            throw new framework_1.HttpResponseError(400, "You can't change the number of humans to less than the current number of players!");
                        }
                        if (!game.inProgress) {
                            game.displayName = body.displayName;
                            game.description = body.description;
                            game.slots = body.slots;
                            game.dlc = body.dlc;
                            game.humans = body.humans;
                            game.gameSpeed = body.gameSpeed;
                            game.mapFile = body.mapFile;
                            game.mapSize = body.mapSize;
                        }
                        game.allowJoinAfterStart = body.allowJoinAfterStart;
                        if (!body.password) return [3 /*break*/, 5];
                        if (!(body.password !== game.hashedPassword)) return [3 /*break*/, 4];
                        return [4 /*yield*/, bcrypt.genSalt(10)];
                    case 2:
                        salt = _b.sent();
                        _a = game;
                        return [4 /*yield*/, bcrypt.hash(body.password, salt)];
                    case 3:
                        _a.hashedPassword = _b.sent();
                        _b.label = 4;
                    case 4: return [3 /*break*/, 6];
                    case 5:
                        game.hashedPassword = null;
                        _b.label = 6;
                    case 6: return [2 /*return*/, gameRepository_1.gameRepository.saveVersioned(game)];
                }
            });
        });
    };
    GameController.prototype.join = function (request, gameId, body) {
        return __awaiter(this, void 0, void 0, function () {
            var game, targetPlayer, user, users, createdByUser, promises, email;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, gameRepository_1.gameRepository.get(gameId)];
                    case 1:
                        game = _a.sent();
                        if (game.inProgress) {
                            if (!game.allowJoinAfterStart) {
                                throw new framework_1.HttpResponseError(400, 'Game does not allow joining after start!');
                            }
                            targetPlayer = _.find(game.players, function (player) {
                                return player.civType === body.playerCiv;
                            });
                            if (!targetPlayer) {
                                throw new framework_1.HttpResponseError(400, 'Requested civ not found.');
                            }
                            if (targetPlayer.steamId) {
                                throw new framework_1.HttpResponseError(400, 'Slot already assigned.');
                            }
                        }
                        else {
                            if (body.playerCiv !== 'LEADER_RANDOM' && _.map(game.players, 'civType').indexOf(body.playerCiv) >= 0) {
                                throw new framework_1.HttpResponseError(400, 'Civ already in Game');
                            }
                        }
                        if (_.map(game.players, 'steamId').indexOf(request.user.steamId) >= 0) {
                            throw new framework_1.HttpResponseError(400, 'Player already in Game');
                        }
                        if (models_1.getHumans(game).length >= game.humans) {
                            throw new framework_1.HttpResponseError(400, 'Too many humans already in game.');
                        }
                        if (!game.hashedPassword) return [3 /*break*/, 3];
                        return [4 /*yield*/, bcrypt.compare(body.password || '', game.hashedPassword)];
                    case 2:
                        if (!(_a.sent())) {
                            throw new framework_1.HttpResponseError(400, 'Supplied password does not match game password!');
                        }
                        _a.label = 3;
                    case 3:
                        if (targetPlayer) {
                            targetPlayer.steamId = request.user.steamId;
                        }
                        else {
                            game.players.push({
                                steamId: request.user.steamId,
                                civType: body.playerCiv
                            });
                        }
                        return [4 /*yield*/, userRepository_1.userRepository.get(request.user.steamId)];
                    case 4:
                        user = _a.sent();
                        if (!user.emailAddress) {
                            throw new framework_1.HttpResponseError(404, 'You need to set an email address for notifications before joining a game.');
                        }
                        user.activeGameIds = user.activeGameIds || [];
                        user.activeGameIds.push(game.gameId);
                        return [4 /*yield*/, Promise.all([
                                gameRepository_1.gameRepository.saveVersioned(game),
                                userRepository_1.userRepository.saveVersioned(user)
                            ])];
                    case 5:
                        _a.sent();
                        return [4 /*yield*/, userRepository_1.userRepository.getUsersForGame(game)];
                    case 6:
                        users = _a.sent();
                        createdByUser = _.find(users, function (u) {
                            return u.steamId === game.createdBySteamId;
                        });
                        promises = [];
                        if (createdByUser.emailAddress) {
                            email = {
                                Destination: {
                                    ToAddresses: [
                                        createdByUser.emailAddress
                                    ]
                                },
                                Message: {
                                    Body: {
                                        Html: {
                                            Data: "<p>The user <b>" + user.displayName + "</b> has joined your game <b>" + game.displayName + "</b>!  " +
                                                ("There are now <b>" + models_1.getHumans(game, true).length + " / " + game.humans + "</b> ") +
                                                "human player slots filled in the game.</p>"
                                        }
                                    }, Subject: {
                                        Data: 'A new user has joined your game!'
                                    }
                                },
                                Source: 'Play Your Damn Turn <noreply@playyourdamnturn.com>'
                            };
                            promises.push(ses.sendEmail(email).promise());
                        }
                        if (game.inProgress) {
                            promises.push(gameTurnRepository_1.gameTurnRepository.getAndUpdateSaveFileForGameState(game, users));
                        }
                        return [4 /*yield*/, Promise.all(promises)];
                    case 7:
                        _a.sent();
                        return [2 /*return*/, game];
                }
            });
        });
    };
    GameController.prototype.leave = function (request, gameId) {
        return __awaiter(this, void 0, void 0, function () {
            var game, user, createdByUser, email;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, gameRepository_1.gameRepository.get(gameId)];
                    case 1:
                        game = _a.sent();
                        if (game.createdBySteamId === request.user.steamId) {
                            throw new framework_1.HttpResponseError(400, "You can't leave, you created the game!");
                        }
                        if (game.inProgress && game.gameTurnRangeKey > 1) {
                            throw new framework_1.HttpResponseError(400, 'You can only leave a game before it starts.');
                        }
                        if (_.map(game.players, 'steamId').indexOf(request.user.steamId) < 0) {
                            throw new framework_1.HttpResponseError(400, 'Player not in Game');
                        }
                        _.remove(game.players, function (player) {
                            return player.steamId === request.user.steamId;
                        });
                        return [4 /*yield*/, userRepository_1.userRepository.get(request.user.steamId)];
                    case 2:
                        user = _a.sent();
                        _.pull(user.activeGameIds, game.gameId);
                        return [4 /*yield*/, Promise.all([
                                gameRepository_1.gameRepository.saveVersioned(game),
                                userRepository_1.userRepository.saveVersioned(user)
                            ])];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, userRepository_1.userRepository.get(game.createdBySteamId)];
                    case 4:
                        createdByUser = _a.sent();
                        if (!createdByUser.emailAddress) return [3 /*break*/, 6];
                        email = {
                            Destination: {
                                ToAddresses: [
                                    createdByUser.emailAddress
                                ]
                            },
                            Message: {
                                Body: {
                                    Html: {
                                        Data: "<p>The user <b>" + user.displayName + "</b> has left your game <b>" + game.displayName + "</b>.  " +
                                            ("There are now <b>" + game.players.length + " / " + game.humans + "</b> human players in the game.</p>")
                                    }
                                }, Subject: {
                                    Data: 'A user has left your game.'
                                }
                            },
                            Source: 'Play Your Damn Turn <noreply@playyourdamnturn.com>'
                        };
                        return [4 /*yield*/, ses.sendEmail(email).promise()];
                    case 5:
                        _a.sent();
                        _a.label = 6;
                    case 6: return [2 /*return*/, game];
                }
            });
        });
    };
    GameController.prototype.listOpen = function (request) {
        return __awaiter(this, void 0, void 0, function () {
            var test, games, orderedGames;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        test = gameRepository_1.gameRepository;
                        if (test.batchGet) {
                            test.batchGet(['wat']);
                        }
                        return [4 /*yield*/, gameRepository_1.gameRepository.scan('completed').not().eq(true).exec()];
                    case 1:
                        games = _a.sent();
                        orderedGames = _.orderBy(games, ['createdAt'], ['desc']);
                        return [2 /*return*/, {
                                notStarted: _.filter(orderedGames, function (game) {
                                    return !game.inProgress;
                                }),
                                openSlots: _.filter(orderedGames, function (game) {
                                    var numHumans = _.filter(game.players, function (player) {
                                        return !!player.steamId;
                                    }).length;
                                    return game.inProgress &&
                                        game.allowJoinAfterStart &&
                                        !game.completed &&
                                        numHumans < game.players.length &&
                                        numHumans < game.humans;
                                })
                            }];
                }
            });
        });
    };
    GameController.prototype.start = function (request, gameId) {
        return __awaiter(this, void 0, void 0, function () {
            var game, firstTurn;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, gameRepository_1.gameRepository.get(gameId)];
                    case 1:
                        game = _a.sent();
                        if (game.inProgress) {
                            throw new framework_1.HttpResponseError(400, 'Game in progress!');
                        }
                        if (game.createdBySteamId !== request.user.steamId) {
                            throw new framework_1.HttpResponseError(400, 'You didn\'t create this game!');
                        }
                        if (game.players.length < 2) {
                            throw new framework_1.HttpResponseError(400, 'Not enough players to start the game!');
                        }
                        game.inProgress = true;
                        return [4 /*yield*/, gameRepository_1.gameRepository.saveVersioned(game)];
                    case 2:
                        _a.sent();
                        firstTurn = {
                            gameId: game.gameId,
                            turn: 1,
                            round: 1,
                            playerSteamId: game.createdBySteamId
                        };
                        return [4 /*yield*/, gameTurnRepository_1.gameTurnRepository.saveVersioned(firstTurn)];
                    case 3:
                        _a.sent();
                        return [2 /*return*/, game];
                }
            });
        });
    };
    GameController.prototype.surrender = function (request, gameId, body) {
        return __awaiter(this, void 0, void 0, function () {
            var game, userId, diffTime, player, users, user, gameTurn, curIndex, nextIndex, emailPromises, _loop_1, _i, _a, gamePlayer;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, gameRepository_1.gameRepository.get(gameId)];
                    case 1:
                        game = _b.sent();
                        userId = request.user.steamId;
                        if (body.kickUserId) {
                            if (game.createdBySteamId !== request.user.steamId) {
                                throw new framework_1.HttpResponseError(400, 'You must be the game creator to kick a user!');
                            }
                            diffTime = new Date().getTime() - game.updatedAt.getTime();
                            if (diffTime < 1000 * 60 * 60 * 24) {
                                throw new framework_1.HttpResponseError(404, "You cannot kick a user if they haven't had 24 hours to play their turn.");
                            }
                            userId = body.kickUserId;
                        }
                        player = _.find(game.players, function (p) {
                            return p.steamId === userId;
                        });
                        if (!player) {
                            throw new framework_1.HttpResponseError(404, 'Player not in Game.');
                        }
                        if (player.hasSurrendered) {
                            throw new framework_1.HttpResponseError(404, 'Player has already surrendered!');
                        }
                        if (game.gameTurnRangeKey <= 1) {
                            throw new framework_1.HttpResponseError(404, "You can't surrender yet!  Create the game!");
                        }
                        player.hasSurrendered = true;
                        // The game is completed if every player is AI
                        game.completed = _.every(game.players, function (p) {
                            return !models_1.playerIsHuman(p);
                        });
                        return [4 /*yield*/, userRepository_1.userRepository.getUsersForGame(game)];
                    case 2:
                        users = _b.sent();
                        user = _.find(users, function (u) {
                            return u.steamId === userId;
                        });
                        _.pull(user.activeGameIds, gameId);
                        user.inactiveGameIds = user.inactiveGameIds || [];
                        user.inactiveGameIds.push(gameId);
                        return [4 /*yield*/, gameTurnRepository_1.gameTurnRepository.get({ gameId: gameId, turn: game.gameTurnRangeKey })];
                    case 3:
                        gameTurn = _b.sent();
                        if (!(user.steamId === game.currentPlayerSteamId)) return [3 /*break*/, 5];
                        curIndex = models_1.getCurrentPlayerIndex(game);
                        nextIndex = models_1.getNextPlayerIndex(game);
                        if (nextIndex >= 0) {
                            game.currentPlayerSteamId = gameTurn.playerSteamId = game.players[nextIndex].steamId;
                            if (nextIndex <= curIndex) {
                                game.round = gameTurn.round++;
                            }
                        }
                        gameTurn.startDate = new Date();
                        return [4 /*yield*/, gameTurnRepository_1.gameTurnRepository.getAndUpdateSaveFileForGameState(game)];
                    case 4:
                        _b.sent();
                        _b.label = 5;
                    case 5: return [4 /*yield*/, Promise.all([
                            userRepository_1.userRepository.saveVersioned(user),
                            gameRepository_1.gameRepository.saveVersioned(game),
                            gameTurnRepository_1.gameTurnRepository.saveVersioned(gameTurn)
                        ])];
                    case 6:
                        _b.sent();
                        // Send an sns message that a turn has been completed.
                        return [4 /*yield*/, sns_1.sendSnsMessage(config_1.Config.resourcePrefix() + 'turn-submitted', 'turn-submitted', game.gameId)];
                    case 7:
                        // Send an sns message that a turn has been completed.
                        _b.sent();
                        emailPromises = [];
                        _loop_1 = function (gamePlayer) {
                            var curUser = _.find(users, function (u) {
                                return u.steamId === gamePlayer.steamId;
                            });
                            if (curUser && curUser.emailAddress) {
                                var desc = 'surrendered';
                                if (body.kickUserId) {
                                    desc = 'been kicked';
                                }
                                if (models_1.playerIsHuman(gamePlayer)) {
                                    var email = {
                                        Destination: {
                                            ToAddresses: [
                                                curUser.emailAddress
                                            ]
                                        },
                                        Message: {
                                            Body: {
                                                Html: {
                                                    Data: "<p><b>" + user.displayName + "</b> has " + desc + " from <b>" + game.displayName + "</b>. :(</p>"
                                                }
                                            }, Subject: {
                                                Data: "A player has " + desc + " from " + game.displayName + "!"
                                            }
                                        },
                                        Source: 'Play Your Damn Turn <noreply@playyourdamnturn.com>'
                                    };
                                    emailPromises.push(ses.sendEmail(email).promise());
                                }
                                if (gamePlayer.steamId === body.kickUserId) {
                                    var email = {
                                        Destination: {
                                            ToAddresses: [
                                                curUser.emailAddress
                                            ]
                                        },
                                        Message: {
                                            Body: {
                                                Html: {
                                                    Data: "<p>You have been kicked from <b>" + game.displayName + "</b>. If you feel this was unwarranted, " +
                                                        "please contact mike@playyourdamnturn.com and we can try to mediate the situation.</p>"
                                                }
                                            }, Subject: {
                                                Data: "You have been kicked from " + game.displayName + "!"
                                            }
                                        },
                                        Source: 'Play Your Damn Turn <noreply@playyourdamnturn.com>'
                                    };
                                    emailPromises.push(ses.sendEmail(email).promise());
                                }
                            }
                        };
                        for (_i = 0, _a = game.players; _i < _a.length; _i++) {
                            gamePlayer = _a[_i];
                            _loop_1(gamePlayer);
                        }
                        return [4 /*yield*/, Promise.all(emailPromises)];
                    case 8:
                        _b.sent();
                        return [2 /*return*/, game];
                }
            });
        });
    };
    GameController.prototype.get = function (request, gameId) {
        return gameRepository_1.gameRepository.get(gameId);
    };
    __decorate([
        tsoa_1.Security('api_key'),
        tsoa_1.Response(401, 'Unauthorized'),
        tsoa_1.Post('{gameId}/changeCiv'),
        __param(0, tsoa_1.Request()), __param(2, tsoa_1.Body()),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [framework_1.HttpRequest, String, Object]),
        __metadata("design:returntype", Promise)
    ], GameController.prototype, "changeCiv", null);
    __decorate([
        tsoa_1.Security('api_key'),
        tsoa_1.Response(401, 'Unauthorized'),
        tsoa_1.Post('create'),
        __param(0, tsoa_1.Request()), __param(1, tsoa_1.Body()),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [framework_1.HttpRequest, Object]),
        __metadata("design:returntype", Promise)
    ], GameController.prototype, "create", null);
    __decorate([
        tsoa_1.Security('api_key'),
        tsoa_1.Response(401, 'Unauthorized'),
        tsoa_1.Post('{gameId}/delete'),
        __param(0, tsoa_1.Request()),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [framework_1.HttpRequest, String]),
        __metadata("design:returntype", Promise)
    ], GameController.prototype, "delete", null);
    __decorate([
        tsoa_1.Security('api_key'),
        tsoa_1.Response(401, 'Unauthorized'),
        tsoa_1.Post('{gameId}/edit'),
        __param(0, tsoa_1.Request()), __param(2, tsoa_1.Body()),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [framework_1.HttpRequest, String, Object]),
        __metadata("design:returntype", Promise)
    ], GameController.prototype, "edit", null);
    __decorate([
        tsoa_1.Security('api_key'),
        tsoa_1.Response(401, 'Unauthorized'),
        tsoa_1.Post('{gameId}/join'),
        __param(0, tsoa_1.Request()), __param(2, tsoa_1.Body()),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [framework_1.HttpRequest, String, Object]),
        __metadata("design:returntype", Promise)
    ], GameController.prototype, "join", null);
    __decorate([
        tsoa_1.Security('api_key'),
        tsoa_1.Response(401, 'Unauthorized'),
        tsoa_1.Post('{gameId}/leave'),
        __param(0, tsoa_1.Request()),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [framework_1.HttpRequest, String]),
        __metadata("design:returntype", Promise)
    ], GameController.prototype, "leave", null);
    __decorate([
        tsoa_1.Response(401, 'Unauthorized'),
        tsoa_1.Get('listOpen'),
        __param(0, tsoa_1.Request()),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [framework_1.HttpRequest]),
        __metadata("design:returntype", Promise)
    ], GameController.prototype, "listOpen", null);
    __decorate([
        tsoa_1.Security('api_key'),
        tsoa_1.Response(401, 'Unauthorized'),
        tsoa_1.Post('{gameId}/start'),
        __param(0, tsoa_1.Request()),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [framework_1.HttpRequest, String]),
        __metadata("design:returntype", Promise)
    ], GameController.prototype, "start", null);
    __decorate([
        tsoa_1.Security('api_key'),
        tsoa_1.Response(401, 'Unauthorized'),
        tsoa_1.Post('{gameId}/surrender'),
        __param(0, tsoa_1.Request()), __param(2, tsoa_1.Body()),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [framework_1.HttpRequest, String, Object]),
        __metadata("design:returntype", Promise)
    ], GameController.prototype, "surrender", null);
    __decorate([
        tsoa_1.Get('{gameId}'),
        __param(0, tsoa_1.Request()),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [framework_1.HttpRequest, String]),
        __metadata("design:returntype", Promise)
    ], GameController.prototype, "get", null);
    GameController = GameController_1 = __decorate([
        tsoa_1.Route('game'),
        ioc_1.provideSingleton(GameController_1)
    ], GameController);
    return GameController;
    var GameController_1;
}());
exports.GameController = GameController;


/***/ }),
/* 31 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var _ = __webpack_require__(1);
function getCurrentPlayerIndex(game) {
    return _.indexOf(game.players, _.find(game.players, function (player) {
        return player.steamId === game.currentPlayerSteamId;
    }));
}
exports.getCurrentPlayerIndex = getCurrentPlayerIndex;
;
function getNextPlayerIndex(game) {
    var playerIndex = getCurrentPlayerIndex(game);
    var looped = false;
    do {
        playerIndex++;
        if (playerIndex >= game.players.length) {
            if (!looped) {
                playerIndex = 0;
                looped = true;
            }
            else {
                return -1;
            }
        }
    } while (!playerIsHuman(game.players[playerIndex]));
    return playerIndex;
}
exports.getNextPlayerIndex = getNextPlayerIndex;
;
function getPreviousPlayerIndex(game) {
    var playerIndex = getCurrentPlayerIndex(game);
    var looped = false;
    do {
        playerIndex--;
        if (playerIndex < 0) {
            if (!looped) {
                playerIndex = game.players.length - 1;
                looped = true;
            }
            else {
                return -1;
            }
        }
    } while (!playerIsHuman(game.players[playerIndex]));
    return playerIndex;
}
exports.getPreviousPlayerIndex = getPreviousPlayerIndex;
;
function getHumans(game, includeSurrendered) {
    return _.filter(game.players, function (player) {
        return player.steamId && (includeSurrendered || !player.hasSurrendered);
    });
}
exports.getHumans = getHumans;
;
function playerIsHuman(player) {
    return player.steamId && !player.hasSurrendered;
}
exports.playerIsHuman = playerIsHuman;
;


/***/ }),
/* 32 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var userRepository_1 = __webpack_require__(6);
var gameRepository_1 = __webpack_require__(9);
var discourse_1 = __webpack_require__(14);
var _ = __webpack_require__(1);
var AWS = __webpack_require__(5);
var ses = new AWS.SES();
function deleteGame(game, steamId) {
    return __awaiter(this, void 0, void 0, function () {
        var users, promises, _i, users_1, curUser, message, email;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, userRepository_1.userRepository.getUsersForGame(game)];
                case 1:
                    users = _a.sent();
                    promises = [];
                    promises.push(gameRepository_1.gameRepository.delete(game.gameId));
                    for (_i = 0, users_1 = users; _i < users_1.length; _i++) {
                        curUser = users_1[_i];
                        _.pull(curUser.activeGameIds, game.gameId);
                        promises.push(userRepository_1.userRepository.saveVersioned(curUser));
                        if (curUser.emailAddress && (!steamId || curUser.steamId !== steamId)) {
                            message = "<p>A game that you have recently joined (<b>" + game.displayName + "</b>) has been deleted";
                            if (!steamId) {
                                message = " because it took too long to start. :(</p>";
                            }
                            else {
                                message += " by it's creator. :(</p>";
                            }
                            email = {
                                Destination: {
                                    ToAddresses: [
                                        curUser.emailAddress
                                    ]
                                },
                                Message: {
                                    Body: {
                                        Html: {
                                            Data: message
                                        }
                                    }, Subject: {
                                        Data: "Game Deleted"
                                    }
                                },
                                Source: 'Play Your Damn Turn <noreply@playyourdamnturn.com>'
                            };
                            promises.push(ses.sendEmail(email).promise());
                        }
                    }
                    promises.push(discourse_1.deleteDiscourseGameTopic(game));
                    return [4 /*yield*/, Promise.all(promises)];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.deleteGame = deleteGame;


/***/ }),
/* 33 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var _this = this;
Object.defineProperty(exports, "__esModule", { value: true });
var models_1 = __webpack_require__(13);
var common_1 = __webpack_require__(8);
var config_1 = __webpack_require__(0);
var index_1 = __webpack_require__(2);
var _ = __webpack_require__(1);
var AWS = __webpack_require__(5);
var civ6 = __webpack_require__(34);
var zlib = __webpack_require__(35);
var pwdgen = __webpack_require__(36);
var s3 = new AWS.S3();
exports.gameTurnRepository = common_1.dynamoose.createVersionedModel(config_1.Config.resourcePrefix() + 'game-turn', {
    gameId: {
        type: String,
        hashKey: true
    },
    turn: {
        type: Number,
        rangeKey: true
    },
    round: {
        type: Number,
        required: true
    },
    playerSteamId: {
        type: String,
        required: true
    },
    startDate: {
        type: Date,
        required: true,
        default: function () {
            return new Date();
        }
    },
    endDate: Date,
    skipped: Boolean
});
exports.gameTurnRepository.createS3SaveKey = function (gameId, turn) {
    return gameId + '/' + ('000000' + turn).slice(-6) + '.CivXSave';
};
exports.gameTurnRepository.getAndUpdateSaveFileForGameState = function (game, users) { return __awaiter(_this, void 0, void 0, function () {
    var s3Key, data;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                s3Key = exports.gameTurnRepository.createS3SaveKey(game.gameId, game.gameTurnRangeKey);
                return [4 /*yield*/, s3.getObject({
                        Bucket: config_1.Config.resourcePrefix() + 'saves',
                        Key: s3Key
                    }).promise()];
            case 1:
                data = _a.sent();
                if (!data && !data.Body) {
                    throw new Error("File doesn't exist: " + s3Key);
                }
                return [2 /*return*/, exports.gameTurnRepository.updateSaveFileForGameState(game, users, exports.gameTurnRepository.parseSaveFile(data.Body, game))];
        }
    });
}); };
exports.gameTurnRepository.updateTurnStatistics = function (game, gameTurn, user, undo) {
    var undoInc = undo ? -1 : 1;
    if (gameTurn.endDate) {
        var player = _.find(game.players, function (p) {
            return p.steamId === user.steamId;
        });
        if (gameTurn.skipped) {
            player.turnsSkipped = (player.turnsSkipped || 0) + 1 * undoInc;
            user.turnsSkipped = (user.turnsSkipped || 0) + 1 * undoInc;
        }
        else {
            player.turnsPlayed = (player.turnsPlayed || 0) + 1 * undoInc;
            user.turnsPlayed = (user.turnsPlayed || 0) + 1 * undoInc;
        }
        var timeTaken = gameTurn.endDate.getTime() - gameTurn.startDate.getTime();
        player.timeTaken = (player.timeTaken || 0) + timeTaken * undoInc;
        user.timeTaken = (user.timeTaken || 0) + timeTaken * undoInc;
        if (timeTaken < 1000 * 60 * 60) {
            user.fastTurns = (user.fastTurns || 0) + 1 * undoInc;
            player.fastTurns = (player.fastTurns || 0) + 1 * undoInc;
        }
        if (timeTaken > 1000 * 60 * 60 * 6) {
            user.slowTurns = (user.slowTurns || 0) + 1 * undoInc;
            player.slowTurns = (player.slowTurns || 0) + 1 * undoInc;
        }
    }
};
exports.gameTurnRepository.updateSaveFileForGameState = function (game, users, wrapper) {
    var parsed = wrapper.parsed;
    var _loop_1 = function (i) {
        var parsedCiv = parsed.CIVS[i];
        if (game.players[i]) {
            var player_1 = game.players[i];
            if (!models_1.playerIsHuman(player_1)) {
                // Make sure surrendered players are marked as AI
                if (parsedCiv.ACTOR_AI_HUMAN.data === 3) {
                    civ6.modifyChunk(wrapper.chunks, parsedCiv.ACTOR_AI_HUMAN, 1);
                }
            }
            else {
                var slotHeaderVal = parsedCiv.SLOT_HEADER.data;
                if (parsedCiv.ACTOR_AI_HUMAN.data === 1) {
                    civ6.modifyChunk(wrapper.chunks, parsedCiv.ACTOR_AI_HUMAN, 3);
                }
                if (users) {
                    var user = _.find(users, function (u) {
                        return u.steamId === player_1.steamId;
                    });
                    // Make sure player names are correct
                    if (parsedCiv.PLAYER_NAME) {
                        if (parsedCiv.PLAYER_NAME.data !== user.displayName) {
                            civ6.modifyChunk(wrapper.chunks, parsedCiv.PLAYER_NAME, user.displayName);
                        }
                    }
                    else {
                        civ6.addChunk(wrapper.chunks, parsedCiv.LEADER_NAME, civ6.MARKERS.ACTOR_DATA.PLAYER_NAME, civ6.DATA_TYPES.STRING, user.displayName);
                        slotHeaderVal++;
                    }
                }
                if (player_1.steamId === game.currentPlayerSteamId) {
                    // Delete any password for the active player
                    if (parsedCiv.PLAYER_PASSWORD) {
                        civ6.deleteChunk(wrapper.chunks, parsedCiv.PLAYER_PASSWORD);
                        slotHeaderVal--;
                    }
                }
                else {
                    // Make sure all other players have a random password
                    if (!parsedCiv.PLAYER_PASSWORD) {
                        civ6.addChunk(wrapper.chunks, parsedCiv.LEADER_NAME, civ6.MARKERS.ACTOR_DATA.PLAYER_PASSWORD, civ6.DATA_TYPES.STRING, pwdgen.generate({}));
                        slotHeaderVal++;
                    }
                    else {
                        civ6.modifyChunk(wrapper.chunks, parsedCiv.PLAYER_PASSWORD, pwdgen.generate({}));
                    }
                }
                civ6.modifyChunk(wrapper.chunks, parsedCiv.SLOT_HEADER, slotHeaderVal);
            }
        }
    };
    for (var i = parsed.CIVS.length - 1; i >= 0; i--) {
        _loop_1(i);
    }
    var saveKey = exports.gameTurnRepository.createS3SaveKey(game.gameId, game.gameTurnRangeKey);
    var uncompressedBody = Buffer.concat(wrapper.chunks);
    return Promise.all([
        s3.putObject({
            Bucket: config_1.Config.resourcePrefix() + 'saves',
            Key: saveKey,
            Body: uncompressedBody
        }).promise(),
        s3.putObject({
            Bucket: config_1.Config.resourcePrefix() + 'saves',
            Key: saveKey + '.gz',
            Body: zlib.gzipSync(uncompressedBody)
        }).promise()
    ]);
};
exports.gameTurnRepository.parseSaveFile = function (buffer, game) {
    try {
        return civ6.parse(buffer);
    }
    catch (e) {
        // TODO: Should probably be a non-HTTP specific error type
        throw new index_1.HttpResponseError(400, "Could not parse uploaded file!  If you continue to have trouble please post on the PYDT forums.");
    }
};


/***/ }),
/* 34 */
/***/ (function(module, exports) {

module.exports = require("civ6-save-parser");

/***/ }),
/* 35 */
/***/ (function(module, exports) {

module.exports = require("zlib");

/***/ }),
/* 36 */
/***/ (function(module, exports) {

module.exports = require("generate-password");

/***/ }),
/* 37 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var AWS = __webpack_require__(5);
var sns = new AWS.SNS();
var sts = new AWS.STS();
function sendSnsMessage(topic, subject, message) {
    return __awaiter(this, void 0, void 0, function () {
        var identity, params;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, sts.getCallerIdentity({}).promise()];
                case 1:
                    identity = _a.sent();
                    params = {
                        Message: message,
                        Subject: subject,
                        TopicArn: 'arn:aws:sns:us-east-1:' + identity.Account + ':' + topic
                    };
                    return [2 /*return*/, sns.publish(params).promise()];
            }
        });
    });
}
exports.sendSnsMessage = sendSnsMessage;
;


/***/ }),
/* 38 */
/***/ (function(module, exports) {

module.exports = require("node-uuid");

/***/ }),
/* 39 */
/***/ (function(module, exports) {

module.exports = require("bcryptjs");

/***/ }),
/* 40 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var tsoa_1 = __webpack_require__(3);
var ioc_1 = __webpack_require__(4);
var userRepository_1 = __webpack_require__(6);
var framework_1 = __webpack_require__(2);
var config_1 = __webpack_require__(0);
var gameRepository_1 = __webpack_require__(9);
var steamUtil_1 = __webpack_require__(10);
var UserController = /** @class */ (function () {
    function UserController() {
    }
    UserController_1 = UserController;
    UserController.prototype.games = function (request) {
        return __awaiter(this, void 0, void 0, function () {
            var user, games;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, userRepository_1.userRepository.get(request.user.steamId)];
                    case 1:
                        user = _a.sent();
                        return [4 /*yield*/, gameRepository_1.gameRepository.getGamesForUser(user)];
                    case 2:
                        games = _a.sent();
                        return [2 /*return*/, {
                                data: games,
                                pollUrl: "https://" + config_1.Config.resourcePrefix() + "saves.s3.amazonaws.com/" + userRepository_1.userRepository.createS3GameCacheKey(request.user.steamId)
                            }];
                }
            });
        });
    };
    UserController.prototype.all = function (request) {
        return __awaiter(this, void 0, void 0, function () {
            var result, lastKey, scan, users, _i, users_1, user;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        result = [];
                        _a.label = 1;
                    case 1:
                        scan = userRepository_1.userRepository.scan().where('turnsPlayed').gt(0);
                        if (lastKey) {
                            scan = scan.startAt(lastKey);
                        }
                        return [4 /*yield*/, scan.exec()];
                    case 2:
                        users = _a.sent();
                        for (_i = 0, users_1 = users; _i < users_1.length; _i++) {
                            user = users_1[_i];
                            delete user.emailAddress; // make sure email address isn't returned!
                        }
                        lastKey = users.lastKey;
                        _a.label = 3;
                    case 3:
                        if (lastKey) return [3 /*break*/, 1];
                        _a.label = 4;
                    case 4: return [2 /*return*/, result];
                }
            });
        });
    };
    UserController.prototype.getCurrent = function (request) {
        return userRepository_1.userRepository.get(request.user.steamId);
    };
    UserController.prototype.setNotificationEmail = function (request, body) {
        return __awaiter(this, void 0, void 0, function () {
            var user;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, userRepository_1.userRepository.get(request.user.steamId)];
                    case 1:
                        user = _a.sent();
                        user.emailAddress = body.emailAddress;
                        return [2 /*return*/, userRepository_1.userRepository.saveVersioned(user)];
                }
            });
        });
    };
    UserController.prototype.steamProfile = function (request) {
        return __awaiter(this, void 0, void 0, function () {
            var players;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, steamUtil_1.getPlayerSummaries([request.user.steamId])];
                    case 1:
                        players = _a.sent();
                        if (players.length !== 1) {
                            throw new Error('Couldn\'t get user profile');
                        }
                        return [2 /*return*/, players[0]];
                }
            });
        });
    };
    UserController.prototype.steamProfiles = function (rawSteamIds) {
        return __awaiter(this, void 0, void 0, function () {
            var steamIds, users;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        steamIds = rawSteamIds.split(',') || [];
                        return [4 /*yield*/, userRepository_1.userRepository.batchGet(steamIds)];
                    case 1:
                        users = _a.sent();
                        if (steamIds.length !== users.length) {
                            throw new Error('Invalid users');
                        }
                        return [2 /*return*/, steamUtil_1.getPlayerSummaries(steamIds)];
                }
            });
        });
    };
    UserController.prototype.byId = function (request, steamId) {
        return __awaiter(this, void 0, void 0, function () {
            var user;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, userRepository_1.userRepository.get(steamId)];
                    case 1:
                        user = _a.sent();
                        delete user.emailAddress; // make sure email address isn't returned!
                        return [2 /*return*/, user];
                }
            });
        });
    };
    __decorate([
        tsoa_1.Security('api_key'),
        tsoa_1.Response(401, 'Unauthorized'),
        tsoa_1.Get('games'),
        __param(0, tsoa_1.Request()),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [framework_1.HttpRequest]),
        __metadata("design:returntype", Promise)
    ], UserController.prototype, "games", null);
    __decorate([
        tsoa_1.Security('api_key'),
        tsoa_1.Response(401, 'Unauthorized'),
        tsoa_1.Get(''),
        __param(0, tsoa_1.Request()),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [framework_1.HttpRequest]),
        __metadata("design:returntype", Promise)
    ], UserController.prototype, "all", null);
    __decorate([
        tsoa_1.Security('api_key'),
        tsoa_1.Response(401, 'Unauthorized'),
        tsoa_1.Get('getCurrent'),
        __param(0, tsoa_1.Request()),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [framework_1.HttpRequest]),
        __metadata("design:returntype", Promise)
    ], UserController.prototype, "getCurrent", null);
    __decorate([
        tsoa_1.Security('api_key'),
        tsoa_1.Response(401, 'Unauthorized'),
        tsoa_1.Post('setNotificationEmail'),
        __param(0, tsoa_1.Request()), __param(1, tsoa_1.Body()),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [framework_1.HttpRequest, Object]),
        __metadata("design:returntype", Promise)
    ], UserController.prototype, "setNotificationEmail", null);
    __decorate([
        tsoa_1.Security('api_key'),
        tsoa_1.Response(401, 'Unauthorized'),
        tsoa_1.Get('steamProfile'),
        __param(0, tsoa_1.Request()),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [framework_1.HttpRequest]),
        __metadata("design:returntype", Promise)
    ], UserController.prototype, "steamProfile", null);
    __decorate([
        tsoa_1.Response(401, 'Unauthorized'),
        tsoa_1.Get('steamProfiles'),
        __param(0, tsoa_1.Query('steamIds')),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [String]),
        __metadata("design:returntype", Promise)
    ], UserController.prototype, "steamProfiles", null);
    __decorate([
        tsoa_1.Get('{steamId}'),
        __param(0, tsoa_1.Request()),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [framework_1.HttpRequest, String]),
        __metadata("design:returntype", Promise)
    ], UserController.prototype, "byId", null);
    UserController = UserController_1 = __decorate([
        tsoa_1.Route('user'),
        ioc_1.provideSingleton(UserController_1)
    ], UserController);
    return UserController;
    var UserController_1;
}());
exports.UserController = UserController;


/***/ }),
/* 41 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var tsoa_1 = __webpack_require__(3);
var ioc_1 = __webpack_require__(4);
var userRepository_1 = __webpack_require__(6);
var framework_1 = __webpack_require__(2);
var UsersController = /** @class */ (function () {
    function UsersController() {
    }
    UsersController_1 = UsersController;
    UsersController.prototype.all = function (request) {
        return __awaiter(this, void 0, void 0, function () {
            var result, lastKey, scan, users, _i, users_1, user;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        result = [];
                        _a.label = 1;
                    case 1:
                        scan = userRepository_1.userRepository.scan().where('turnsPlayed').gt(0);
                        if (lastKey) {
                            scan = scan.startAt(lastKey);
                        }
                        return [4 /*yield*/, scan.exec()];
                    case 2:
                        users = _a.sent();
                        for (_i = 0, users_1 = users; _i < users_1.length; _i++) {
                            user = users_1[_i];
                            delete user.emailAddress; // make sure email address isn't returned!
                            result.push(user);
                        }
                        lastKey = users.lastKey;
                        _a.label = 3;
                    case 3:
                        if (lastKey) return [3 /*break*/, 1];
                        _a.label = 4;
                    case 4: return [2 /*return*/, result];
                }
            });
        });
    };
    __decorate([
        tsoa_1.Response(401, 'Unauthorized'),
        tsoa_1.Get(''),
        __param(0, tsoa_1.Request()),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [framework_1.HttpRequest]),
        __metadata("design:returntype", Promise)
    ], UsersController.prototype, "all", null);
    UsersController = UsersController_1 = __decorate([
        tsoa_1.Route('users'),
        ioc_1.provideSingleton(UsersController_1)
    ], UsersController);
    return UsersController;
    var UsersController_1;
}());
exports.UsersController = UsersController;


/***/ }),
/* 42 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var index_1 = __webpack_require__(2);
var jwtUtil_1 = __webpack_require__(12);
var winston = __webpack_require__(7);
function expressAuthentication(request, securityName, scopes) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            if (securityName === 'api_key') {
                try {
                    if (request.headers && request.headers['authorization']) {
                        return [2 /*return*/, jwtUtil_1.JwtUtil.parseToken(request.headers['authorization'])];
                    }
                }
                catch (e) {
                    winston.warn("Error parsing JWT token: " + JSON.stringify(e.stack || e));
                    throw index_1.HttpResponseError.createUnauthorized();
                }
                winston.info('No Authorization header in request!');
            }
            throw index_1.HttpResponseError.createUnauthorized();
        });
    });
}
exports.expressAuthentication = expressAuthentication;
;


/***/ }),
/* 43 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var winston = __webpack_require__(7);
var winston_transport_rollbar_1 = __webpack_require__(44);
var config_1 = __webpack_require__(0);
function configureLogging() {
    winston.configure({
        exitOnError: false,
        handleExceptions: true,
        transports: [
            new winston.transports.Console()
        ]
    });
    // wr isn't anything because of the weird way this transport is designed, but we need to
    // check for it to prevent webpack from tree-shaking :(
    if (!winston_transport_rollbar_1.default && config_1.Config.activeStage() && config_1.Config.activeStage() !== 'dev') {
        winston.add(winston.transports.Rollbar, {
            rollbarAccessToken: 'cc75ab4c6093419aa3b026df58dc8996',
            rollbarConfig: {
                environment: config_1.Config.activeStage()
            },
            level: 'warn'
        });
    }
}
exports.configureLogging = configureLogging;


/***/ }),
/* 44 */
/***/ (function(module, exports) {

module.exports = require("winston-transport-rollbar");

/***/ }),
/* 45 */
/***/ (function(module, exports) {

module.exports = {"basePath":"/","consumes":["application/json"],"definitions":{"AuthenticateResponse":{"properties":{"redirectURL":{"type":"string"}},"required":["redirectURL"],"type":"object"},"SteamProfile":{"properties":{"steamid":{"type":"string"},"personaname":{"type":"string"},"profileurl":{"type":"string"},"avatar":{"type":"string"},"avatarmedium":{"type":"string"},"avatarfull":{"type":"string"}},"required":["steamid","personaname","profileurl","avatar","avatarmedium","avatarfull"],"type":"object"},"ValidateResponse":{"properties":{"token":{"type":"string"},"steamProfile":{"$ref":"#/definitions/SteamProfile"}},"required":["token","steamProfile"],"type":"object"},"GamePlayer":{"properties":{"steamId":{"type":"string"},"civType":{"type":"string"},"hasSurrendered":{"type":"boolean"},"turnsPlayed":{"type":"number","format":"double"},"turnsSkipped":{"type":"number","format":"double"},"timeTaken":{"type":"number","format":"double"},"fastTurns":{"type":"number","format":"double"},"slowTurns":{"type":"number","format":"double"}},"required":["steamId","civType"],"type":"object"},"Game":{"properties":{"gameId":{"type":"string"},"createdBySteamId":{"type":"string"},"inProgress":{"type":"boolean"},"hashedPassword":{"type":"string"},"players":{"type":"array","items":{"$ref":"#/definitions/GamePlayer"}},"discourseTopicId":{"type":"number","format":"double"},"currentPlayerSteamId":{"type":"string"},"turnTimerMinutes":{"type":"number","format":"double"},"round":{"type":"number","format":"double"},"gameTurnRangeKey":{"type":"number","format":"double"},"completed":{"type":"boolean"},"createdAt":{"type":"string","format":"date-time"},"updatedAt":{"type":"string","format":"date-time"},"version":{"type":"number","format":"double"},"displayName":{"type":"string"},"description":{"type":"string"},"dlc":{"type":"array","items":{"type":"string"}},"slots":{"type":"number","format":"double"},"humans":{"type":"number","format":"double"},"gameSpeed":{"type":"string"},"mapFile":{"type":"string"},"mapSize":{"type":"string"},"allowJoinAfterStart":{"type":"boolean"}},"required":["gameId","createdBySteamId","players","currentPlayerSteamId","displayName","description","dlc","slots","humans","gameSpeed","mapFile","mapSize"],"type":"object"},"ErrorResponse":{"properties":{"message":{"type":"string"}},"required":["message"],"type":"object"},"ChangeCivRequestBody":{"properties":{"playerCiv":{"type":"string"}},"required":["playerCiv"],"type":"object"},"CreateGameRequestBody":{"properties":{"player1Civ":{"type":"string"},"password":{"type":"string"},"displayName":{"type":"string"},"description":{"type":"string"},"dlc":{"type":"array","items":{"type":"string"}},"slots":{"type":"number","format":"double"},"humans":{"type":"number","format":"double"},"gameSpeed":{"type":"string"},"mapFile":{"type":"string"},"mapSize":{"type":"string"},"allowJoinAfterStart":{"type":"boolean"}},"required":["player1Civ","password","displayName","description","dlc","slots","humans","gameSpeed","mapFile","mapSize"],"type":"object"},"GameRequestBody":{"properties":{"password":{"type":"string"},"displayName":{"type":"string"},"description":{"type":"string"},"dlc":{"type":"array","items":{"type":"string"}},"slots":{"type":"number","format":"double"},"humans":{"type":"number","format":"double"},"gameSpeed":{"type":"string"},"mapFile":{"type":"string"},"mapSize":{"type":"string"},"allowJoinAfterStart":{"type":"boolean"}},"required":["password","displayName","description","dlc","slots","humans","gameSpeed","mapFile","mapSize"],"type":"object"},"JoinGameRequestBody":{"properties":{"password":{"type":"string"},"playerCiv":{"type":"string"}},"required":["password","playerCiv"],"type":"object"},"OpenGamesResponse":{"properties":{"notStarted":{"type":"array","items":{"$ref":"#/definitions/Game"}},"openSlots":{"type":"array","items":{"$ref":"#/definitions/Game"}}},"required":["notStarted","openSlots"],"type":"object"},"SurrenderBody":{"properties":{"kickUserId":{"type":"string"}},"required":["kickUserId"],"type":"object"},"GamesByUserResponse":{"properties":{"data":{"type":"array","items":{"$ref":"#/definitions/Game"}},"pollUrl":{"type":"string"}},"required":["data","pollUrl"],"type":"object"},"User":{"properties":{"steamId":{"type":"string"},"displayName":{"type":"string"},"avatarSmall":{"type":"string"},"avatarMedium":{"type":"string"},"avatarFull":{"type":"string"},"emailAddress":{"type":"string"},"activeGameIds":{"type":"array","items":{"type":"string"}},"inactiveGameIds":{"type":"array","items":{"type":"string"}},"turnsPlayed":{"type":"number","format":"double"},"turnsSkipped":{"type":"number","format":"double"},"timeTaken":{"type":"number","format":"double"},"fastTurns":{"type":"number","format":"double"},"slowTurns":{"type":"number","format":"double"}},"required":["steamId","displayName","avatarSmall","avatarMedium","avatarFull","emailAddress","activeGameIds","inactiveGameIds","turnsPlayed","turnsSkipped","timeTaken","fastTurns","slowTurns"],"type":"object"},"SetNotificationEmailBody":{"properties":{"emailAddress":{"type":"string"}},"required":["emailAddress"],"type":"object"}},"info":{"title":"serverless-api","version":"1.0.0"},"paths":{"/auth/steam":{"get":{"operationId":"AuthAuthenticate","produces":["application/json"],"responses":{"200":{"description":"Ok","schema":{"$ref":"#/definitions/AuthenticateResponse"}}},"security":[],"parameters":[]}},"/auth/steam/validate":{"get":{"operationId":"AuthValidate","produces":["application/json"],"responses":{"200":{"description":"Ok","schema":{"$ref":"#/definitions/ValidateResponse"}}},"security":[],"parameters":[]}},"/game/{gameId}/changeCiv":{"post":{"operationId":"GameChangeCiv","produces":["application/json"],"responses":{"200":{"description":"Ok","schema":{"$ref":"#/definitions/Game"}},"401":{"description":"Unauthorized","schema":{"$ref":"#/definitions/ErrorResponse"}}},"security":[{"api_key":[]}],"parameters":[{"in":"path","name":"gameId","required":true,"type":"string"},{"in":"body","name":"body","required":true,"schema":{"$ref":"#/definitions/ChangeCivRequestBody"}}]}},"/game/create":{"post":{"operationId":"GameCreate","produces":["application/json"],"responses":{"200":{"description":"Ok","schema":{"$ref":"#/definitions/Game"}},"401":{"description":"Unauthorized","schema":{"$ref":"#/definitions/ErrorResponse"}}},"security":[{"api_key":[]}],"parameters":[{"in":"body","name":"body","required":true,"schema":{"$ref":"#/definitions/CreateGameRequestBody"}}]}},"/game/{gameId}/delete":{"post":{"operationId":"GameDelete","produces":["application/json"],"responses":{"204":{"description":"No content"},"401":{"description":"Unauthorized","schema":{"$ref":"#/definitions/ErrorResponse"}}},"security":[{"api_key":[]}],"parameters":[{"in":"path","name":"gameId","required":true,"type":"string"}]}},"/game/{gameId}/edit":{"post":{"operationId":"GameEdit","produces":["application/json"],"responses":{"200":{"description":"Ok","schema":{"$ref":"#/definitions/Game"}},"401":{"description":"Unauthorized","schema":{"$ref":"#/definitions/ErrorResponse"}}},"security":[{"api_key":[]}],"parameters":[{"in":"path","name":"gameId","required":true,"type":"string"},{"in":"body","name":"body","required":true,"schema":{"$ref":"#/definitions/GameRequestBody"}}]}},"/game/{gameId}/join":{"post":{"operationId":"GameJoin","produces":["application/json"],"responses":{"200":{"description":"Ok","schema":{"$ref":"#/definitions/Game"}},"401":{"description":"Unauthorized","schema":{"$ref":"#/definitions/ErrorResponse"}}},"security":[{"api_key":[]}],"parameters":[{"in":"path","name":"gameId","required":true,"type":"string"},{"in":"body","name":"body","required":true,"schema":{"$ref":"#/definitions/JoinGameRequestBody"}}]}},"/game/{gameId}/leave":{"post":{"operationId":"GameLeave","produces":["application/json"],"responses":{"200":{"description":"Ok","schema":{"$ref":"#/definitions/Game"}},"401":{"description":"Unauthorized","schema":{"$ref":"#/definitions/ErrorResponse"}}},"security":[{"api_key":[]}],"parameters":[{"in":"path","name":"gameId","required":true,"type":"string"}]}},"/game/listOpen":{"get":{"operationId":"GameListOpen","produces":["application/json"],"responses":{"200":{"description":"Ok","schema":{"$ref":"#/definitions/OpenGamesResponse"}},"401":{"description":"Unauthorized","schema":{"$ref":"#/definitions/ErrorResponse"}}},"security":[],"parameters":[]}},"/game/{gameId}/start":{"post":{"operationId":"GameStart","produces":["application/json"],"responses":{"200":{"description":"Ok","schema":{"$ref":"#/definitions/Game"}},"401":{"description":"Unauthorized","schema":{"$ref":"#/definitions/ErrorResponse"}}},"security":[{"api_key":[]}],"parameters":[{"in":"path","name":"gameId","required":true,"type":"string"}]}},"/game/{gameId}/surrender":{"post":{"operationId":"GameSurrender","produces":["application/json"],"responses":{"200":{"description":"Ok","schema":{"$ref":"#/definitions/Game"}},"401":{"description":"Unauthorized","schema":{"$ref":"#/definitions/ErrorResponse"}}},"security":[{"api_key":[]}],"parameters":[{"in":"path","name":"gameId","required":true,"type":"string"},{"in":"body","name":"body","required":true,"schema":{"$ref":"#/definitions/SurrenderBody"}}]}},"/game/{gameId}":{"get":{"operationId":"GameGet","produces":["application/json"],"responses":{"200":{"description":"Ok","schema":{"$ref":"#/definitions/Game"}}},"security":[],"parameters":[{"in":"path","name":"gameId","required":true,"type":"string"}]}},"/user/games":{"get":{"operationId":"UserGames","produces":["application/json"],"responses":{"200":{"description":"Ok","schema":{"$ref":"#/definitions/GamesByUserResponse"}},"401":{"description":"Unauthorized","schema":{"$ref":"#/definitions/ErrorResponse"}}},"security":[{"api_key":[]}],"parameters":[]}},"/user/":{"get":{"operationId":"UserAll","produces":["application/json"],"responses":{"200":{"description":"Ok","schema":{"type":"array","items":{"$ref":"#/definitions/User"}}},"401":{"description":"Unauthorized","schema":{"$ref":"#/definitions/ErrorResponse"}}},"security":[{"api_key":[]}],"parameters":[]}},"/user/getCurrent":{"get":{"operationId":"UserGetCurrent","produces":["application/json"],"responses":{"200":{"description":"Ok","schema":{"$ref":"#/definitions/User"}},"401":{"description":"Unauthorized","schema":{"$ref":"#/definitions/ErrorResponse"}}},"security":[{"api_key":[]}],"parameters":[]}},"/user/setNotificationEmail":{"post":{"operationId":"UserSetNotificationEmail","produces":["application/json"],"responses":{"200":{"description":"Ok","schema":{"$ref":"#/definitions/User"}},"401":{"description":"Unauthorized","schema":{"$ref":"#/definitions/ErrorResponse"}}},"security":[{"api_key":[]}],"parameters":[{"in":"body","name":"body","required":true,"schema":{"$ref":"#/definitions/SetNotificationEmailBody"}}]}},"/user/steamProfile":{"get":{"operationId":"UserSteamProfile","produces":["application/json"],"responses":{"200":{"description":"Ok","schema":{"$ref":"#/definitions/SteamProfile"}},"401":{"description":"Unauthorized","schema":{"$ref":"#/definitions/ErrorResponse"}}},"security":[{"api_key":[]}],"parameters":[]}},"/user/steamProfiles":{"get":{"operationId":"UserSteamProfiles","produces":["application/json"],"responses":{"200":{"description":"Ok","schema":{"type":"array","items":{"$ref":"#/definitions/SteamProfile"}}},"401":{"description":"Unauthorized","schema":{"$ref":"#/definitions/ErrorResponse"}}},"security":[],"parameters":[{"in":"query","name":"steamIds","required":true,"type":"string"}]}},"/user/{steamId}":{"get":{"operationId":"UserById","produces":["application/json"],"responses":{"200":{"description":"Ok","schema":{"$ref":"#/definitions/User"}}},"security":[],"parameters":[{"in":"path","name":"steamId","required":true,"type":"string"}]}},"/users/":{"get":{"operationId":"UsersAll","produces":["application/json"],"responses":{"200":{"description":"Ok","schema":{"type":"array","items":{"$ref":"#/definitions/User"}}},"401":{"description":"Unauthorized","schema":{"$ref":"#/definitions/ErrorResponse"}}},"security":[],"parameters":[]}}},"produces":["application/json"],"swagger":"2.0","securityDefinitions":{"api_key":{"type":"apiKey","name":"Authorization","in":"header"},"basic_auth_internal":{"type":"basic"}},"host":"localhost:3000"}

/***/ })
/******/ ])));
//# sourceMappingURL=router.js.map