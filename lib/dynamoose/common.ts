/* eslint-disable @typescript-eslint/no-explicit-any */
import * as dynamoose from 'dynamoose';
import { chunk } from 'lodash';
import { injectable, unmanaged } from 'inversify';
import { HttpResponseError } from '../../api/framework';
import { AWS } from '../config';
import { Entity } from '../models/shared';

(dynamoose.AWS as any) = AWS;

dynamoose.setDefaults({
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

interface PydtModelConstructor<TKey, TEntity> extends dynamoose.ModelConstructor<TEntity, TKey> {
  saveVersioned(model: dynamoose.Model<TEntity>): Promise<dynamoose.Model<TEntity>>;
}

@injectable()
export abstract class BaseDynamooseRepository<TKey, TEntity> implements IRepository<TKey, TEntity> {
  private model: PydtModelConstructor<TKey, TEntity>;

  constructor(@unmanaged() name, @unmanaged() schema) {
    schema.version = {
      type: Number,
      default: 0,
      set: function (value) {
        return value + 1;
      }
    };

    this.model = dynamoose.model(
      name,
      new dynamoose.Schema(schema, {
        timestamps: true,
        useNativeBooleans: false,
        useDocumentTypes: false
      })
    ) as any;

    this.model.saveVersioned = m => {
      if (!(m instanceof this.model)) {
        m = new this.model(m as any);
      }

      return m.save({
        condition: 'attribute_not_exists(version) OR version = :version',
        conditionValues: { version: ((m as Entity).version || 0) - 1 }
      });
    };
  }

  public get(id: TKey, consistent?: boolean): Promise<TEntity> {
    return this.model.get(id, {
      consistent: !!consistent
    } as any);
  }

  async getOrThrow404(id: TKey) {
    const result = await this.get(id);

    if (!result) {
      throw new HttpResponseError(404, 'Not Found');
    }

    return result;
  }

  public delete(id: TKey) {
    return this.model.delete(id);
  }

  public async batchGet(ids: TKey[], consistent?: boolean): Promise<TEntity[]> {
    const result = [];

    for (const idChunk of chunk(ids, 100)) {
      result.push(
        ...(await this.model.batchGet(idChunk, {
          consistent: !!consistent
        } as any))
      );
    }

    return result;
  }

  public batchDelete(entities: TEntity[]) {
    return this.model.batchDelete(entities as any);
  }

  public saveVersioned(model: TEntity): Promise<TEntity> {
    return this.model.saveVersioned(model as any) as any;
  }

  protected scan(column?: string) {
    return this.model.scan(column);
  }

  protected query(column?: string) {
    return this.model.query(column);
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
