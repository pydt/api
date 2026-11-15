import 'reflect-metadata';
import { expect } from 'chai';
import { aws as dynamooseAws, Table } from 'dynamoose';
import { before, describe, it } from 'mocha';
import { v4 as uuid } from 'uuid';
import { JwtUtil } from '../lib/auth/jwtUtil';
import { Config } from '../lib/config';
import { GameRepository } from '../lib/dynamoose/gameRepository';
import { PrivateUserDataRepository } from '../lib/dynamoose/privateUserDataRepository';
import { CIV6_GAME } from '../lib/metadata/civGames/civ6';
import { Game, PrivateUserData } from '../lib/models';
import { HASHED_PASSWORD_PLACEHOLDER } from '../lib/util/gameUtil';
import { LambdaProxyEvent } from './framework';
import { handler } from './router';

// End to end through the real Lambda handler (tsoa routes, auth, HttpResponse) against local
// DynamoDB: a game's webhook URL and password hash only go to the game's admin. Forum #9628.

dynamooseAws.ddb.set(
  new dynamooseAws.ddb.DynamoDB({ endpoint: 'http://localhost:8000', region: Config.region })
);
Table.defaults.set({ create: true });

const WEBHOOK = 'https://discord.com/api/webhooks/123/secret';
const HASH = '$2a$10$abcdefghijklmnopqrstuv';

const get = async (path: string, token?: string) => {
  const event: LambdaProxyEvent = {
    headers: token ? { Authorization: token } : {},
    body: undefined,
    pathParameters: {},
    queryStringParameters: {},
    requestContext: {
      http: { method: 'GET', path, sourceIp: '127.0.0.1' },
      connectionId: undefined,
      routeKey: undefined
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resp: any = await handler(event, {});
  return { status: resp.statusCode, body: JSON.parse(resp.body) };
};

describe('Game webhook/password privacy (real handler + DynamoDB)', () => {
  const GAME_ID = uuid();
  const ADMIN = uuid();
  const PLAYER = uuid();
  let adminToken: string;
  let playerToken: string;

  before(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'integration-secret';

    await new GameRepository().saveVersioned({
      gameId: GAME_ID,
      displayName: 'privacy test',
      gameType: CIV6_GAME.id,
      createdBySteamId: ADMIN,
      currentPlayerSteamId: ADMIN,
      slots: 2,
      humans: 2,
      inProgress: false,
      players: [{ steamId: ADMIN }, { steamId: PLAYER }],
      webhookUrl: WEBHOOK,
      hashedPassword: HASH
    } as Game);

    // validateNonce looks up each user's private data; no tokenNonce matches a token without one
    const pudRepo = new PrivateUserDataRepository();
    await pudRepo.saveVersioned({ steamId: ADMIN } as PrivateUserData);
    await pudRepo.saveVersioned({ steamId: PLAYER } as PrivateUserData);

    adminToken = JwtUtil.createToken({ steamId: ADMIN });
    playerToken = JwtUtil.createToken({ steamId: PLAYER });
  });

  it('hides them from anonymous viewers', async () => {
    const { status, body } = await get(`/game/${GAME_ID}`);

    expect(status).to.eq(200);
    expect(body).to.not.have.property('webhookUrl');
    expect(body.hashedPassword).to.eq(HASHED_PASSWORD_PLACEHOLDER);
    expect(body.displayName).to.eq('privacy test');
  });

  it('hides them from other logged-in players', async () => {
    const { body } = await get(`/game/${GAME_ID}`, playerToken);

    expect(body).to.not.have.property('webhookUrl');
    expect(body.hashedPassword).to.eq(HASHED_PASSWORD_PLACEHOLDER);
  });

  it("shows them to the game's admin", async () => {
    const { body } = await get(`/game/${GAME_ID}`, adminToken);

    expect(body.webhookUrl).to.eq(WEBHOOK);
    expect(body.hashedPassword).to.eq(HASH);
  });

  it('treats a bad token as anonymous on a public endpoint', async () => {
    const { status, body } = await get(`/game/${GAME_ID}`, 'not-a-real-token');

    expect(status).to.eq(200);
    expect(body).to.not.have.property('webhookUrl');
  });

  it('strips them from the public open-games list', async () => {
    const { body } = await get('/game/listOpen');
    const ours = [...(body.notStarted || []), ...(body.openSlots || [])].find(
      g => g.gameId === GAME_ID
    );

    // The game may or may not qualify for the list; if it shows up, it must be sanitized
    if (ours) {
      expect(ours).to.not.have.property('webhookUrl');
      expect(ours.hashedPassword).to.eq(HASHED_PASSWORD_PLACEHOLDER);
    }

    expect(JSON.stringify(body)).to.not.contain(WEBHOOK);
    expect(JSON.stringify(body)).to.not.contain(HASH);
  });
});
