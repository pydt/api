import * as baseDynamoose from 'dynamoose';
import * as _ from 'lodash';

baseDynamoose.setDefaults({
  create: false
});

export interface IRepository<TKey, TEntity> {
  get(id: TKey): Promise<TEntity>;
  delete(id: TKey): Promise<void>;
  batchGet(ids: TKey[]): Promise<TEntity[]>;
  saveVersioned(model: TEntity): Promise<TEntity>;
  scan(column?: string): any;
}

export const dynamoose: any = _.merge(baseDynamoose, {
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
      if (!(m instanceof model)) {
        m = new model(m);
      }

      return m.save({
        condition: 'attribute_not_exists(version) OR version = :version',
        conditionValues: { version: (m.version || 0) - 1 }
      });
    };

    return model;
  }
});
