import { Pool,  type PoolConfig } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const poolConfig : PoolConfig = {
    host : process.env.PGHOST,
    port : process.env.PGPORT ? parseInt(process.env.PGPORT) : 5432,
    user : process.env.PGUSER,
    password : process.env.PGPASSWORD,
    database : process.env.PGDATABASE
};

export const pool = new Pool(poolConfig);

async function run() : Promise <void> {
    try {
        const client = await pool.connect();
        console.log("Connected to PostgreSQL -> Supabase. ");
        client.release();
    } catch (error) {
        console.error("Database Error : ", error);
    }
}
run();