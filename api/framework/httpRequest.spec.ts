import 'reflect-metadata';
import { expect } from 'chai';
import { describe, it } from 'mocha';
import { HttpRequest } from './httpRequest';
import { LambdaProxyEvent } from './lambdaProxyEvent';

function event(body?: string): LambdaProxyEvent {
  return {
    headers: {},
    body,
    pathParameters: {},
    queryStringParameters: {},
    requestContext: {
      http: { method: 'POST', path: '/test', sourceIp: '127.0.0.1' },
      connectionId: undefined,
      routeKey: undefined
    }
  };
}

describe('HttpRequest', () => {
  it('parses a JSON body', () => {
    const req = new HttpRequest(event('{"a":1}'));

    expect(req.body).to.deep.eq({ a: 1 });
    expect(req.invalidJsonBody).to.eq(false);
  });

  it('flags a non-JSON body instead of throwing', () => {
    // What the scanner bots send (Rollbar API #851)
    const req = new HttpRequest(event('U0hPVyBjYXRhbG9ncw=='));

    expect(req.body).to.eq(undefined);
    expect(req.rawBody).to.eq('U0hPVyBjYXRhbG9ncw==');
    expect(req.invalidJsonBody).to.eq(true);
  });

  it('accepts a request with no body', () => {
    const req = new HttpRequest(event());

    expect(req.body).to.eq(undefined);
    expect(req.invalidJsonBody).to.eq(false);
  });
});
