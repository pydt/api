import { HttpRequest, HttpResponseError } from '../../api/framework/index';
import { Config } from '../config';
import { PrivateUserDataRepository } from '../dynamoose/privateUserDataRepository';
import { iocContainer } from '../ioc';
import { pydtLogger } from '../logging';
import { JwtData, JwtUtil } from './jwtUtil';
import { Request } from 'express';

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
    pydtLogger.warn(`Nonce mismatch: ${pudNonce} vs ${tokenNonce}, user ${data.steamId}`);
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
      if (!(e instanceof HttpResponseError)) {
        pydtLogger.warn('Error parsing JWT token', e);
        throw HttpResponseError.createUnauthorized();
      }

      throw e;
    }

    if (!allowAnonymous) {
      pydtLogger.info('No Authorization header in request!');
    }
  }

  if (!allowAnonymous) {
    throw HttpResponseError.createUnauthorized();
  }
}
