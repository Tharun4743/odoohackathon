import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const isRemoteDb =
  process.env.DATABASE_URL?.includes('supabase.com') ||
  process.env.DATABASE_URL?.includes('pooler') ||
  process.env.DATABASE_URL?.includes('aws') ||
  process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isRemoteDb ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

export const query = async (text: string, params?: unknown[]) => {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV === 'development') {
    console.log('executed query', { text: text.substring(0, 100).replace(/\s+/g, ' '), duration, rows: res.rowCount });
  }
  return res;
};

export const getClient = () => pool.connect();

export default pool;
