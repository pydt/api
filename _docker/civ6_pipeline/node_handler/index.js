const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { execSync } = require('child_process');
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

let callNum = 0;

exports.handler = async function (event) {
  let inputParams;

  try {
    const baseDir = `/tmp/${callNum++}`;

    const message = JSON.parse(event.Records[0].Sns.Message);
    inputParams = message.inputParams;
    const outputParams = message.outputParams;

    let input;

    if (inputParams.Bucket === 'test') {
      input = await fs.readFile(inputParams.Key);
    } else {
      const s3Resp = await s3.send(new GetObjectCommand(inputParams));
      input = Buffer.from(await s3Resp.Body.transformToByteArray());
    }

    const inputFile = `${baseDir}/${inputParams.Key}`;
    const outputDir = `${baseDir}/output`;

    await fs.mkdir(path.dirname(inputFile), { recursive: true });
    await fs.mkdir(outputDir, { recursive: true });

    try {
      await fs.writeFile(inputFile, input);

      try {
        execSync(
          `/civ6_pipeline/target/native/civ6_save_renderer/parse_header/parse_header -i ${inputFile} -o ${outputDir}/header.yaml`
        );
        execSync(
          `/civ6_pipeline/target/native/civ6_save_renderer/parse_map/parse_map -i ${inputFile} -o ${outputDir}/map.tsv`
        );
        execSync(
          `/civ6_pipeline/target/native/civ6_save_renderer/plot_map/plot_map -y ${outputDir}/header.yaml -t ${outputDir}/map.tsv -o ${outputDir}/map.pdf`
        );
        execSync(
          `/civ6_pipeline/target/native/civ6_save_renderer/convert_plot/convert_plot -i ${outputDir}/map.pdf -o ${outputDir}/map.png`
        );
      } catch (err) {
        throw new Error(`Processing failed!
  stdout: ${err.stdout.toString()}
  stderr: ${err.stderr.toString()}`);
      }

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
        await fs.writeFile(
          `${outputParams.Key}/map.png`,
          await fs.readFile(`${outputDir}/map.png`)
        );
      } else {
        await s3.send(
          new PutObjectCommand({
            ...outputParams,
            Body: await fs.readFile(`${outputDir}/map.png`),
            StorageClass: 'INTELLIGENT_TIERING'
          })
        );
      }
    } finally {
      await fs.rm(baseDir, { recursive: true, force: true });
    }
  } catch (err) {
    if (inputParams.Bucket !== 'test') {
      rollbar.error(err, { inputParams });
      await new Promise(resolve => {
        rollbar.wait(resolve);
      });
    }

    throw err;
  }
};
