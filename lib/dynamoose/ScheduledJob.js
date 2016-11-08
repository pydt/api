'use strict';

const common = require('../common.js');
const dynamoose = require('./common.js');

const ScheduledJob = dynamoose.createVersionedModel(common.config.RESOURCE_PREFIX + 'scheduled-job', {
  jobType: {
    type: String,
    hashKey: true
  },
  scheduledTime: {
    type: Date,
    rangeKey: true
  },
  gameId: String
});

ScheduledJob.JOB_TYPES = {
  TURN_TIMER: 'TURN_TIMER'
};

module.exports = ScheduledJob;
