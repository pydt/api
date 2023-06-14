import { Config } from '../../lib/config';
import { loggingHandler } from '../../lib/logging';
import { IS3Provider, S3_PROVIDER_SYMBOL } from '../../lib/s3Provider';
import { inject } from '../../lib/ioc';
import { injectable } from 'inversify';
import { execSync } from 'child_process';
import * as fs from 'fs/promises';
import { GAME_REPOSITORY_SYMBOL, IGameRepository } from '../../lib/dynamoose/gameRepository';

export const handler = loggingHandler(async (event, context, iocContainer) => {
  const dos = iocContainer.resolve(CreateGameVideo);
  await dos.execute(event.Records[0].Sns.Message);
});

let callNum = 0;

@injectable()
export class CreateGameVideo {
  constructor(
    @inject(GAME_REPOSITORY_SYMBOL) private gameRepository: IGameRepository,
    @inject(S3_PROVIDER_SYMBOL) private s3: IS3Provider
  ) {}

  public async execute(gameId: string) {
    const Bucket = Config.resourcePrefix + 'saves';
    const baseDir = `/tmp/${callNum++}`;
    const game = await this.gameRepository.get(gameId);

    if (game.finalized) {
      const resp = await this.s3.listObjects(Bucket, `${gameId}_images/`);

      if (resp && resp.Contents?.length) {
        try {
          await fs.mkdir(baseDir, { recursive: true });

          let fileNum = 0;

          for (const file of resp.Contents) {
            const data = await this.s3.getObject({
              Bucket,
              Key: file.Key
            });

            await fs.writeFile(`${baseDir}/${fileNum++}.png`, data.Body);
          }

          try {
            execSync(
              `cd ${baseDir};/opt/bin/ffmpeg -framerate 4 -i "concat:${[...Array(fileNum).keys()]
                .map(x => `${x}.png`)
                .join('|')}" -c:v libvpx-vp9 -pix_fmt yuva420p -y "${baseDir}/output.webm"`
            );
          } catch (err) {
            throw new Error(`Processing failed!
stdout: ${err.stdout.toString()}
stderr: ${err.stderr.toString()}`);
          }

          const videoKey = `${gameId}_video/video.webm`;

          await this.s3.putObject(
            {
              Bucket,
              Key: videoKey
            },
            await fs.readFile(`${baseDir}/output.webm`),
            true
          );

          game.gameVideoUrl = `https://${Config.resourcePrefix}saves.s3.amazonaws.com/${videoKey}`;
          await this.gameRepository.saveVersioned(game);
        } finally {
          await fs.rm(baseDir, { recursive: true, force: true });
        }
      }
    }
  }
}
