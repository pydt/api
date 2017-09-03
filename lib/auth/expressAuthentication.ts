import { HttpRequest, HttpResponseError } from '../../api/framework/index';
import { JwtUtil } from './jwtUtil';
import * as winston from 'winston';

export async function expressAuthentication(request: HttpRequest, securityName: string, scopes?: string[]): Promise<any> {
  if (securityName === 'api_key') {
    try {
      if (request.headers && request.headers['authorization']) {
        return JwtUtil.parseToken(request.headers['authorization']);
      }
    } catch (e) {
      winston.warn(`Error parsing JWT token: ${JSON.stringify(e.stack || e)}`);
      throw HttpResponseError.createUnauthorized();
    }

    winston.info('No Authorization header in request!');
  }

  throw HttpResponseError.createUnauthorized();
};
