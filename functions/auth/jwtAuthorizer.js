'use strict';

const auth = require('../../lib/auth.js');

module.exports.handler = (event, context, cb) => {
    var token = event.authorizationToken;

    if (!token) {
      cb(new Error('No Token Present'));
      return;
    }

    try {
      let resourceArn = event.methodArn.substring(0, event.methodArn.indexOf('/')) + '/*';
      cb(null, generatePolicy(auth.getSteamIDFromToken(token), 'Allow', resourceArn));
    } catch (err) {
      cb(err);
    }
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
