const fs = require('fs');
const { exec } = require('child_process');
const fetch = require('node-fetch');

describe('test docker image', () => {
  const files = fs.readdirSync('_testdata/files');
  const process = exec(`docker run -p 4567:8080 -v $(pwd)/_testdata:/var/testdata civ6_pipeline`);

  process.stdout.on('data', (d) => console.log(d));
  process.stderr.on('data', (e) => console.log(e));

  beforeAll(async () => {
    await new Promise(r => setTimeout(r, 500));
  });

  afterAll(async () => {
    process.stdout.destroy();
    process.stderr.destroy();
    process.stdin.destroy();

    exec(`docker ps -q --filter ancestor="civ6_pipeline" | xargs -r docker stop`);
  });

  test.each(files)('%s', async file => {
    await fetch('http://localhost:4567/2015-03-31/functions/function/invocations', {
      method: 'POST',
      body: JSON.stringify({
        Records: [
          {
            Sns: {
              Message: JSON.stringify({
                inputParams: {
                  Bucket: 'test',
                  Key: `/var/testdata/files/${file}`
                },
                outputParams: {
                  Bucket: 'test',
                  Key: `/var/testdata/out/${file}`
                }
              })
            }
          }
        ]
      })
    });

    expect(fs.readFileSync(`_testdata/expected/${file}/header.yaml`)).toStrictEqual(fs.readFileSync(`_testdata/out/${file}/header.yaml`));
    expect(fs.readFileSync(`_testdata/expected/${file}/map.tsv`)).toStrictEqual(fs.readFileSync(`_testdata/out/${file}/map.tsv`));
  }, 10000);
});
