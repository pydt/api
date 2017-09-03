import { Config } from './config';
import * as passport from 'passport';
import * as passportSteam from 'passport-steam';

passport.use(
  new passportSteam.Strategy({
    returnURL: Config.webUrl() + '/steamreturn',
    realm: Config.webUrl(),
    apiKey: Config.steamApiKey()
  },
  function(identifier, profile, done) {
    done(null, {
      identifier: identifier,
      profile: profile
    });
  })
);

export const steamPassport = passport;
