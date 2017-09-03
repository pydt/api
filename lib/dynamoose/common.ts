import * as baseDynamoose from 'dynamoose';
import * as _ from 'lodash';

baseDynamoose.setDefaults({
  create: false
});

export interface IRepository<TKey, TEntity> {
  get(id: TKey): Promise<TEntity>;
  batchGet(ids: TKey[]): Promise<TEntity[]>;
  saveVersioned(model: TEntity): Promise<TEntity>;
  scan(): any;
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

    const model = baseDynamoose.model(name, new baseDynamoose.Schema(schema, { timestamps: true }));

    model.saveVersioned = (m) => {
      return m.save({
        condition: 'attribute_not_exists(version) OR version = :version',
        conditionValues: { version: (m.version || 0) - 1 }
      });
    };

    return model;
  }
});
