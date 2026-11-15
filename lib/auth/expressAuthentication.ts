import { HttpRequest, HttpResponseError } from '../../api/framework/index';
import { Config } from '../config';
import { PrivateUserDataRepository } from '../dynamoose/privateUserDataRepository';
import { iocContainer } from '../ioc';
import { pydtLogger } from '../logging';
import { JwtData, JwtUtil } from './jwtUtil';
import { Request } from 'express';
import { JsonWebTokenError } from 'jsonwebtoken';

const cachedMinNonces: Record<string, number> = {};

export async function validateNonce(data: JwtData) {
  const tokenNonce = data.nonce || -1;
  const pudRepo = iocContainer.resolve(PrivateUserDataRepository);

  if (cachedMinNonces[data.steamId] && tokenNonce < cachedMinNonces[data.steamId]) {
    // Save a database check / extra logging on known bad nonces, especially spammy ones
    throw HttpResponseError.createUnauthorized();
  }

  const pud = await pudRepo.get(data.steamId);
  const pudNonce = pud.tokenNonce || -1;

  if (pudNonce > (cachedMinNonces[data.steamId] || -1)) {
    cachedMinNonces[data.steamId] = pudNonce;
  }

  if (pudNonce !== tokenNonce) {
    // Expected: a token issued before the user logged out somewhere else.
    pydtLogger.info(`Nonce mismatch: ${pudNonce} vs ${tokenNonce}, user ${data.steamId}`);
    throw HttpResponseError.createUnauthorized();
  }
}

export async function expressAuthentication(
  req: Request,
  securityName: string,
  scopes?: string[]
): Promise<string> {
  const allowAnonymous = scopes?.includes('ALLOW_ANONYMOUS');

  if (securityName === 'api_key') {
    try {
      if (req.headers && req.headers['authorization']) {
        const data = JwtUtil.parseToken(req.headers['authorization']);

        await validateNonce(data);

        if (!Config.runningLocal) {
          (req as unknown as HttpRequest).subSegment.addAnnotation('user', data.steamId);
        }
        return data.steamId;
      }
    } catch (e) {
      // A malformed, expired or wrongly signed token is just a 401 (this also
      // covers TokenExpiredError and NotBeforeError, which extend it). Anything
      // else, like a failed database lookup, is worth hearing about.
      if (!(e instanceof HttpResponseError) && !(e instanceof JsonWebTokenError)) {
        pydtLogger.warn('Error validating JWT token', e);
      }

      if (allowAnonymous) {
        // Public endpoint: a bad or stale token (e.g. logged out elsewhere) just means
        // "not logged in", so the caller gets the anonymous view instead of an error.
        return undefined;
      }

      throw e instanceof HttpResponseError ? e : HttpResponseError.createUnauthorized();
    }

    if (!allowAnonymous) {
      pydtLogger.info('No Authorization header in request!');
    }
  }

  if (!allowAnonymous) {
    throw HttpResponseError.createUnauthorized();
  }
}
