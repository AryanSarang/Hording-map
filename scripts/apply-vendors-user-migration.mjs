/**
 * Applies vendors user_id migration using NEXT_DATABASE_URL from .env
 * Run: node scripts/apply-vendors-user-migration.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

dotenv.config({ path: path.join(root, '.env') });
dotenv.config({ path: path.join(root, '.env.development.local') });

const conn =
    process.env.NEXT_DATABASE_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL;

if (!conn) {
    console.error('Missing NEXT_DATABASE_URL (or DATABASE_URL) in .env');
    process.exit(1);
}

const sqlPath = path.join(root, 'supabase', 'migrations', '20260405120000_vendors_user_scoped.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

const client = new pg.Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });

async function main() {
    await client.connect();
    console.log('Connected. Running migration:', path.basename(sqlPath));
    await client.query(sql);
    console.log('Migration finished successfully.');
    await client.end();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
