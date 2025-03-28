import * as querystring from 'querystring';
import { Get, Request, Response, Route, Security, Tags } from 'tsoa';

import { JwtUtil } from '../../lib/auth/jwtUtil';
import { IUserRepository, USER_REPOSITORY_SYMBOL } from '../../lib/dynamoose/userRepository';
import { inject, provideSingleton } from '../../lib/ioc';
import { pydtLogger } from '../../lib/logging';
import { SteamProfile, User } from '../../lib/models';
import { steamPassport } from '../../lib/steamUtil';
import { ErrorResponse, HttpRequest, HttpResponseError } from '../framework';
import {
  IPrivateUserDataRepository,
  PRIVATE_USER_DATA_REPOSITORY_SYMBOL
} from '../../lib/dynamoose/privateUserDataRepository';

@Route('auth')
@Tags('auth')
@provideSingleton(AuthController)
export class AuthController {
  constructor(
    @inject(USER_REPOSITORY_SYMBOL) private userRepository: IUserRepository,
    @inject(PRIVATE_USER_DATA_REPOSITORY_SYMBOL) private pudRepository: IPrivateUserDataRepository
  ) {}

  @Get('steam')
  public authenticate(@Request() request: HttpRequest): Promise<AuthenticateResponse> {
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

      steamPassport(request).authenticate('steam', (err, user, info) => {
        if (err) {
          reject(err);
        } else {
          pydtLogger.info(
            `Callback called without error?  user: ${JSON.stringify(user)}, info: ${JSON.stringify(
              info
            )}`
          );
        }
      })(req, res, next);
    });
  }

  @Get('auth/updateTokenNonce')
  @Security('api_key')
  @Response<ErrorResponse>(401, 'Unauthorized')
  public async updateTokenNonce(@Request() request: HttpRequest): Promise<string> {
    const pud = await this.pudRepository.get(request.user);

    pud.tokenNonce = (pud.tokenNonce || 0) + 1;

    await this.pudRepository.saveVersioned(pud);

    return JwtUtil.createToken({
      steamId: request.user,
      nonce: pud.tokenNonce
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
        setHeader: key => {
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

      steamPassport(request).authenticate('steam', (err, user) => {
        if (err) {
          reject(err);
        } else {
          this.userRepository
            .get(user.profile.id)
            .then(dbUser => {
              if (!dbUser) {
                dbUser = {
                  steamId: user.profile.id
                } as User;
              }

              const steamProfile = user.profile._json as SteamProfile;

              dbUser.displayName = user.profile.displayName;
              dbUser.steamProfileUrl = steamProfile.profileurl;
              dbUser.avatarSmall = steamProfile.avatar;
              dbUser.avatarMedium = steamProfile.avatarmedium;
              dbUser.avatarFull = steamProfile.avatarfull;
              return this.userRepository.saveVersioned(dbUser);
            })
            .then(() => {
              return this.pudRepository.get(user.profile.id);
            })
            .then(pud => {
              resolve({
                token: JwtUtil.createToken({
                  steamId: user.profile.id,
                  nonce: pud.tokenNonce
                }),
                steamProfile: user.profile._json
              });
            })
            .catch(perr => {
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
