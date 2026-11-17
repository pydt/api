import { Config } from '../../lib/config';
import { loggingHandler, pydtLogger } from '../../lib/logging';
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

  public async execute(message: string) {
    const regenerate = message.startsWith('REGENERATE_IMAGES:');
    const gameId = message.replace('REGENERATE_IMAGES:', '');
    const game = await this.gameRepository.get(gameId);

    if (!game) {
      pydtLogger.warn(`Game ${gameId} not found, can't create images/video`);
      return;
    }

    const job = { gameId, displayName: game.displayName, round: game.round };

    if (regenerate) {
      const turns = await this.gameTurnRepository.getTurnsForGame(
        game.gameId,
        game.gameTurnRangeKey - 20,
        game.gameTurnRangeKey
      );

      let round = -1;
      const rounds: number[] = [];

      for (const turn of turns) {
        if (turn.round !== round) {
          round = turn.round;
          rounds.push(round);
          await this.sns.createTurnImage(game, turn.turn, turn.round);
        }
      }

      pydtLogger.info('Requested regenerated game images', undefined, {
        ...job,
        turns: turns.length,
        rounds
      });

      return;
    }

    if (!game.finalized) {
      pydtLogger.info('Game not finalized, not creating video', undefined, job);
      return;
    }

    const Bucket = Config.resourcePrefix + 'saves';
    const resp = await this.s3.listObjects(Bucket, `${gameId}_images/`);

    if (!resp?.Contents?.length) {
      pydtLogger.info('No game images found, not creating video', undefined, job);
      return;
    }

    const start = Date.now();
    const baseDir = `/tmp/${callNum++}`;

    pydtLogger.info('Creating game video', undefined, { ...job, frames: resp.Contents.length });

    if (resp.IsTruncated) {
      // listObjects doesn't page, so S3 only returned the first 1000 images
      pydtLogger.warn(
        'Game has more images than one S3 listing returns, video will be cut short',
        undefined,
        { ...job, frames: resp.Contents.length }
      );
    }

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

      const downloadMs = Date.now() - start;
      const ffmpegStart = Date.now();

      try {
        execSync(
          `cd ${baseDir};/opt/bin/ffmpeg -hide_banner -loglevel error -framerate 4 -i "concat:${[
            ...Array(fileNum).keys()
          ]
            .map(x => `${x}.png`)
            .join('|')}" -c:v libvpx-vp9 -pix_fmt yuva420p -y "${baseDir}/output.webm"`
        );
      } catch (err) {
        throw new Error(`Processing failed for game ${gameId}!
stdout: ${err.stdout.toString()}
stderr: ${err.stderr.toString()}`);
      }

      const ffmpegMs = Date.now() - ffmpegStart;
      const videoKey = `${gameId}_video/video.webm`;
      const video = await fs.readFile(`${baseDir}/output.webm`);

      await this.s3.putObject(
        {
          Bucket,
          Key: videoKey
        },
        video,
        true
      );

      game.gameVideoUrl = `https://${Config.resourcePrefix}saves.s3-accelerate.amazonaws.com/${videoKey}`;
      await this.gameRepository.saveVersioned(game);

      pydtLogger.info('Created game video', undefined, {
        ...job,
        frames: fileNum,
        videoBytes: video.length,
        downloadMs,
        ffmpegMs,
        totalMs: Date.now() - start,
        url: game.gameVideoUrl
      });
    } finally {
      await fs.rm(baseDir, { recursive: true, force: true });
    }
  }
}
