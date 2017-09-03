/* tslint:disable */
import { Controller, ValidateParam, FieldErrors, ValidateError, TsoaRoute } from 'tsoa';
import { iocContainer } from './../../../lib/ioc';
import { AuthController } from './../../controllers/authController';
import { UserController } from './../../controllers/userController';
import { UsersController } from './../../controllers/usersController';
import { expressAuthentication } from './../../../lib/auth/expressAuthentication';

const models: TsoaRoute.Models = {
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
            "hasSurrendered": { "dataType": "boolean", "required": true },
            "turnsPlayed": { "dataType": "double", "required": true },
            "turnsSkipped": { "dataType": "double", "required": true },
            "timeTaken": { "dataType": "double", "required": true },
            "fastTurns": { "dataType": "double", "required": true },
            "slowTurns": { "dataType": "double", "required": true },
        },
    },
    "Game": {
        "properties": {
            "gameId": { "dataType": "string", "required": true },
            "createdBySteamId": { "dataType": "string", "required": true },
            "dlc": { "dataType": "array", "array": { "dataType": "string" }, "required": true },
            "inProgress": { "dataType": "boolean", "required": true },
            "completed": { "dataType": "boolean", "required": true },
            "hashedPassword": { "dataType": "string", "required": true },
            "displayName": { "dataType": "string", "required": true },
            "allowJoinAfterStart": { "dataType": "boolean", "required": true },
            "description": { "dataType": "string", "required": true },
            "slots": { "dataType": "double", "required": true },
            "humans": { "dataType": "double", "required": true },
            "players": { "dataType": "array", "array": { "ref": "GamePlayer" }, "required": true },
            "discourseTopicId": { "dataType": "double", "required": true },
            "currentPlayerSteamId": { "dataType": "string", "required": true },
            "turnTimerMinutes": { "dataType": "double", "required": true },
            "round": { "dataType": "double", "required": true },
            "gameTurnRangeKey": { "dataType": "double", "required": true },
            "gameSpeed": { "dataType": "string", "required": true },
            "mapFile": { "dataType": "string", "required": true },
            "mapSize": { "dataType": "string", "required": true },
        },
    },
    "GamesByUserResponse": {
        "properties": {
            "data": { "dataType": "array", "array": { "ref": "Game" }, "required": true },
            "pollUrl": { "dataType": "string", "required": true },
        },
    },
    "ErrorResponse": {
        "properties": {
            "message": { "dataType": "string", "required": true },
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

export function RegisterRoutes(app: any) {
    app.get('/auth/steam',
        function(request: any, response: any, next: any) {
            const args = {
            };

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request);
            } catch (err) {
                return next(err);
            }

            const controller = iocContainer.get<AuthController>(AuthController);


            const promise = controller.authenticate.apply(controller, validatedArgs);
            promiseHandler(controller, promise, response, next);
        });
    app.get('/auth/steam/validate',
        function(request: any, response: any, next: any) {
            const args = {
                request: { "in": "request", "name": "request", "required": true, "dataType": "object" },
            };

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request);
            } catch (err) {
                return next(err);
            }

            const controller = iocContainer.get<AuthController>(AuthController);


            const promise = controller.validate.apply(controller, validatedArgs);
            promiseHandler(controller, promise, response, next);
        });
    app.get('/user/games',
        authenticateMiddleware([{ "name": "api_key" }]),
        function(request: any, response: any, next: any) {
            const args = {
                request: { "in": "request", "name": "request", "required": true, "dataType": "object" },
            };

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request);
            } catch (err) {
                return next(err);
            }

            const controller = iocContainer.get<UserController>(UserController);


            const promise = controller.games.apply(controller, validatedArgs);
            promiseHandler(controller, promise, response, next);
        });
    app.get('/user/',
        authenticateMiddleware([{ "name": "api_key" }]),
        function(request: any, response: any, next: any) {
            const args = {
                request: { "in": "request", "name": "request", "required": true, "dataType": "object" },
            };

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request);
            } catch (err) {
                return next(err);
            }

            const controller = iocContainer.get<UserController>(UserController);


            const promise = controller.all.apply(controller, validatedArgs);
            promiseHandler(controller, promise, response, next);
        });
    app.get('/user/getCurrent',
        authenticateMiddleware([{ "name": "api_key" }]),
        function(request: any, response: any, next: any) {
            const args = {
                request: { "in": "request", "name": "request", "required": true, "dataType": "object" },
            };

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request);
            } catch (err) {
                return next(err);
            }

            const controller = iocContainer.get<UserController>(UserController);


            const promise = controller.getCurrent.apply(controller, validatedArgs);
            promiseHandler(controller, promise, response, next);
        });
    app.post('/user/setNotificationEmail',
        authenticateMiddleware([{ "name": "api_key" }]),
        function(request: any, response: any, next: any) {
            const args = {
                request: { "in": "request", "name": "request", "required": true, "dataType": "object" },
                body: { "in": "body", "name": "body", "required": true, "ref": "SetNotificationEmailBody" },
            };

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request);
            } catch (err) {
                return next(err);
            }

            const controller = iocContainer.get<UserController>(UserController);


            const promise = controller.setNotificationEmail.apply(controller, validatedArgs);
            promiseHandler(controller, promise, response, next);
        });
    app.get('/user/steamProfile',
        authenticateMiddleware([{ "name": "api_key" }]),
        function(request: any, response: any, next: any) {
            const args = {
                request: { "in": "request", "name": "request", "required": true, "dataType": "object" },
            };

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request);
            } catch (err) {
                return next(err);
            }

            const controller = iocContainer.get<UserController>(UserController);


            const promise = controller.steamProfile.apply(controller, validatedArgs);
            promiseHandler(controller, promise, response, next);
        });
    app.get('/user/steamProfiles',
        function(request: any, response: any, next: any) {
            const args = {
                rawSteamIds: { "in": "query", "name": "steamIds", "required": true, "dataType": "string" },
            };

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request);
            } catch (err) {
                return next(err);
            }

            const controller = iocContainer.get<UserController>(UserController);


            const promise = controller.steamProfiles.apply(controller, validatedArgs);
            promiseHandler(controller, promise, response, next);
        });
    app.get('/user/:steamId',
        function(request: any, response: any, next: any) {
            const args = {
                request: { "in": "request", "name": "request", "required": true, "dataType": "object" },
                steamId: { "in": "path", "name": "steamId", "required": true, "dataType": "string" },
            };

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request);
            } catch (err) {
                return next(err);
            }

            const controller = iocContainer.get<UserController>(UserController);


            const promise = controller.byId.apply(controller, validatedArgs);
            promiseHandler(controller, promise, response, next);
        });
    app.get('/users/',
        function(request: any, response: any, next: any) {
            const args = {
                request: { "in": "request", "name": "request", "required": true, "dataType": "object" },
            };

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request);
            } catch (err) {
                return next(err);
            }

            const controller = iocContainer.get<UsersController>(UsersController);


            const promise = controller.all.apply(controller, validatedArgs);
            promiseHandler(controller, promise, response, next);
        });

    function authenticateMiddleware(security: TsoaRoute.Security[] = []) {
        return (request: any, response: any, next: any) => {
            let responded = 0;
            let success = false;
            for (const secMethod of security) {
                expressAuthentication(request, secMethod.name, secMethod.scopes).then((user: any) => {
                    // only need to respond once
                    if (!success) {
                        success = true;
                        responded++;
                        request['user'] = user;
                        next();
                    }
                })
                    .catch((error: any) => {
                        responded++;
                        if (responded == security.length && !success) {
                            response.status(401);
                            next(error)
                        }
                    })
            }
        }
    }

    function promiseHandler(controllerObj: any, promise: any, response: any, next: any) {
        return Promise.resolve(promise)
            .then((data: any) => {
                let statusCode;
                if (controllerObj instanceof Controller) {
                    const controller = controllerObj as Controller
                    const headers = controller.getHeaders();
                    Object.keys(headers).forEach((name: string) => {
                        response.set(name, headers[name]);
                    });

                    statusCode = controller.getStatus();
                }

                if (data) {
                    response.status(statusCode | 200).json(data);
                } else {
                    response.status(statusCode | 204).end();
                }
            })
            .catch((error: any) => next(error));
    }

    function getValidatedArgs(args: any, request: any): any[] {
        const fieldErrors: FieldErrors = {};
        const values = Object.keys(args).map((key) => {
            const name = args[key].name;
            switch (args[key].in) {
                case 'request':
                    return request;
                case 'query':
                    return ValidateParam(args[key], request.query[name], models, name, fieldErrors);
                case 'path':
                    return ValidateParam(args[key], request.params[name], models, name, fieldErrors);
                case 'header':
                    return ValidateParam(args[key], request.header(name), models, name, fieldErrors);
                case 'body':
                    return ValidateParam(args[key], request.body, models, name, fieldErrors, name + '.');
                case 'body-prop':
                    return ValidateParam(args[key], request.body[name], models, name, fieldErrors, 'body.');
            }
        });
        if (Object.keys(fieldErrors).length > 0) {
            throw new ValidateError(fieldErrors, '');
        }
        return values;
    }
}
