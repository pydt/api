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
    return this.awsInfo.gather().then(info => {
      fs.writeFile('../api-url.txt', info.endpoint);
    });
  }
}

module.exports = ExportApiUrl;
