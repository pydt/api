import 'reflect-metadata';
import * as fs from 'fs';
import { expect } from 'chai';
import { describe, it } from 'mocha';
import { GameTurnService } from '../lib/services/gameTurnService';
import { Game, GameTurn, User } from '../lib/models';
import { IUserService } from '../lib/services/userService';
import { IS3Provider } from '../lib/s3Provider';
import { IGameTurnRepository } from '../lib/dynamoose/gameTurnRepository';
import { IUserRepository } from '../lib/dynamoose/userRepository';
import { IGameRepository } from '../lib/dynamoose/gameRepository';
import { ISnsProvider } from '../lib/snsProvider';
import { ISesProvider } from '../lib/email/sesProvider';
import { Civ5SaveHandler } from '../lib/saveHandlers/civ5SaveHandler';
import { ActorType } from '../lib/saveHandlers/saveHandler';

describe('GameTurnService', () => {

  it('should skip turn correctly', async () => {
    const turnTimerMinutes = 60;
    const turnStartDate = new Date(new Date().getTime() - (turnTimerMinutes + 1) * 60000);

    const game = <Game> {
      createdBySteamId: "1",
      currentPlayerSteamId: "4",
      displayName: "Civ5 Test",
      gameId: "testGame",
      gameTurnRangeKey: 20,
      gameType: "CIV5",
      humans: 4,
      lastTurnEndDate: turnStartDate,
      players: [
        {steamId:"1",civType:"LEADER_ALEXANDER"},
        {steamId:"2",civType:"LEADER_HIAWATHA"},
        {steamId:"3",civType:"LEADER_DARIUS"},
        {steamId:"4",civType:"LEADER_AUGUSTUS"}
      ],
      round: 4,
      turnTimerMinutes
    };

    const turn: GameTurn = {
      gameId: "testGame",
      playerSteamId: "4",
      round: 4,
      startDate: turnStartDate,
      turn: 20
    };

    const userService = <IUserService> {
      getUsersForGame: (game: Game) => {
        return Promise.resolve(game.players.map(x => <User>{ steamId: x.steamId, displayName: x.civType }));
      }
    };

    const gameRepository = <IGameRepository> {
      saveVersioned: (g => Promise.resolve(g))
    };

    const gameTurnRepository = <IGameTurnRepository> {
      saveVersioned: (m => Promise.resolve(m))
    };

    const userRepository = <IUserRepository> {
      saveVersioned: (u => Promise.resolve(u))
    };

    let skippedData: Buffer;

    const s3 = <IS3Provider> {
      getObject: (fp) => {
        expect(fp.Key.indexOf('/000020')).to.be.greaterThan(0);
        return Promise.resolve({ Body: fs.readFileSync('test/saves/civ5/000020.Civ5Save')});
      },
      putObject: (fp, data, isPublic) => {
        skippedData = data;
      }
    };

    const ses = <ISesProvider> {
      sendEmail: (subject, bodyTitle, bodyHtml, toAddress) => Promise.resolve()
    };

    const sns = <ISnsProvider> {
      turnSubmitted: (g => Promise.resolve())
    };

    const gts = new GameTurnService(userRepository, gameRepository, gameTurnRepository, userService, s3, ses, sns);
    await gts.skipTurn(game, turn);
    expect(skippedData).to.not.be.null;

    const handler = new Civ5SaveHandler(skippedData);
    expect(handler.civData[0].type).to.be.eq(ActorType.HUMAN);
    expect(handler.civData[0].isCurrentTurn).to.be.true;
    expect(handler.civData[0].password).to.be.empty;
    expect(handler.civData[0].playerName).to.be.eq(game.players[0].civType);
    expect(handler.civData[1].type).to.be.eq(ActorType.HUMAN);
    expect(handler.civData[1].isCurrentTurn).to.be.false;
    expect(handler.civData[1].password).to.not.be.empty;
    expect(handler.civData[1].playerName).to.be.eq(game.players[1].civType);
    expect(handler.civData[2].type).to.be.eq(ActorType.HUMAN);
    expect(handler.civData[2].isCurrentTurn).to.be.false;
    expect(handler.civData[2].password).to.not.be.empty;
    expect(handler.civData[2].playerName).to.be.eq(game.players[2].civType);
    expect(handler.civData[3].type).to.be.eq(ActorType.AI);
    expect(handler.civData[3].isCurrentTurn).to.be.false;
    expect(handler.civData[3].password).to.not.be.empty;
    expect(handler.civData[3].playerName).to.be.eq(game.players[3].civType);
  });

});