/* eslint-disable @typescript-eslint/no-explicit-any */
import { aws as dynamooseAws, Condition, model as dynamooseModel, Schema, Table } from 'dynamoose';
import { chunk } from 'lodash';
import { injectable, unmanaged } from 'inversify';
import { HttpResponseError } from '../../api/framework';
import { ModelType } from 'dynamoose/dist/General';
import { AnyItem } from 'dynamoose/dist/Item';
import { Query, Scan } from 'dynamoose/dist/ItemRetriever';
import { Config } from '../config';

dynamooseAws.ddb.set(
  new dynamooseAws.ddb.DynamoDB({
    region: Config.region
  })
);

Table.defaults.set({
  create: false
});

export interface IRepository<TKey, TEntity> {
  get(id: TKey, consistent?: boolean): Promise<TEntity>;
  getOrThrow404(gameId: TKey): Promise<TEntity>;
  delete(id: TKey): Promise<void>;
  batchGet(ids: TKey[], consistent?: boolean): Promise<TEntity[]>;
  batchDelete(entities: TEntity[]): Promise<void>;
  saveVersioned(model: TEntity): Promise<TEntity>;
}

export type PydtModelType<TEntity> = ModelType<AnyItem> & {
  saveVersioned: (model: TEntity) => Promise<TEntity>;
};

@injectable()
export abstract class BaseDynamooseRepository<TKey, TEntity> implements IRepository<TKey, TEntity> {
  private model: PydtModelType<TEntity>;
  private rawSchema: unknown;

  constructor(@unmanaged() name, @unmanaged() schema) {
    schema.version = {
      type: Number,
      default: 0
    };

    this.rawSchema = schema;

    const model = dynamooseModel(
      name,
      new Schema(schema, {
        timestamps: true
      })
    ) as any;

    model.saveVersioned = m => {
      if (!(m instanceof this.model)) {
        m = new this.model(m as any);
      }

      const oldVersion = m.version || 0;
      m.version = oldVersion + 1;

      return m.save({
        condition: new Condition()
          .parenthesis(new Condition('version').not().exists())
          .or()
          .parenthesis(new Condition('version').eq(oldVersion))
      });
    };

    this.model = model;
  }

  public async get(id: TKey, consistent?: boolean): Promise<TEntity> {
    return (await this.model.get(id as any, {
      consistent: !!consistent
    })) as TEntity;
  }

  async getOrThrow404(id: TKey) {
    const result = await this.get(id);

    if (!result) {
      throw new HttpResponseError(404, 'Not Found');
    }

    return result;
  }

  public async delete(id: TKey) {
    await this.model.delete(id as any);
  }

  public async batchGet(ids: TKey[], consistent?: boolean): Promise<TEntity[]> {
    const result = [];

    for (const idChunk of chunk(ids, 100)) {
      const results = await Promise.all(idChunk.map(id => this.get(id, consistent)));
      result.push(...results.filter(x => Boolean(x)));
    }

    return result;
  }

  public async batchDelete(entities: TEntity[]) {
    await this.model.batchDelete(entities as any);
  }

  public async saveVersioned(model: TEntity): Promise<TEntity> {
    const oldValues = {};

    for (const [key, value] of Object.entries(this.rawSchema)) {
      const pydtSet = (value as any).pydtSet;
      if (pydtSet) {
        oldValues[key] = model[key];
        model[key] = pydtSet(model[key]);
      }
    }

    const savedModel = await this.model.saveVersioned(model);

    for (const [key, value] of Object.entries(oldValues)) {
      model[key] = value;
      savedModel[key] = value;
    }

    // Make sure updated version is copied to the input model
    (model as any).version = (savedModel as any).version;

    return savedModel;
  }

  protected scan(column?: string) {
    return this.model.scan(column) as Scan<TEntity>;
  }

  protected query(column?: string) {
    return this.model.query(column) as Query<TEntity>;
  }

  protected async getAllPaged(scanOrQuery): Promise<TEntity[]> {
    let result: TEntity[] = [];
    let lastResult: TEntity[] = [];

    do {
      const lastKey = (<any>lastResult).lastKey;

      if (lastKey) {
        lastResult = await scanOrQuery.startAt(lastKey).exec();
      } else {
        lastResult = await scanOrQuery.exec();
      }

      result = result.concat(lastResult);
    } while ((<any>lastResult).lastKey);

    return result;
  }
}
