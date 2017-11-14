import { HttpRequest, HttpResponseError } from '../framework';
import { Get, Route, Request } from 'tsoa';
import { provideSingleton } from '../../lib/ioc';
import { steamPassport } from '../../lib/steamUtil';
import { User, SteamProfile } from '../../lib/models';
import { userRepository } from '../../lib/dynamoose/userRepository';
import { JwtUtil } from '../../lib/auth/jwtUtil';
import { pydtLogger } from '../../lib/logging';
import * as querystring from 'querystring';

@Route('auth')
@provideSingleton(AuthController)
export class AuthController {
  @Get('steam')
  public authenticate(): Promise<AuthenticateResponse> {
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
          pydtLogger.info(`Callback called without error?  user: ${JSON.stringify(user)}, info: ${JSON.stringify(info)}`);
        }
      })(req, res, next);
    });
  }

  @Get('steam/validate')
  public validate(@Request() request: HttpRequest): Promise<ValidateResponse> {
    return new Promise((resolve, reject) => {
      const req = {
        query: request.query,
        url: '/blah?' + querystring.stringify(request.query)
      };
      const res = {
        setHeader: (key, value) => {
          if (key === 'Location') {
            // We shouldn't get here in validate...
            reject(new HttpResponseError(400, 'Bad Request'));
          }
        }
      };
      const next = () => {
        // We shouldn't get here in validate...
        reject(new HttpResponseError(400, 'Bad Request'));
      };

      steamPassport.authenticate('steam', (err, user, info) => {
        if (err) {
          reject(err);
        } else {
          userRepository.get(user.profile.id).then(dbUser => {
            if (!dbUser) {
              dbUser = {
                steamId: user.profile.id
              } as User;
            }

            const steamProfile = user.profile._json as SteamProfile;

            dbUser.displayName = user.profile.displayName;
            dbUser.avatarSmall = steamProfile.avatar;
            dbUser.avatarMedium = steamProfile.avatarmedium;
            dbUser.avatarFull = steamProfile.avatarfull;
            return userRepository.saveVersioned(dbUser);
          }).then(() => {
            resolve({
              token: JwtUtil.createToken(user.profile.id),
              steamProfile: user.profile._json
            });
          }).catch(perr => {
            reject(perr);
          });
        }
      })(req, res, next);
    });
  }
}

export interface AuthenticateResponse {
  redirectURL: string;
}

export interface ValidateResponse {
  token: string;
  steamProfile: SteamProfile;
}