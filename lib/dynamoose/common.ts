import * as baseDynamoose from 'dynamoose';
import * as _ from 'lodash';

baseDynamoose.setDefaults({
  create: false
});

export interface IRepository<TKey, TEntity> {
  get(id: TKey): Promise<TEntity>;
  batchGet(ids: TKey[]): Promise<TEntity[]>;
  saveVersioned(model: TEntity): Promise<TEntity>;
}

export const dynamoose = _.merge(baseDynamoose, {
  createVersionedModel: (name, schema) => {
    schema.version = {
      type: Number,
      default: 0,
      set: function(value) {
        return value + 1
      }
    };

    const model = dynamoose.model(name, new dynamoose.Schema(schema, { timestamps: true }));

    model.saveVersioned = (m) => {
      return m.save({
        condition: 'attribute_not_exists(version) OR version = :version',
        conditionValues: { version: (model.version || 0) - 1 }
      });
    };

    return model;
  }
});
