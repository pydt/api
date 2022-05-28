import { join } from 'lodash';
import * as passport from 'passport';
import * as passportSteam from 'passport-steam';
import * as rp from 'request-promise';
import { HttpRequest } from '../api/framework';
import { Config } from './config';
import { SteamProfile } from './models';

export const steamPassport = (request: HttpRequest) => {
  const sp = new passport.Passport();

  let webUrl = Config.webUrl;
  const referer = request.headers['referer'];

  if (referer?.includes('localhost:8080')) {
    webUrl = 'http://localhost:8080';
  } else if (referer?.includes('dev.playyourdamnturn.com')) {
    webUrl = 'https://dev.playyourdamnturn.com';
  }

  sp.use(
    new passportSteam.Strategy(
      {
        returnURL: webUrl + '/steamreturn',
        realm: webUrl,
        apiKey: Config.steamApiKey
      },
      function (identifier, profile, done) {
        done(null, {
          identifier: identifier,
          profile: profile
        });
      }
    )
  );

  return sp;
};

export async function getPlayerSummaries(steamIds: string[]): Promise<SteamProfile[]> {
  const resp = await rp({
    uri: `http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${
      Config.steamApiKey
    }&steamids=${join(steamIds)}`,
    json: true
  });

  return resp.response.players;
}
