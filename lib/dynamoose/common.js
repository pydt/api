'use strict';

const dynamoose = require('dynamoose');

dynamoose.setDefaults({
  create: false
});

dynamoose.createVersionedModel = (name, schema) => {
  schema.version = {
    type: Number,
    default: 0,
    set: function(value) {
      return value + 1
    }
  };

  const Model = dynamoose.model(name, new dynamoose.Schema(schema, { timestamps: true }));

  Model.saveVersioned = (model) => {
    return model.save({
      condition: 'attribute_not_exists(version) OR version = :version',
      conditionValues: { version: (model.version || 0) - 1 }
    });
  };

  return Model;
};

module.exports = dynamoose;
