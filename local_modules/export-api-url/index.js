'use strict';

const fs = require('fs');
const _ = require('lodash');

class ExportApiUrl {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;
    var self = this;

    this.hooks = {
      'before:deploy:deploy': this.removeOutputs.bind(this),
      'after:deploy:deploy': this.exportApiUrl.bind(this)
    }

    _.forEach(this.serverless.pluginManager.plugins, function(plugin){
      if (plugin.constructor.name == 'AwsInfo') {
        // got the info plugin, hijack it
        self.awsInfo = plugin;
        self.SDK = plugin.provider.sdk;
      }
    })
  }

  removeOutputs() {
    // Need to get under 60 outputs :(
    const outputs = this.serverless.service.provider.compiledCloudFormationTemplate.Outputs;
    if (outputs) {
      for (let key in outputs) {
        if (key.indexOf('LambdaFunctionQualifiedArn') >= 0) {
          delete outputs[key];
        }
      }
    }
  }

  exportApiUrl() {
    const stage = this.serverless.processedInput.options.stage;
    fs.writeFile('../api-' + stage + '-url.txt', this.awsInfo.gatheredData.info.endpoint);
  }
}

module.exports = ExportApiUrl;
