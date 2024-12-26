/* eslint-disable @typescript-eslint/no-explicit-any */

import * as AWSXRay from 'aws-xray-sdk';
import { Router } from 'express';
import 'express-async-errors';
import { ValidateError } from 'tsoa';
import { loggingHandler, pydtLogger } from '../lib/logging';
import {
  ErrorResponse,
  HttpRequest,
  HttpResponse,
  HttpResponseError,
  LambdaProxyEvent
} from './framework';
import { RegisterRoutes } from './_gen/routes/routes';
import { Config } from '../lib/config';

const router = Router();

router.get('/swagger.json', (req, res) => {
  // eslint-disable-next-line
  res.status(200).json(require('./_gen/swagger/swagger.json'));
});

type middlewareExec = (request: HttpRequest, response: HttpResponse, next: any) => void;

function methodHandler(method: string) {
  return function (route: string, ...routeExecs: middlewareExec[]) {
    router[method](route, (req: HttpRequest, res: HttpResponse) => {
      if (!Config.runningLocal) {
        const mainSegment = AWSXRay.getSegment(); //returns the facade segment
        req.subSegment = mainSegment.addNewSubsegment(`${method} ${route}`);
        const ird = new AWSXRay.middleware.IncomingRequestData(req as any);
        ird.request.url = req.url;
        (req.subSegment as any).http = ird;

        const ns = AWSXRay.getNamespace();
        ns.run(function () {
          AWSXRay.setSegment(req.subSegment);
        });

        res.on('finish', () => {
          (req.subSegment as any).http.close(this);
          req.subSegment.close();
        });
      }

      pydtLogger.info(`Found route ${route}`);

      const runNext = (runExecs: middlewareExec[]) => {
        const curExec: middlewareExec = runExecs[0];

        curExec(req, res, err => {
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
              if (err instanceof ValidateError) {
                pydtLogger.error(
                  `Validation Error on ${route}: ${JSON.stringify(err.fields, null, 2)}`,
                  err
                );
              } else {
                pydtLogger.error(`Unhandled Exception from ${route}`, err);
              }
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

const mockApp: any = {
  get: methodHandler('get'),
  post: methodHandler('post'),
  delete: methodHandler('delete')
};

RegisterRoutes(mockApp);

export const handler = loggingHandler((event: LambdaProxyEvent) => {
  const http = event.requestContext.http;
  pydtLogger.info(`handling ${http.method} ${http.path} (${http.sourceIp})`);

  return new Promise((resolve, reject) => {
    const callback = (err, resp) => {
      if (err) {
        reject(err);
      } else {
        resolve(resp);
      }
    };

    const req = new HttpRequest(event);
    const resp = new HttpResponse(callback, req);

    (router as any).handle(req, resp, () => {
      pydtLogger.info(`404 for ${http.method} ${http.path}`);
      resp.status(404).json(new ErrorResponse('Not Found'));
    });
  });
});
