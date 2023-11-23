import { GetQueueUrlCommand, SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { provideSingleton } from './ioc';
import { Config } from './config';
import { GameTurn } from './models';

const sqs = new SQSClient({
  region: Config.region
});

export interface GlobalStatsUpdateMessage {
  turn: GameTurn;
  undo: boolean;
  gameType: string;
}

export const SQS_PROVIDER_SYMBOL = Symbol('ISqsProvider');

export interface ISqsProvider {
  queueTurnForGlobalData(message: GlobalStatsUpdateMessage): Promise<void>;
}

@provideSingleton(SQS_PROVIDER_SYMBOL)
export class SqsProvider implements ISqsProvider {
  public async queueTurnForGlobalData(message: GlobalStatsUpdateMessage) {
    await this.sendMessage(
      Config.resourcePrefix + 'global-stats-update.fifo',
      JSON.stringify(message)
    );
  }

  private async sendMessage(queue: string, body: string) {
    const queueUrl = await sqs.send(new GetQueueUrlCommand({ QueueName: queue }));

    return sqs.send(
      new SendMessageCommand({
        MessageBody: body,
        QueueUrl: queueUrl.QueueUrl,
        MessageGroupId: queue
      })
    );
  }
}
