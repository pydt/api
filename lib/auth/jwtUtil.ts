import * as jwt from 'jsonwebtoken';
import { Config } from '../config';

export class JwtUtil {
  public static createToken(steamId: string): string {
    return jwt.sign(steamId, Config.jwtSecret);
  }

  public static parseToken(token: string): string {
    return jwt.verify(token, Config.jwtSecret);
  }
}
