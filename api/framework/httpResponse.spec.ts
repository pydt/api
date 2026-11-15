import 'reflect-metadata';
import { expect } from 'chai';
import { describe, it } from 'mocha';
import { HASHED_PASSWORD_PLACEHOLDER } from '../../lib/util/gameUtil';
import { HttpRequest } from './httpRequest';
import { HttpResponse } from './httpResponse';
import { LambdaProxyEvent } from './lambdaProxyEvent';

const ADMIN = '76561190000000001';

const event = (): LambdaProxyEvent => ({
  headers: {},
  body: undefined,
  pathParameters: {},
  queryStringParameters: {},
  requestContext: {
    http: { method: 'GET', path: '/game/g1', sourceIp: '127.0.0.1' },
    connectionId: undefined,
    routeKey: undefined
  }
});

const game = {
  gameId: 'g1',
  createdBySteamId: ADMIN,
  players: [{ steamId: ADMIN }],
  webhookUrl: 'https://discord.com/api/webhooks/123/secret',
  hashedPassword: '$2a$10$abcdefghijklmnopqrstuv'
};

// Send `data` as the given user (undefined = not logged in) and return the parsed response body
const send = (data: unknown, user?: string): Promise<Record<string, unknown>> =>
  new Promise((resolve, reject) => {
    const req = new HttpRequest(event());
    req.user = user;

    new HttpResponse((err, resp) => (err ? reject(err) : resolve(JSON.parse(resp.body))), req)
      .status(200)
      .json(data);
  });

describe('HttpResponse', () => {
  it('strips admin-only game fields for anonymous requests', async () => {
    const body = await send(game);

    expect(body).to.not.have.property('webhookUrl');
    expect(body.hashedPassword).to.eq(HASHED_PASSWORD_PLACEHOLDER);
    expect(body.gameId).to.eq('g1');
  });

  it("returns admin-only game fields to the game's admin", async () => {
    const body = await send(game, ADMIN);

    expect(body.webhookUrl).to.eq(game.webhookUrl);
    expect(body.hashedPassword).to.eq(game.hashedPassword);
  });
});
