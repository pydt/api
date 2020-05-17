import * as jwt from 'jsonwebtoken';
import { Config } from '../config';

export namespace JwtUtil {
  export function createToken(steamId: string): string {
    return jwt.sign(steamId, Config.jwtSecret);
  }

  export function parseToken(token: string): string {
    return jwt.verify(token, Config.jwtSecret);
  }
}
