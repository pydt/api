import { AWS } from './config';
import { provideSingleton } from './ioc';
import { Config } from './config';
import { Game } from './models';
import { SNS_MESSAGES, UserGameCacheUpdatedPayload } from './models/sns';
const sns = new AWS.SNS();
const sts = new AWS.STS();

export const SNS_PROVIDER_SYMBOL = Symbol('ISnsProvider');

export interface ISnsProvider {
  turnSubmitted(game: Game): Promise<void>;
  gameUpdated(game: Game): Promise<void>;
  userGameCacheUpdated(payload: UserGameCacheUpdatedPayload): Promise<void>;
}

@provideSingleton(SNS_PROVIDER_SYMBOL)
export class SnsProvider implements ISnsProvider {
  public async turnSubmitted(game: Game) {
    await this.sendMessage(Config.resourcePrefix + SNS_MESSAGES.TURN_SUBMITTED, SNS_MESSAGES.TURN_SUBMITTED, game.gameId);
  }

  public async gameUpdated(game: Game) {
    await this.sendMessage(Config.resourcePrefix + SNS_MESSAGES.GAME_UPDATED, SNS_MESSAGES.GAME_UPDATED, game.gameId);
  }

  public async userGameCacheUpdated(payload: UserGameCacheUpdatedPayload) {
    await this.sendMessage(
      Config.resourcePrefix + SNS_MESSAGES.USER_GAME_CACHE_UPDATED,
      SNS_MESSAGES.USER_GAME_CACHE_UPDATED,
      JSON.stringify(payload)
    );
  }

  private async sendMessage(topic: string, subject: string, message: string) {
    const identity = await sts.getCallerIdentity({}).promise();

    const params = {
      Message: message,
      Subject: subject,
      TopicArn: 'arn:aws:sns:us-east-1:' + identity.Account + ':' + topic
    };

    return sns.publish(params).promise();
  }
}
