import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Prevent multiple Prisma Client / pg pool instances in development (hot reload)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

function getRealConnectionString(urlStr: string | undefined): string {
  if (!urlStr) {
    return 'postgresql://postgres:postgres@localhost:5432/placeholder_db?sslmode=disable';
  }
  
  if (urlStr.startsWith('prisma+postgres://')) {
    try {
      const url = new URL(urlStr);
      const apiKey = url.searchParams.get('api_key');
      if (apiKey) {
        const decoded = Buffer.from(apiKey, 'base64').toString('utf-8');
        const payload = JSON.parse(decoded);
        if (payload.databaseUrl) {
          return payload.databaseUrl;
        }
      }
    } catch (e) {
      console.error("Failed to parse prisma+postgres URL, falling back to original", e);
    }
  }
  
  return urlStr;
}

const connectionString = getRealConnectionString(process.env.DATABASE_URL);

const pool = globalForPrisma.pool ?? new Pool({ 
  connectionString,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
  globalForPrisma.pool = pool;
}

export default prisma;
