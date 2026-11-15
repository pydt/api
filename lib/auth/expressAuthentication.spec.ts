import 'reflect-metadata';
import { expect } from 'chai';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import { afterEach, beforeEach, describe, it } from 'mocha';
import { HttpResponseError } from '../../api/framework';
import { pydtLogger } from '../logging';
import { expressAuthentication } from './expressAuthentication';

describe('expressAuthentication', () => {
  const originalWarn = pydtLogger.warn;
  const originalSecret = process.env.JWT_SECRET;
  let warnings: unknown[];

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
    warnings = [];
    pydtLogger.warn = (message: unknown) => {
      warnings.push(message);
    };
  });

  afterEach(() => {
    pydtLogger.warn = originalWarn;
    process.env.JWT_SECRET = originalSecret;
  });

  async function authenticate(authorization: string) {
    try {
      await expressAuthentication({ headers: { authorization } } as unknown as Request, 'api_key');
    } catch (e) {
      return e;
    }

    throw new Error('expected a 401');
  }

  it('answers a malformed token with 401 and logs nothing (Rollbar API #787)', async () => {
    const err = await authenticate('not-a-jwt');

    expect(err).to.be.instanceOf(HttpResponseError);
    expect((err as HttpResponseError).statusCode).to.eq(401);
    expect(warnings).to.deep.eq([]);
  });

  it('answers a token signed with another secret with 401 and logs nothing', async () => {
    const err = await authenticate(jwt.sign({ steamId: '123' }, 'some-other-secret'));

    expect((err as HttpResponseError).statusCode).to.eq(401);
    expect(warnings).to.deep.eq([]);
  });

  it('answers an expired token with 401 and logs nothing', async () => {
    const expired = jwt.sign(
      { steamId: '123', exp: Math.floor(Date.now() / 1000) - 60 },
      'test-secret'
    );
    const err = await authenticate(expired);

    expect((err as HttpResponseError).statusCode).to.eq(401);
    expect(warnings).to.deep.eq([]);
  });
});
