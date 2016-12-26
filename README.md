[![Build Status](https://travis-ci.org/pydt/api.svg?branch=master)](https://travis-ci.org/pydt/api)

# PYDT Serverless API

Currently there's no local dev story for the API, so you'll need an AWS account.
Even so, the cost for deploying this should be free to pennies a month in a dev scenario.

## Dev Setup / Deployment

* `npm install`
* `npm install -g serverless@1.4.0`
* Copy config.yml.template to config.yml and set the appropriate values.
* Make sure you have the aws cli installed and configured, and then `./sls.sh deploy -v` to have serverless use cloudformation to set things up in AWS.
* As a part of the deployment, `api-url.txt` will be written to the parent directory. Assuming that your other pydt projects are on the same level, they'll use that file to configure their dev API endpoint.

## Prod Deployment

* `npm run deploy-prod`

## Hacks due to service size

* Cloudformation only allows 200 resources, we've disabled creation of cloudwatch logs by cloudformation in serverless.yml to buy additional room at the moment: https://github.com/serverless/serverless/issues/2387
* Cloudformation only allows 60 outputs, we've disabled the GetLambdaFunctionQualifiedArn outputs in the removeOutputs function of the export-api-url local plugin: https://github.com/serverless/serverless/issues/2466

The real fix would be to split into multiple services or combine some of our lambdas into composite lambdas, but until it gets impossible to do so I'm going to hope serverless addresses these issues. :/

# License

<a rel="license" href="http://creativecommons.org/licenses/by-nc-sa/4.0/"><img alt="Creative Commons License" style="border-width:0" src="https://i.creativecommons.org/l/by-nc-sa/4.0/88x31.png" /></a><br /><span xmlns:dct="http://purl.org/dc/terms/" href="http://purl.org/dc/dcmitype/InteractiveResource" property="dct:title" rel="dct:type">Play Your Damn Turn</span> by <a xmlns:cc="http://creativecommons.org/ns#" href="https://www.playyourdamnturn.com" property="cc:attributionName" rel="cc:attributionURL">Michael Rosack</a> is licensed under a <a rel="license" href="http://creativecommons.org/licenses/by-nc-sa/4.0/">Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License</a>.
