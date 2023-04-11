import { type } from 'dynamoose';

export const legacyBoolean = (indexRangeKey?: string) => ({
  type: String,
  get: value => value === 'true',
  pydtSet: value => Boolean(value).toString(),
  ...(indexRangeKey
    ? {
        index: {
          global: true,
          rangeKey: indexRangeKey
        }
      }
    : {})
});

export const legacyStringSet = () => ({
  type: Set,
  schema: [String],
  get: (value: Set<string>) => [...(value || [])],
  pydtSet: (value: string[]) => (value && value.length ? new Set(value) : type.UNDEFINED)
});
