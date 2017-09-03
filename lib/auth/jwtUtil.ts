import * as jwt from 'jsonwebtoken';
import { FerriteJwtPayload, FullJwtPayload } from './jwtPayload';
import { Config } from '../config';

export namespace JwtUtil {
  export function createToken(payload: FerriteJwtPayload): string {
    return jwt.sign(payload, Config.jwtSecret());
  }

  export function parseToken(token: string): FullJwtPayload {
    return jwt.verify(token, Config.jwtSecret()) as FullJwtPayload;
  }
}
