import { Config } from '../../lib/config';
import { loggingHandler } from '../../lib/logging';
import { IS3Provider, S3_PROVIDER_SYMBOL } from '../../lib/s3Provider';
import { inject } from '../../lib/ioc';
import { injectable } from 'inversify';
import { drop, orderBy, take } from 'lodash';

const TURNS_TO_SAVE = 40;

export const handler = loggingHandler(async (event, context, iocContainer) => {
  const dos = iocContainer.resolve(DeleteOldSaves);
  await dos.execute(event.Records[0].Sns.Message);
});

@injectable()
export class DeleteOldSaves {
  constructor(@inject(S3_PROVIDER_SYMBOL) private s3: IS3Provider) {}

  public async execute(gameId: string) {
    // Now that we're saving images, the images are being included in the delete check!!!
    // Make sure we're only looking at the pure save folder!!!111
    const resp = await this.s3.listObjects(Config.resourcePrefix + 'saves', `${gameId}/`);

    if (resp.Contents.length > TURNS_TO_SAVE + 1) {
      await this.s3.deleteObjects(
        Config.resourcePrefix + 'saves',
        take(
          // drop to always keep the first save
          drop(orderBy(resp.Contents, ['Key'], ['asc'])),
          resp.Contents.length - TURNS_TO_SAVE
        ).map(obj => obj.Key)
      );
    }
  }
}
