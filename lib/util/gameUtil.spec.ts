import 'reflect-metadata';
import { expect } from 'chai';
import { describe, it } from 'mocha';
import { Game } from '../models';
import { GameUtil, HASHED_PASSWORD_PLACEHOLDER } from './gameUtil';

const ADMIN = '76561190000000001';
const PLAYER = '76561190000000002';
const OUTSIDER = '76561190000000003';

const game = (overrides: Partial<Game> = {}): Game =>
  ({
    gameId: 'g1',
    createdBySteamId: ADMIN,
    displayName: 'Test game',
    players: [{ steamId: ADMIN }, { steamId: PLAYER }],
    webhookUrl: 'https://discord.com/api/webhooks/123/secret',
    hashedPassword: '$2a$10$abcdefghijklmnopqrstuv',
    ...overrides
  }) as Game;

const roundTrip = (data: unknown, viewer?: string) =>
  JSON.parse(JSON.stringify(data, GameUtil.jsonReplacerForViewer(viewer)));

describe('GameUtil.sanitizeForViewer', () => {
  it('shows the admin everything', () => {
    const g = game();
    const result = GameUtil.sanitizeForViewer(g, ADMIN);

    expect(result.webhookUrl).to.eq(g.webhookUrl);
    expect(result.hashedPassword).to.eq(g.hashedPassword);
  });

  it('shows other players in the game the webhook URL, but not the password hash', () => {
    const result = GameUtil.sanitizeForViewer(game(), PLAYER);

    expect(result.webhookUrl).to.eq('https://discord.com/api/webhooks/123/secret');
    expect(result.hashedPassword).to.eq(HASHED_PASSWORD_PLACEHOLDER);
  });

  it('hides the webhook URL and password hash from users not in the game', () => {
    const result = GameUtil.sanitizeForViewer(game(), OUTSIDER);

    expect(result).to.not.have.property('webhookUrl');
    expect(result.hashedPassword).to.eq(HASHED_PASSWORD_PLACEHOLDER);
    expect(result.displayName).to.eq('Test game');
    expect(result.players).to.have.length(2);
  });

  it('hides them from anonymous viewers', () => {
    const result = GameUtil.sanitizeForViewer(game(), undefined);

    expect(result).to.not.have.property('webhookUrl');
    expect(result.hashedPassword).to.eq(HASHED_PASSWORD_PLACEHOLDER);
  });

  it('leaves games without a password looking password-free', () => {
    expect(
      GameUtil.sanitizeForViewer(game({ hashedPassword: undefined }), PLAYER).hashedPassword
    ).to.eq(undefined);
    expect(GameUtil.sanitizeForViewer(game({ hashedPassword: '' }), PLAYER).hashedPassword).to.eq(
      ''
    );
  });

  it("doesn't modify the original game", () => {
    const g = game();
    GameUtil.sanitizeForViewer(g, OUTSIDER);

    expect(g.webhookUrl).to.eq('https://discord.com/api/webhooks/123/secret');
    expect(g.hashedPassword).to.eq('$2a$10$abcdefghijklmnopqrstuv');
  });
});

describe('GameUtil.jsonReplacerForViewer', () => {
  it('sanitizes a single game', () => {
    const result = roundTrip(game(), OUTSIDER);

    expect(result).to.not.have.property('webhookUrl');
    expect(result.hashedPassword).to.eq(HASHED_PASSWORD_PLACEHOLDER);
  });

  it('sanitizes games nested in lists and response objects', () => {
    // Shapes like OpenGamesResponse / GamesByUserResponse
    const result = roundTrip(
      { notStarted: [game({ gameId: 'a' })], openSlots: [game({ gameId: 'b' })] },
      OUTSIDER
    );

    for (const g of [...result.notStarted, ...result.openSlots]) {
      expect(g).to.not.have.property('webhookUrl');
      expect(g.hashedPassword).to.eq(HASHED_PASSWORD_PLACEHOLDER);
    }
  });

  it('only reveals the webhook on the games the viewer is in', () => {
    const result = roundTrip(
      [
        game({ gameId: 'mine' }),
        game({
          gameId: 'theirs',
          createdBySteamId: OUTSIDER,
          players: [{ steamId: OUTSIDER }] as Game['players']
        })
      ],
      PLAYER
    );

    expect(result[0].webhookUrl).to.eq('https://discord.com/api/webhooks/123/secret');
    expect(result[1]).to.not.have.property('webhookUrl');
  });

  it('uses toJSON output, the way dynamoose items serialize', () => {
    const item = { toJSON: () => game() };

    expect(roundTrip(item, OUTSIDER)).to.not.have.property('webhookUrl');
  });

  it('leaves things that are not games alone', () => {
    // A game turn has a gameId but isn't a game
    const turn = { gameId: 'g1', turn: 5, playerSteamId: PLAYER, webhookUrl: 'not-a-game-field' };

    expect(roundTrip(turn, undefined)).to.deep.eq(turn);
  });
});
