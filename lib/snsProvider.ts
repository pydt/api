import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { provideSingleton } from './ioc';
import { Config } from './config';
import { traceAwsClient } from './xray';
import { Game } from './models';
import { GAME_STATE_IMAGE_MESSAGES, SNS_MESSAGES, UserGameCacheUpdatedPayload } from './models/sns';
import { GameUtil } from './util/gameUtil';

const sns = traceAwsClient(
  new SNSClient({
    region: Config.region
  })
);
const sts = traceAwsClient(
  new STSClient({
    region: Config.region
  })
);

// The account id never changes, so look it up once per container instead of before every publish
let accountId: Promise<string>;
const getAccountId = () =>
  (accountId ??= sts.send(new GetCallerIdentityCommand({})).then(x => x.Account)).catch(e => {
    accountId = undefined;
    throw e;
  });

export const SNS_PROVIDER_SYMBOL = Symbol('ISnsProvider');

export interface ISnsProvider {
  turnSubmitted(game: Game, createTurnImage?: boolean): Promise<void>;
  gameUpdated(game: Game): Promise<void>;
  userGameCacheUpdated(payload: UserGameCacheUpdatedPayload): Promise<void>;
  gameFinalized(game: Game): Promise<void>;
  createTurnImage(game: Game, gameTurnRangeKey?: number, round?: number): Promise<void>;
}

@provideSingleton(SNS_PROVIDER_SYMBOL)
export class SnsProvider implements ISnsProvider {
  public async turnSubmitted(game: Game, createTurnImage?: boolean) {
    await this.sendMessage(
      Config.resourcePrefix + SNS_MESSAGES.TURN_SUBMITTED,
      SNS_MESSAGES.TURN_SUBMITTED,
      game.gameId
    );

    if (createTurnImage) {
      await this.createTurnImage(game);
    }
  }

  public async createTurnImage(game: Game, gameTurnRangeKey?: number, round?: number) {
    const topic = GAME_STATE_IMAGE_MESSAGES[game.gameType];

    if (topic) {
      await this.sendMessage(
        Config.resourcePrefix + topic,
        topic,
        JSON.stringify({
          inputParams: {
            Bucket: Config.resourcePrefix + 'saves',
            Key: GameUtil.createS3SaveKey(game.gameId, gameTurnRangeKey || game.gameTurnRangeKey)
          },
          outputParams: {
            Bucket: Config.resourcePrefix + 'saves',
            Key: GameUtil.createS3ImageKey(game.gameId, round || game.round)
          }
        })
      );
    }
  }

  public async gameUpdated(game: Game) {
    await this.sendMessage(
      Config.resourcePrefix + SNS_MESSAGES.GAME_UPDATED,
      SNS_MESSAGES.GAME_UPDATED,
      game.gameId
    );
  }

  public async userGameCacheUpdated(payload: UserGameCacheUpdatedPayload) {
    await this.sendMessage(
      Config.resourcePrefix + SNS_MESSAGES.USER_GAME_CACHE_UPDATED,
      SNS_MESSAGES.USER_GAME_CACHE_UPDATED,
      JSON.stringify(payload)
    );
  }

  private async sendMessage(topic: string, subject: string, message: string) {
    const account = await getAccountId();

    return sns.send(
      new PublishCommand({
        Message: message,
        Subject: subject,
        TopicArn: 'arn:aws:sns:us-east-1:' + account + ':' + topic
      })
    );
  }

  public async gameFinalized(game: Game) {
    await this.sendMessage(
      Config.resourcePrefix + SNS_MESSAGES.GAME_FINALIZED,
      SNS_MESSAGES.GAME_FINALIZED,
      game.gameId
    );
  }
}
