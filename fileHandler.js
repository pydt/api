'use strict';

module.exports.currentSave = (event, context, cb) => {
  cb(null, { message: 'Authorized', gameID: event.path.gameID, userID: event.principalId });
};
