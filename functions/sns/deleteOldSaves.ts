import { Config } from '../../lib/config';
import { loggingHandler } from '../../lib/logging';
import { IS3Provider, S3_PROVIDER_SYMBOL } from '../../lib/s3Provider';
import * as _ from 'lodash';

const TURNS_TO_SAVE = 40;

export const handler = loggingHandler(async (event, context, iocContainer) => {
  const s3 = iocContainer.get<IS3Provider>(S3_PROVIDER_SYMBOL);
  
  const gameId = event.Records[0].Sns.Message;
  const resp = await s3.listObjects(Config.resourcePrefix() + 'saves', gameId)

  if (!resp || !resp.Contents) {
    throw new Error(`No data returned for listObjectsV2, prefix: ${gameId}`);
  }

  if (resp.Contents.length > TURNS_TO_SAVE) {
    await s3.deleteObjects(
      Config.resourcePrefix() + 'saves',
        _.chain(resp.Contents)
          .orderBy(['Key'], ['asc'])
          .take(resp.Contents.length - TURNS_TO_SAVE)
          .map(obj => obj.Key)
          .value()
    );
  }
});
