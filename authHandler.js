'use strict';

module.exports.authUserKey = (event, context, cb) => {
    var token = event.authorizationToken;

    switch (token) {
        case 'allow':
            cb(null, generatePolicy('SackGT', 'Allow', event.methodArn));
            break;
        case 'deny':
            cb(null, generatePolicy('SackGT', 'Deny', event.methodArn));
            break;
        case 'unauthorized':
            cb(new Error("[401] Unauthorized"));
            break;
        default:
            cb(new Error("[500] WTF"));
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
