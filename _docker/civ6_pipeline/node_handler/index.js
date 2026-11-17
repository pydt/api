const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { spawnSync } = require('child_process');
const fs = require('fs/promises');
const path = require('path');
const Rollbar = require('rollbar');

const rollbar = new Rollbar({
  accessToken: process.env.ROLLBAR_API_KEY,
  autoInstrument: false,
  reportLevel: 'warning',
  itemsPerMinute: 5,
  payload: {
    environment: process.env.SERVERLESS_STAGE
  }
});

const s3 = new S3Client({
  region: 'us-east-1'
});

const PIPELINE_DIR = '/civ6_pipeline/target/native/civ6_save_renderer';

// A normal step takes a few seconds; a stuck one (e.g. the header parser on a
// truncated save) would otherwise run until the Lambda itself times out.
const STEP_TIMEOUT_MS = 60 * 1000;

let callNum = 0;

// Save keys look like `${gameId}/000123.CivXSave` and image keys like
// `${gameId}_images/000045.png`; pull the game, turn and round out of them.
function describeJob(inputParams, outputParams) {
  const saveMatch = /([^/]+)\/(\d+)\.\w+$/.exec(inputParams?.Key || '');
  const imageMatch = /(\d+)\.png$/.exec(outputParams?.Key || '');

  return {
    gameId: saveMatch?.[1],
    turn: saveMatch ? parseInt(saveMatch[2], 10) : undefined,
    round: imageMatch ? parseInt(imageMatch[1], 10) : undefined
  };
}

function log(message, details) {
  console.log(`${message} ${JSON.stringify(details)}`);
}

class StepError extends Error {
  constructor(step, result) {
    super(`Processing failed in ${step}!
  stdout: ${result.stdout || ''}
  stderr: ${result.stderr || result.error?.message || `exit code ${result.status}, signal ${result.signal}`}`);
    this.step = step;
  }
}

function runStep(job, timings, step, args) {
  const start = Date.now();

  // Capture output instead of letting it go straight to the Lambda log, so
  // anything a step prints is tagged with the game it belongs to.
  const result = spawnSync(`${PIPELINE_DIR}/${step}/${step}`, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
    env: { ...process.env, NODE_NO_WARNINGS: '1' },
    timeout: STEP_TIMEOUT_MS
  });

  timings[step] = Date.now() - start;

  if (result.error?.code === 'ETIMEDOUT') {
    throw new StepError(step, { ...result, stderr: `timed out after ${STEP_TIMEOUT_MS / 1000}s` });
  }

  if (result.error || result.status !== 0) {
    throw new StepError(step, result);
  }

  const output = [result.stdout, result.stderr].map(x => x?.trim()).filter(Boolean).join('\n');

  if (output) {
    log(`${step} output`, { ...job, output });
  }
}

exports.handler = async function (event) {
  const start = Date.now();
  let inputParams;
  let outputParams;
  let job = {};
  const timings = {};

  try {
    const baseDir = `/tmp/${callNum++}`;

    const message = JSON.parse(event.Records[0].Sns.Message);
    inputParams = message.inputParams;
    outputParams = message.outputParams;
    job = describeJob(inputParams, outputParams);

    log('Creating game image', { ...job, input: inputParams.Key, output: outputParams.Key });

    let input;
    const downloadStart = Date.now();

    if (inputParams.Bucket === 'test') {
      input = await fs.readFile(inputParams.Key);
    } else {
      const s3Resp = await s3.send(new GetObjectCommand(inputParams));
      input = Buffer.from(await s3Resp.Body.transformToByteArray());
    }

    timings.download = Date.now() - downloadStart;

    const inputFile = `${baseDir}/${inputParams.Key}`;
    const outputDir = `${baseDir}/output`;

    await fs.mkdir(path.dirname(inputFile), { recursive: true });
    await fs.mkdir(outputDir, { recursive: true });

    try {
      await fs.writeFile(inputFile, input);

      runStep(job, timings, 'parse_header', ['-i', inputFile, '-o', `${outputDir}/header.yaml`]);
      runStep(job, timings, 'parse_map', ['-i', inputFile, '-o', `${outputDir}/map.tsv`]);
      runStep(job, timings, 'plot_map', [
        '-y',
        `${outputDir}/header.yaml`,
        '-t',
        `${outputDir}/map.tsv`,
        '-o',
        `${outputDir}/map.pdf`
      ]);
      runStep(job, timings, 'convert_plot', ['-i', `${outputDir}/map.pdf`, '-o', `${outputDir}/map.png`]);

      const png = await fs.readFile(`${outputDir}/map.png`);
      const tiles = (await fs.readFile(`${outputDir}/map.tsv`, 'utf8')).trimEnd().split('\n').length - 1;
      const uploadStart = Date.now();

      if (outputParams.Bucket === 'test') {
        await fs.rm(outputParams.Key, { recursive: true, force: true });
        await fs.mkdir(outputParams.Key, { recursive: true });

        await fs.writeFile(
          `${outputParams.Key}/header.yaml`,
          await fs.readFile(`${outputDir}/header.yaml`)
        );
        await fs.writeFile(
          `${outputParams.Key}/map.tsv`,
          await fs.readFile(`${outputDir}/map.tsv`)
        );
        await fs.writeFile(`${outputParams.Key}/map.png`, png);
      } else {
        await s3.send(
          new PutObjectCommand({
            ...outputParams,
            Body: png,
            StorageClass: 'INTELLIGENT_TIERING'
          })
        );
      }

      timings.upload = Date.now() - uploadStart;

      log('Created game image', {
        ...job,
        saveBytes: input.length,
        imageBytes: png.length,
        tiles,
        totalMs: Date.now() - start,
        stepMs: timings
      });
    } finally {
      await fs.rm(baseDir, { recursive: true, force: true });
    }
  } catch (err) {
    log('Failed to create game image', {
      ...job,
      step: err.step,
      totalMs: Date.now() - start,
      stepMs: timings
    });

    if (inputParams?.Bucket !== 'test') {
      rollbar.error(err, { ...job, step: err.step, inputParams, outputParams });
      await new Promise(resolve => {
        rollbar.wait(resolve);
      });
    }

    throw err;
  }
};
