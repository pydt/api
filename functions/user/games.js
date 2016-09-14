'use strict';

module.exports.handler = (event, context, cb) => {
  cb(null, { message: 'TODO: output games for user...', userID: event.principalId });
};
