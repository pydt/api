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
  try {
    const baseDir = `/tmp/${callNum++}`;

    const { inputParams, outputParams } = JSON.parse(event.Records[0].Sns.Message);

    const input = await s3.send(new GetObjectCommand(inputParams));
    const inputFile = `${baseDir}/${inputParams.Key}`;
    const outputDir = `${baseDir}/output`;

    await fs.mkdir(path.dirname(inputFile), { recursive: true });
    await fs.mkdir(outputDir, { recursive: true });

    try {
      await fs.writeFile(inputFile, Buffer.from(await input.Body.transformToByteArray()));

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

      await s3.send(
        new PutObjectCommand({
          ...outputParams,
          Body: await fs.readFile(`${outputDir}/map.png`)
        })
      );
    } finally {
      await fs.rm(baseDir, { recursive: true, force: true });
    }
  } catch (err) {
    rollbar.error(err, { inputParams });
    await new Promise(resolve => {
      rollbar.wait(resolve);
    });
    throw err;
  }
};
