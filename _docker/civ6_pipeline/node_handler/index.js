const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

const s3 = new S3Client({
  region: 'us-east-1'
});

let callNum = 0;

exports.handler = async function (event) {
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
      execSync(`/civ6_pipeline/target/native/civ6_save_renderer/parse_header/parse_header -i ${inputFile} -o ${outputDir}/header.yaml`);
      execSync(`/civ6_pipeline/target/native/civ6_save_renderer/parse_map/parse_map -i ${inputFile} -o ${outputDir}/map.tsv`);
      execSync(`/civ6_pipeline/target/native/civ6_save_renderer/plot_map/plot_map -y ${outputDir}/header.yaml -t ${outputDir}/map.tsv -o ${outputDir}/map.pdf`);
      execSync(`/civ6_pipeline/target/native/civ6_save_renderer/convert_plot/convert_plot -i ${outputDir}/map.pdf -o ${outputDir}/map.png`);
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
    await fs.rmdir(baseDir, { recursive: true, force: true });
  }
};
