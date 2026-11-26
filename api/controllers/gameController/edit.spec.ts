import 'reflect-metadata';
import { expect } from 'chai';
import { describe, it } from 'mocha';
import { It, Mock } from 'typemoq';
import { IGameRepository } from '../../../lib/dynamoose/gameRepository';
import { Game } from '../../../lib/models';
import { ISnsProvider } from '../../../lib/snsProvider';
import { HASHED_PASSWORD_PLACEHOLDER } from '../../../lib/util/gameUtil';
import { HttpRequest } from '../../framework';
import { GameController_Edit } from './edit';
import { GameRequestBody } from './_models';

const ADMIN = 'ADMIN';
const HASH = '$2a$10$abcdefghijklmnopqrstuv';
const WEBHOOK = 'https://discord.com/api/webhooks/123/secret';

// Run an edit as the admin and return the game that got saved
const runEdit = async (body: Partial<GameRequestBody>, gameTurnRangeKey = 10): Promise<Game> => {
  const stored = {
    gameId: 'g1',
    createdBySteamId: ADMIN,
    inProgress: true,
    gameTurnRangeKey,
    mapSize: 'SMALL',
    randomOnly: 'EITHER',
    slots: 2,
    humans: 2,
    players: [{ steamId: ADMIN }, { steamId: 'other' }],
    webhookUrl: WEBHOOK,
    hashedPassword: HASH
  } as Game;

  let saved: Game;
  const repo = Mock.ofType<IGameRepository>();
  repo.setup(x => x.getOrThrow404('g1')).returns(() => Promise.resolve(stored));
  repo
    .setup(x => x.saveVersioned(It.isAny()))
    .returns(g => {
      saved = g;
      return Promise.resolve(g);
    });

  const controller = new GameController_Edit(repo.object, Mock.ofType<ISnsProvider>().object);
  await controller.edit({ user: ADMIN } as HttpRequest, 'g1', {
    humans: 2,
    slots: 2,
    ...body
  } as GameRequestBody);

  return saved;
};

describe('GameController_Edit', () => {
  it('keeps the webhook when the form sends none back (editor saw the sanitized game)', async () => {
    expect((await runEdit({ password: HASH })).webhookUrl).to.eq(WEBHOOK);
  });

  it('still lets the admin clear the webhook with an empty string', async () => {
    expect((await runEdit({ password: HASH, webhookUrl: '' })).webhookUrl).to.eq('');
  });

  it('still lets the admin change the webhook', async () => {
    const url = 'https://discord.com/api/webhooks/456/new';

    expect((await runEdit({ password: HASH, webhookUrl: url })).webhookUrl).to.eq(url);
  });

  it('keeps the password when the form sends back the placeholder', async () => {
    expect((await runEdit({ password: HASHED_PASSWORD_PLACEHOLDER })).hashedPassword).to.eq(HASH);
  });

  it('keeps the password when the form sends back the real hash (current behavior)', async () => {
    expect((await runEdit({ password: HASH })).hashedPassword).to.eq(HASH);
  });

  it('still lets the admin set a new password or remove it', async () => {
    const changed = await runEdit({ password: 'new-password' });

    expect(changed.hashedPassword).to.not.eq(HASH);
    expect(changed.hashedPassword).to.match(/^\$2[aby]\$/);
    expect((await runEdit({ password: '' })).hashedPassword).to.eq('');
  });

  it('ignores setup fields once the game is past its first turn', async () => {
    const saved = await runEdit({
      password: HASH,
      slots: 6,
      mapSize: 'HUGE',
      randomOnly: 'FORCE_RANDOM'
    } as Partial<GameRequestBody>);

    expect(saved.slots).to.eq(2);
    expect(saved.mapSize).to.eq('SMALL');
    expect(saved.randomOnly).to.eq('EITHER');
    expect(saved.players.map(p => p.civType)).to.deep.eq([undefined, undefined]);
  });

  it('still lets setup fields change before the first turn is played', async () => {
    const saved = await runEdit(
      { password: HASH, slots: 6, mapSize: 'HUGE' } as Partial<GameRequestBody>,
      1
    );

    expect(saved.slots).to.eq(6);
    expect(saved.mapSize).to.eq('HUGE');
  });
});
