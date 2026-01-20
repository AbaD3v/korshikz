import pg from 'pg';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// 1. Экспорт для обычных SQL запросов (через pool)
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const query = (text, params) => pool.query(text, params);

// 2. Экспорт клиента Supabase (для Auth Middleware)
// ПРОВЕРЬ: В твоем .env должны быть SUPABASE_URL и SUPABASE_ANON_KEY
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);