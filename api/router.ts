import { Router } from 'express';
import { RegisterRoutes } from './_gen/routes/routes';
import { ErrorResponse, HttpRequest, HttpResponse, HttpResponseError, LambdaProxyEvent } from './framework';
import { loggingHandler, pydtLogger } from '../lib/logging';

const router = Router();

router.get('/swagger.json', (req, res) => {
  res.status(200).json(require('./_gen/swagger/swagger.json'));
});

type middlewareExec = ((request: HttpRequest, response: HttpResponse, next: any) => void);

function methodHandler(method: string) {
  return function (route: string, ...routeExecs: middlewareExec[]) {
    router[method](route, (req, res) => {
      pydtLogger.info(`Found route ${route}`);

      const runNext = (runExecs: middlewareExec[]) => {
        const curExec: middlewareExec = runExecs[0];

        curExec(req, res, (err) => {
          if (err) {
            let status = 500;
            let message = 'There was an error processing your request.';
            let logError = true;

            if (err.constructor.name === 'InvalidRequestException') {
              // TODO: These probably shouldn't go to an end user, they come from TSOA and look like:
              // 'landingPageURL' is a required undefined parameter.
              status = err.status;
              message = err.message;
              logError = false;
            }

            if (err instanceof HttpResponseError) {
              status = err.statusCode;
              message = err.message;
              logError = false;
            }

            if (logError) {
              pydtLogger.error(`Unhandled Exception from ${route}`, err);
            }

            res.status(status).json(new ErrorResponse(message));
          } else if (runExecs.length > 1) {
            runNext(runExecs.slice(1));
          }
        });
      };

      runNext(routeExecs);
    });
  };
}

const mockApp = {
  delete: methodHandler('delete'),
  get: methodHandler('get'),
  patch: methodHandler('patch'),
  post: methodHandler('post'),
  put: methodHandler('put')
};

RegisterRoutes(mockApp);

export const handler = loggingHandler((event: LambdaProxyEvent, context) => {
  pydtLogger.info(`handling ${event.httpMethod} ${event.path} (${event.requestContext.identity.sourceIp})`);

  return new Promise((resolve, reject) => {
    const callback = (err, resp) => {
      if (err) {
        reject(err);
      } else {
        resolve(resp);
      }
    };

    const response = new HttpResponse(callback);

    if (event.httpMethod.toLowerCase() === 'options') {
      response.status(200).end();
    } else {
      (router as any).handle(new HttpRequest(event, response), response, err => {
        pydtLogger.info(`404 for ${event.httpMethod} ${event.path}`);
        response.status(404).json(new ErrorResponse('Not Found'));
      });
    }
  });
});
