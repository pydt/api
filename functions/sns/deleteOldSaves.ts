import { Config } from '../../lib/config';
import { loggingHandler } from '../../lib/logging';
import { IS3Provider, S3_PROVIDER_SYMBOL } from '../../lib/s3Provider';
import { inject } from '../../lib/ioc';
import * as _ from 'lodash';
import { injectable } from 'inversify';

const TURNS_TO_SAVE = 40;

export const handler = loggingHandler(async (event, context, iocContainer) => {
  const dos = iocContainer.resolve(DeleteOldSaves);
  await dos.execute(event.Records[0].Sns.Message);
});

@injectable()
export class DeleteOldSaves {
  constructor(
    @inject(S3_PROVIDER_SYMBOL) private s3: IS3Provider
  ) {
  }

  public async execute(gameId: string) {
    const resp = await this.s3.listObjects(Config.resourcePrefix() + 'saves', gameId)
  
    if (!resp || !resp.Contents) {
      throw new Error(`No data returned for listObjectsV2, prefix: ${gameId}`);
    }
  
    if (resp.Contents.length > TURNS_TO_SAVE) {
      await this.s3.deleteObjects(
        Config.resourcePrefix() + 'saves',
          _.chain(resp.Contents)
            .orderBy(['Key'], ['asc'])
            .take(resp.Contents.length - TURNS_TO_SAVE)
            .map(obj => obj.Key)
            .value()
      );
    }
  }
}
