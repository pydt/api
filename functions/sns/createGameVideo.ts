import { Config } from '../../lib/config';
import { loggingHandler } from '../../lib/logging';
import { IS3Provider, S3_PROVIDER_SYMBOL } from '../../lib/s3Provider';
import { inject } from '../../lib/ioc';
import { injectable } from 'inversify';
import { execSync } from 'child_process';
import * as fs from 'fs/promises';
import { GAME_REPOSITORY_SYMBOL, IGameRepository } from '../../lib/dynamoose/gameRepository';
import {
  GAME_TURN_REPOSITORY_SYMBOL,
  IGameTurnRepository
} from '../../lib/dynamoose/gameTurnRepository';
import { ISnsProvider, SNS_PROVIDER_SYMBOL } from '../../lib/snsProvider';

export const handler = loggingHandler(async (event, context, iocContainer) => {
  const dos = iocContainer.resolve(CreateGameVideo);
  await dos.execute(event.Records[0].Sns.Message);
});

let callNum = 0;

@injectable()
export class CreateGameVideo {
  constructor(
    @inject(GAME_REPOSITORY_SYMBOL) private gameRepository: IGameRepository,
    @inject(GAME_TURN_REPOSITORY_SYMBOL) private gameTurnRepository: IGameTurnRepository,
    @inject(S3_PROVIDER_SYMBOL) private s3: IS3Provider,
    @inject(SNS_PROVIDER_SYMBOL) private sns: ISnsProvider
  ) {}

  public async execute(gameId: string) {
    const game = await this.gameRepository.get(gameId.replace('REGENERATE_IMAGES:', ''));

    if (gameId.startsWith('REGENERATE_IMAGES:')) {
      const turns = await this.gameTurnRepository.getTurnsForGame(
        game.gameId,
        game.gameTurnRangeKey - 20,
        game.gameTurnRangeKey
      );

      let round = -1;

      for (const turn of turns) {
        if (turn.round !== round) {
          round = turn.round;
          await this.sns.createTurnImage(game, turn.turn, turn.round);
        }
      }

      return;
    }

    const Bucket = Config.resourcePrefix + 'saves';
    const baseDir = `/tmp/${callNum++}`;

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

          game.gameVideoUrl = `https://${Config.resourcePrefix}saves.s3-accelerate.amazonaws.com/${videoKey}`;
          await this.gameRepository.saveVersioned(game);
        } finally {
          await fs.rm(baseDir, { recursive: true, force: true });
        }
      }
    }
  }
}
