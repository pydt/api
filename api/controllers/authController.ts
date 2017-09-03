import { ErrorResponse } from '../framework/index';
import { Get, Route, Response } from 'tsoa';
import { provideSingleton } from '../../lib/ioc';
import { steamPassport } from '../../lib/steamUtil';
import * as winston from 'winston';

@Route('auth')
@provideSingleton(AuthController)
export class AuthController {
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Get('steam')
  public authenticate(): Promise<AuthResponse> {
    return new Promise((resolve, reject) => {
      let location = null;

      // Since passport expects to work with something like express,
      // mock the req/res/next middleware format...
      const req = {};
      const res = {
        setHeader: (key, value) => {
          if (key === 'Location') {
            location = value;
          }
        },
        end: () => {
          resolve({
            redirectURL: location
          });
        }
      };
      const next = () => {
        // Nothing to do here
      };

      steamPassport.authenticate('steam', (err, user, info) => {
        if (err) {
          reject(err);
        } else {
          winston.info('Callback called without error?', user, info);
        }
      })(req, res, next);
    });
  }
}

export interface AuthResponse {
  redirectURL: string;
}
