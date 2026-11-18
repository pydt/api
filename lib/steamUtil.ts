import { join } from 'lodash';
import * as passport from 'passport';
import * as passportSteam from 'passport-steam';
import { HttpRequest, HttpResponseError } from '../api/framework';
import { Config } from './config';
import { pydtLogger } from './logging';
import { SteamProfile } from './models';
import { tracedFetch } from './xray';

export const steamPassport = (request: HttpRequest) => {
  const sp = new passport.Passport();

  let webUrl = Config.webUrl;
  const referer = request.headers['referer'];

  if (referer) {
    try {
      const parsedReferer = new URL(referer);
      const { hostname, port } = parsedReferer;

      if (hostname === 'localhost' && port === '8080') {
        webUrl = 'http://localhost:8080';
      } else if (hostname === 'dev.playyourdamnturn.com') {
        webUrl = 'https://dev.playyourdamnturn.com';
      }
    } catch {
      // Ignore malformed referer values and keep default Config.webUrl.
    }
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

// Errors from passport's Steam OpenID step are almost never our bug: "Failed to discover OP endpoint URL"
// means Steam's OpenID server couldn't be reached (outages, maintenance), and "Failed to verify assertion"
// usually means a stale or reused login return. Tell the user to retry, and log a warning instead of
// letting it surface as an unhandled 500. Anything else passes through unchanged.
export const steamLoginError = (err: unknown, route: string): unknown => {
  if ((err as Error)?.name !== 'InternalOpenIDError') {
    return err;
  }

  pydtLogger.warn(`Steam OpenID failure on ${route}`, err as Error);

  return /discover/i.test((err as Error).message)
    ? new HttpResponseError(
        503,
        "Couldn't reach Steam to log in. Please try again in a few minutes."
      )
    : new HttpResponseError(400, "Steam login didn't go through. Please try logging in again.");
};

export async function getPlayerSummaries(steamIds: string[]): Promise<SteamProfile[]> {
  const resp = await tracedFetch(
    `http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${
      Config.steamApiKey
    }&steamids=${join(steamIds)}`
  );

  if (!resp.ok) {
    throw new Error(`Bad Response (${resp.status}): ${await resp.text()}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((await resp.json()) as any).response.players;
}
