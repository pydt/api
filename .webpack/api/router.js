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
/******/ 	return __webpack_require__(__webpack_require__.s = 4);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports) {

module.exports = require("winston");

/***/ }),
/* 1 */
/***/ (function(module, exports) {

module.exports = require("tsoa");

/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var inversify_1 = __webpack_require__(7);
exports.inject = inversify_1.inject;
var inversify_binding_decorators_1 = __webpack_require__(8);
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
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
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
/* 4 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = __webpack_require__(5);
var routes_1 = __webpack_require__(6);
var framework_1 = __webpack_require__(13);
var logging_1 = __webpack_require__(19);
var winston = __webpack_require__(0);
logging_1.configureLogging();
var router = express_1.Router();
router.get('/api/swagger.json', function (req, res) {
    res.status(200).json(__webpack_require__(21));
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
/* 5 */
/***/ (function(module, exports) {

module.exports = require("express");

/***/ }),
/* 6 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
/* tslint:disable */
var tsoa_1 = __webpack_require__(1);
var ioc_1 = __webpack_require__(2);
var authController_1 = __webpack_require__(9);
var models = {
    "AuthResponse": {
        "properties": {
            "redirectURL": { "dataType": "string", "required": true },
        },
    },
    "ErrorResponse": {
        "properties": {
            "message": { "dataType": "string", "required": true },
        },
    },
};
function RegisterRoutes(app) {
    app.get('/api/auth/steam', function (request, response, next) {
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
/* 7 */
/***/ (function(module, exports) {

module.exports = require("inversify");

/***/ }),
/* 8 */
/***/ (function(module, exports) {

module.exports = require("inversify-binding-decorators");

/***/ }),
/* 9 */
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
Object.defineProperty(exports, "__esModule", { value: true });
var tsoa_1 = __webpack_require__(1);
var ioc_1 = __webpack_require__(2);
var steamUtil_1 = __webpack_require__(10);
var winston = __webpack_require__(0);
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
    __decorate([
        tsoa_1.Response(401, 'Unauthorized'),
        tsoa_1.Get('steam'),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", []),
        __metadata("design:returntype", Promise)
    ], AuthController.prototype, "authenticate", null);
    AuthController = AuthController_1 = __decorate([
        tsoa_1.Route('auth'),
        ioc_1.provideSingleton(AuthController_1)
    ], AuthController);
    return AuthController;
    var AuthController_1;
}());
exports.AuthController = AuthController;


/***/ }),
/* 10 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var config_1 = __webpack_require__(3);
var passport = __webpack_require__(11);
var passportSteam = __webpack_require__(12);
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


/***/ }),
/* 11 */
/***/ (function(module, exports) {

module.exports = require("passport");

/***/ }),
/* 12 */
/***/ (function(module, exports) {

module.exports = require("passport-steam");

/***/ }),
/* 13 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
__export(__webpack_require__(14));
__export(__webpack_require__(15));
__export(__webpack_require__(17));
__export(__webpack_require__(18));


/***/ }),
/* 14 */
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
/* 15 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var _ = __webpack_require__(16);
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
/* 16 */
/***/ (function(module, exports) {

module.exports = require("lodash");

/***/ }),
/* 17 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var HttpResponse = /** @class */ (function () {
    function HttpResponse(callback) {
        this.callback = callback;
        this.headers = {
            'Access-Control-Allow-Headers': 'Content-Type,api-key',
            'Access-Control-Expose-Headers': 'api-key',
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
/* 18 */
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
/* 19 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var winston = __webpack_require__(0);
var winston_transport_rollbar_1 = __webpack_require__(20);
var config_1 = __webpack_require__(3);
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
/* 20 */
/***/ (function(module, exports) {

module.exports = require("winston-transport-rollbar");

/***/ }),
/* 21 */
/***/ (function(module, exports) {

module.exports = {"basePath":"/api","consumes":["application/json"],"definitions":{"AuthResponse":{"properties":{"redirectURL":{"type":"string"}},"required":["redirectURL"],"type":"object"},"ErrorResponse":{"properties":{"message":{"type":"string"}},"required":["message"],"type":"object"}},"info":{"title":"serverless-api","version":"1.0.0"},"paths":{"/auth/steam":{"get":{"operationId":"AuthAuthenticate","produces":["application/json"],"responses":{"200":{"description":"Ok","schema":{"$ref":"#/definitions/AuthResponse"}},"401":{"description":"Unauthorized","schema":{"$ref":"#/definitions/ErrorResponse"}}},"security":[],"parameters":[]}}},"produces":["application/json"],"swagger":"2.0","securityDefinitions":{"api_key":{"type":"apiKey","name":"api-key","in":"header"},"basic_auth_internal":{"type":"basic"}},"host":"localhost:3000"}

/***/ })
/******/ ])));
//# sourceMappingURL=router.js.map