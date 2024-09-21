import type { AgentContext } from '@credo-ts/core';
import type { BaseRecord, TagsBase } from '@credo-ts/core';
import SQLite from 'react-native-sqlite-storage';
import type {
  StorageService,
  BaseRecordConstructor,
  Query,
} from '@credo-ts/core';
export type QueryOptions = {
  limit?: number;
  offset?: number;
};

import {
  RecordNotFoundError,
  RecordDuplicateError,
  JsonTransformer,
  injectable,
} from '@credo-ts/core';

interface StorageRecord {
  value: Record<string, unknown>;
  tags: Record<string, unknown>;
  type: string;
  id: string;
}

@injectable()
export class SQLiteStorageService<
  T extends BaseRecord<any, any, any> = BaseRecord<any, any, any>,
> implements StorageService<T>
{
  public db: SQLite.SQLiteDatabase;

  constructor() {
    this.db = SQLite.openDatabase(
      {
        name: 'db.sqlite',
        location: 'default',
      },
      () => {
        console.log('Database opened successfully');
        this.createTable();
      },
      (error: any) => {
        console.error('Failed to open database', error);
      }
    );
  }

  private createTable() {
    this.db.transaction((tx: { executeSql: (arg0: string) => void }) => {
      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS records (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          value TEXT NOT NULL,
          tags TEXT NOT NULL
        )
      `);
    });
  }

  private recordToInstance(
    record: StorageRecord,
    recordClass: BaseRecordConstructor<T>
  ): T {
    const instance = JsonTransformer.fromJSON<T>(record.value, recordClass);
    instance.id = record.id;
    instance.replaceTags(record.tags as TagsBase);

    return instance;
  }

  /** @inheritDoc */
  public async save(_agentContext: AgentContext, record: T) {
    record.updatedAt = new Date();
    let t: Partial<any>;
    try {
      try {
        t = record.getTags();
        record.setTags({
          ...t,
          created_at: record.createdAt.toISOString(),
          updated_at: record.updatedAt.toISOString(),
        });
      } catch (e) {
        record.setTags({
          created_at: record.createdAt.toISOString(),
          updated_at: record.updatedAt.toISOString(),
        });
      }
    } catch (e) {
      record.setTags({
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    const value = JsonTransformer.toJSON(record);

    return new Promise<void>((resolve, reject) => {
      this.db.transaction(
        (tx: {
          executeSql: (
            arg0: string,
            arg1: string[],
            arg2: () => void,
            arg3: (tx: any, error: any) => boolean
          ) => void;
        }) => {
          tx.executeSql(
            `INSERT INTO records (id, type, value, tags) VALUES (?, ?, ?, ?)`,
            [
              record.id,
              record.type,
              JSON.stringify(value),
              JSON.stringify(t || {}),
            ],
            () => {
              resolve();
            },
            (_tx: any, error: { message: string | string[] }) => {
              if (error.message.includes('UNIQUE constraint failed')) {
                reject(
                  new RecordDuplicateError(
                    `Record with id ${record.id} already exists`,
                    { recordType: record.type }
                  )
                );
              } else {
                reject(error);
              }
              return false;
            }
          );
        }
      );
    });
  }

  /** @inheritDoc */
  public async update(_agentContext: AgentContext, record: T): Promise<void> {
    record.updatedAt = new Date();
    const value = JsonTransformer.toJSON(record);
    delete value._tags;

    return new Promise<void>((resolve, reject) => {
      this.db.transaction(
        (tx: {
          executeSql: (
            arg0: string,
            arg1: string[],
            arg2: () => void,
            arg3: (tx: any, error: any) => boolean
          ) => void;
        }) => {
          const tags = JSON.stringify(record.getTags());
          tx.executeSql(
            `UPDATE records SET value = ?, tags = ? WHERE id = ?`,
            [JSON.stringify(value), tags, record.id],
            () => {
              resolve();
            },
            (_tx: any, error: any) => {
              reject(error);
              return false;
            }
          );
        }
      );
    });
  }

  /** @inheritDoc */
  public async delete(_agentContext: AgentContext, record: T) {
    return new Promise<void>((resolve, reject) => {
      this.db.transaction(
        (tx: {
          executeSql: (
            arg0: string,
            arg1: string[],
            arg2: () => void,
            arg3: (tx: any, error: any) => boolean
          ) => void;
        }) => {
          tx.executeSql(
            `DELETE FROM records WHERE id = ?`,
            [record.id],
            () => {
              resolve();
            },
            (_tx: any, error: any) => {
              reject(error);
              return false;
            }
          );
        }
      );
    });
  }

  /** @inheritDoc */
  public async deleteById(
    _agentContext: AgentContext,
    _recordClass: BaseRecordConstructor<T>,
    id: string
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.db.transaction(
        (tx: {
          executeSql: (
            arg0: string,
            arg1: string[],
            arg2: () => void,
            arg3: (tx: any, error: any) => boolean
          ) => void;
        }) => {
          tx.executeSql(
            `DELETE FROM records WHERE id = ?`,
            [id],
            () => {
              resolve();
            },
            (_tx: any, error: any) => {
              reject(error);
              return false;
            }
          );
        }
      );
    });
  }

  /** @inheritDoc */
  public async getById(
    _agentContext: AgentContext,
    recordClass: BaseRecordConstructor<T>,
    id: string
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.db.transaction(
        (tx: {
          executeSql: (
            arg0: string,
            arg1: string[],
            arg2: (tx: any, resultSet: any) => void,
            arg3: (tx: any, error: any) => boolean
          ) => void;
        }) => {
          tx.executeSql(
            `SELECT * FROM records WHERE id = ?`,
            [id],
            (
              _tx: any,
              resultSet: { rows: { item: (arg0: number) => any } }
            ) => {
              const row = resultSet.rows.item(0);
              if (row) {
                resolve(
                  this.recordToInstance(
                    {
                      value: JSON.parse(row.value),
                      tags: JSON.parse(row.tags),
                      id: row.id,
                      type: row.type,
                    },
                    recordClass
                  )
                );
              } else {
                reject(
                  new RecordNotFoundError(`record with id ${id} not found.`, {
                    recordType: recordClass.type,
                  })
                );
              }
            },
            (_tx: any, error: any) => {
              reject(error);
              return false;
            }
          );
        }
      );
    });
  }

  /** @inheritDoc */
  public async getAll(
    _agentContext: AgentContext,
    recordClass: BaseRecordConstructor<T>
  ): Promise<T[]> {
    return new Promise<T[]>((resolve, reject) => {
      this.db.transaction(
        (tx: {
          executeSql: (
            arg0: string,
            arg1: string[],
            arg2: (tx: any, resultSet: any) => void,
            arg3: (tx: any, error: any) => boolean
          ) => void;
        }) => {
          tx.executeSql(
            `SELECT * FROM records WHERE type = ?`,
            [recordClass.type],
            (_tx: any, resultSet: { rows: any }) => {
              const rows = resultSet.rows;
              const instances: T[] = [];
              for (let i = 0; i < rows.length; i++) {
                const row = rows.item(i);
                instances.push(
                  this.recordToInstance(
                    {
                      value: JSON.parse(row.value),
                      tags: JSON.parse(row.tags),
                      id: row.id,
                      type: row.type,
                    },
                    recordClass
                  )
                );
              }
              resolve(instances);
            },
            (_tx: any, error: any) => {
              reject(error);
              return false;
            }
          );
        }
      );
    });
  }

  /** @inheritDoc */
  public async findByQuery(
    _agentContext: AgentContext,
    recordClass: BaseRecordConstructor<T>,
    query: Query<T>,
    queryOptions?: QueryOptions
  ): Promise<T[]> {
    const { offset = 0, limit } = queryOptions || {};

    return new Promise<T[]>((resolve, reject) => {
      this.db.transaction(
        (tx: {
          executeSql: (
            arg0: string,
            arg1: string[],
            arg2: (tx: any, resultSet: any) => void,
            arg3: (tx: any, error: any) => boolean
          ) => void;
        }) => {
          tx.executeSql(
            `SELECT * FROM records WHERE type = ?`,
            [recordClass.type],
            (_tx: any, resultSet: { rows: any }) => {
              const rows = resultSet.rows;
              const allRecords: StorageRecord[] = [];
              for (let i = 0; i < rows.length; i++) {
                const row = rows.item(i);
                allRecords.push({
                  value: JSON.parse(row.value),
                  tags: JSON.parse(row.tags),
                  id: row.id,
                  type: row.type,
                });
              }

              const filteredRecords = allRecords.filter((record) =>
                filterByQuery(record, query)
              );
              const slicedRecords =
                limit !== undefined
                  ? filteredRecords.slice(offset, offset + limit)
                  : filteredRecords.slice(offset);
              const instances = slicedRecords.map((record) =>
                this.recordToInstance(record, recordClass)
              );

              resolve(instances);
            },
            (_tx: any, error: any) => {
              reject(error);
              return false;
            }
          );
        }
      );
    });
  }
}

// Helper functions
function filterByQuery<T extends BaseRecord<any, any, any>>(
  record: StorageRecord,
  query: Query<T>
) {
  const { $and, $or, $not, ...restQuery } = query;

  if ($not) {
    throw new Error('$not query not supported in SQLite storage');
  }

  if (!matchSimpleQuery(record, restQuery)) return false;

  if ($and) {
    const allAndMatch = ($and as Query<T>[]).every((and) =>
      filterByQuery(record, and)
    );

    if (!allAndMatch) return false;
  }

  if ($or) {
    const oneOrMatch = ($or as Query<T>[]).some((or) =>
      filterByQuery(record, or)
    );
    if (!oneOrMatch) return false;
  }

  return true;
}

function matchSimpleQuery<T extends BaseRecord<any, any, any>>(
  record: StorageRecord,
  query: Query<T>
) {
  const tags = record.tags as TagsBase;

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) continue;

    if (Array.isArray(value)) {
      const tagValue = tags[key];
      if (
        !Array.isArray(tagValue) ||
        !value.every((v) => tagValue.includes(v))
      ) {
        return false;
      }
    } else if (tags[key] !== value) {
      return false;
    }
  }

  return true;
}
