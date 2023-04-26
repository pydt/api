const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

const s3 = new S3Client({
  region: 'us-east-1'
});

let callNum = 0;

exports.handler = async function (event, context) {
  // copy files from staging to tmp if not there already
  if (!fs.pathExistsSync('/tmp/nxf-tmp')) {
    console.log('copying staging to tmp')
    fs.copySync('/staging', '/tmp');
  }

  const baseDir = `/tmp/${callNum++}`;

  const { inputParams, outputParams } = JSON.parse(event.Records[0].Sns.Message);

  const input = await s3.send(new GetObjectCommand(inputParams));
  const inputFile = `${baseDir}/${inputParams.Key}`;
  const outputDir = `${baseDir}/output`;

  await fs.mkdir(path.dirname(inputFile), { recursive: true });
  await fs.mkdir(outputDir, { recursive: true });

  await fs.writeFile(inputFile, Buffer.from(await input.Body.transformToByteArray()));

  execSync(
    `export NXF_VER=22.04.5
    export NXF_HOME=/tmp/.nextflow
    export NXF_TEMP=/tmp/nxf-tmp
    export NXF_WORK=/tmp/nxf-work

  bin/nextflow \
    run . \
    -main-script workflows/civ6_pipeline/main_images-only.nf \
    --input ${inputFile} \
    --publishDir ${outputDir}`,
    {
      cwd: '/civ6_pipeline'
    }
  );

  const outputFiles = await fs.readdir(outputDir);

  await s3.send(
    new PutObjectCommand({
      ...outputParams,
      Body: await fs.readFile(`${outputDir}/${outputFiles[0]}`)
    })
  );

  await fs.rmdir(baseDir, { recursive: true, force: true });
};
