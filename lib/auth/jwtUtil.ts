import * as jwt from 'jsonwebtoken';
import { PydtJwtPayload, FullJwtPayload } from './jwtPayload';
import { Config } from '../config';

export namespace JwtUtil {
  export function createToken(payload: PydtJwtPayload): string {
    return jwt.sign(payload, Config.jwtSecret());
  }

  export function parseToken(token: string): FullJwtPayload {
    return jwt.verify(token, Config.jwtSecret()) as FullJwtPayload;
  }
}
