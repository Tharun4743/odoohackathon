import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const isRemote =
  process.env.DATABASE_URL?.includes('supabase.com') ||
  process.env.DATABASE_URL?.includes('pooler') ||
  process.env.DATABASE_URL?.includes('aws') ||
  process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isRemote ? { rejectUnauthorized: false } : false,
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('🚀 Connecting to Supabase database...');
    const schemaPath = path.resolve(__dirname, '../../../database/schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    console.log('📄 Executing database/schema.sql...');
    await client.query(sql);
    console.log('✅ Schema migration completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
