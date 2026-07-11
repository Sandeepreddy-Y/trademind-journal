import { PrismaClient } from './src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

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
          console.log("Extracted real databaseUrl from prisma+postgres API key:", payload.databaseUrl);
          return payload.databaseUrl;
        }
      }
    } catch (e) {
      console.error("Failed to parse prisma+postgres URL, falling back to original", e);
    }
  }
  
  return urlStr;
}

async function main() {
  const connectionString = getRealConnectionString(process.env.DATABASE_URL);
  console.log("Using Connection String for pg Pool:", connectionString);

  const pool = new Pool({ 
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({
    adapter,
    log: ['query', 'info', 'warn', 'error'],
  });

  try {
    console.log("Attempting to query users database via PrismaPg adapter...");
    const userCount = await prisma.user.count();
    console.log("Query successful! Total users in DB:", userCount);
  } catch (error) {
    console.error("Query failed with PrismaPg:", error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
