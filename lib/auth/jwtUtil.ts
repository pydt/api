import * as jwt from 'jsonwebtoken';
import { Config } from '../config';

export type JwtData = {
  steamId: string;
  nonce?: number;
};

export class JwtUtil {
  public static createToken(data: JwtData): string {
    return jwt.sign(data, Config.jwtSecret);
  }

  public static parseToken(token: string): JwtData {
    const data = jwt.verify(token, Config.jwtSecret);

    if (!data.steamId) {
      return {
        steamId: data
      };
    }

    return data;
  }
}
