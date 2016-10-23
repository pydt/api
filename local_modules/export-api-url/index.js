'use strict';

const AwsInfo = require('../serverless/lib/plugins/aws/info');
const fs = require('fs');

class ExportApiUrl {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;
    this.awsInfo = new AwsInfo(serverless, options);

    this.hooks = {
      'after:deploy:deploy': this.exportApiUrl.bind(this)
    }
  }


  exportApiUrl() {
    const stage = this.serverless.processedInput.options.stage;

    return this.awsInfo.gather().then(res => {
      fs.writeFile('../api-' + stage + '-url.txt', res.info.endpoint);
    });
  }
}

module.exports = ExportApiUrl;
