import * as baseDynamoose from 'dynamoose';
import { merge } from 'lodash';

baseDynamoose.AWS.config.update({
  region: 'us-east-1'
});

baseDynamoose.setDefaults({
  create: false
});

export interface IRepository<TKey, TEntity> {
  get(id: TKey): Promise<TEntity>;
  delete(id: TKey): Promise<void>;
  batchGet(ids: TKey[]): Promise<TEntity[]>;
  batchDelete(entities: TEntity[]): Promise<void>;
  saveVersioned(model: TEntity): Promise<TEntity>;
}

export interface IInternalRepository<TKey, TEntity> extends IRepository<TKey, TEntity> {
  scan(column?: string): any;
  query(column?: string): any;
}

export async function getAllPaged<T>(scanOrQuery): Promise<T[]> {
  let result: T[] = [];
  let lastResult: T[] = [];

  do {
    const lastKey = (<any> lastResult).lastKey;

    if (lastKey) {
      lastResult = await scanOrQuery.startAt(lastKey).exec();
    } else {
      lastResult = await scanOrQuery.exec();
    }

    result = result.concat(lastResult);
  } while ((<any> lastResult).lastKey);

  return result;
}

export const dynamoose: any = merge(baseDynamoose, {
  createVersionedModel: (name, schema) => {
    schema.version = {
      type: Number,
      default: 0,
      set: function(value) {
        return value + 1
      }
    };

    const model: any = baseDynamoose.model(name, new baseDynamoose.Schema(schema, {
      timestamps: true,
      useNativeBooleans: false,
      useDocumentTypes: false
    }));

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
