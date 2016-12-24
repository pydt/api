'use strict';

const common = require('../../lib/common.js');
const auth = require('../../lib/auth.js');

module.exports.handler = (event, context, cb) => {
    var token = event.authorizationToken;

    if (!token) {
      return cb(new Error('No Token Present'));
    }

    let policy;

    try {
      let resourceArn = event.methodArn.substring(0, event.methodArn.indexOf('/')) + '/*';
      policy = generatePolicy(auth.getSteamIDFromToken(token), 'Allow', resourceArn);
    } catch (err) {
      return common.generalError(cb, err);
    }

    cb(null, policy);
};

////////

function generatePolicy(principalId, effect, resource) {
    var authResponse = {};
    authResponse.principalId = principalId;
    if (effect && resource) {
        var policyDocument = {};
        policyDocument.Version = '2012-10-17'; // default version
        policyDocument.Statement = [];
        var statementOne = {};
        statementOne.Action = 'execute-api:Invoke'; // default action
        statementOne.Effect = effect;
        statementOne.Resource = resource;
        policyDocument.Statement[0] = statementOne;
        authResponse.policyDocument = policyDocument;
    }
    return authResponse;
}
