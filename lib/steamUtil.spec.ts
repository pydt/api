import 'reflect-metadata';
import { expect } from 'chai';
import { afterEach, beforeEach, describe, it } from 'mocha';
import { HttpResponseError } from '../api/framework';
import { pydtLogger } from './logging';
import { steamLoginError } from './steamUtil';

const openIdError = (message: string) =>
  Object.assign(new Error(message), { name: 'InternalOpenIDError' });

describe('steamLoginError', () => {
  const originalWarn = pydtLogger.warn;
  let warnings: unknown[];

  beforeEach(() => {
    warnings = [];
    pydtLogger.warn = (message: unknown) => {
      warnings.push(message);
    };
  });

  afterEach(() => {
    pydtLogger.warn = originalWarn;
  });

  it('turns an unreachable Steam into a 503 and logs a warning', () => {
    const result = steamLoginError(
      openIdError('Failed to discover OP endpoint URL'),
      '/auth/steam'
    ) as HttpResponseError;

    expect(result).to.be.instanceOf(HttpResponseError);
    expect(result.statusCode).to.equal(503);
    expect(warnings).to.deep.equal(['Steam OpenID failure on /auth/steam']);
  });

  it('turns a failed assertion into a 400', () => {
    const result = steamLoginError(
      openIdError('Failed to verify assertion'),
      '/auth/steam/validate'
    ) as HttpResponseError;

    expect(result).to.be.instanceOf(HttpResponseError);
    expect(result.statusCode).to.equal(400);
    expect(warnings).to.have.length(1);
  });

  it('passes other errors through untouched', () => {
    const err = new Error('DynamoDB is sad');

    expect(steamLoginError(err, '/auth/steam/validate')).to.equal(err);
    expect(warnings).to.have.length(0);
  });
});
