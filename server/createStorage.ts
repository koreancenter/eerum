import { D1StorageAdapter } from './d1Storage.ts';
import type { CardStorageAdapter, D1DatabaseLike } from './storageTypes.ts';

export interface StorageFactoryOptions {
  d1?: D1DatabaseLike | null;
  dbPath?: string;
}

function resolveGlobalD1Binding(): D1DatabaseLike | null {
  const g = globalThis as unknown as {
    DB?: D1DatabaseLike;
    __D1_DB?: D1DatabaseLike;
  };
  const candidate = g.DB || g.__D1_DB;
  if (candidate && typeof candidate.prepare === 'function') {
    return candidate;
  }
  return null;
}

export async function createStorageAdapter(
  options: StorageFactoryOptions = {}
): Promise<CardStorageAdapter> {
  const d1 = options.d1 || resolveGlobalD1Binding();
  if (d1) {
    const adapter = new D1StorageAdapter(d1);
    await adapter.init();
    return adapter;
  }

  const { SqliteStorageAdapter } = await import('./sqliteStorage.ts');
  const adapter = new SqliteStorageAdapter(options.dbPath);
  await adapter.init();
  return adapter;
}
