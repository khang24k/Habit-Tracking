import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http';
import * as schema from './schema';

export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super(
      'Biến môi trường DATABASE_URL chưa được cấu hình. Vui lòng kết nối Neon PostgreSQL.',
    );
    this.name = 'DatabaseNotConfiguredError';
  }
}

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

type DbInstance = NeonHttpDatabase<typeof schema>;
type SqlClient = NeonQueryFunction<false, false>;

const globalForDb = globalThis as unknown as {
  __mylifeSql?: SqlClient;
  __mylifeDb?: DbInstance;
  __mylifeDbUrl?: string;
};

function getConnectionUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new DatabaseNotConfiguredError();
  }
  return url;
}

export function getSql(): SqlClient {
  const url = getConnectionUrl();
  if (!globalForDb.__mylifeSql || globalForDb.__mylifeDbUrl !== url) {
    globalForDb.__mylifeSql = neon(url);
    globalForDb.__mylifeDbUrl = url;
    globalForDb.__mylifeDb = undefined;
  }
  return globalForDb.__mylifeSql;
}

export function getDb(): DbInstance {
  const sql = getSql();
  if (!globalForDb.__mylifeDb) {
    globalForDb.__mylifeDb = drizzle({ client: sql, schema });
  }
  return globalForDb.__mylifeDb;
}
