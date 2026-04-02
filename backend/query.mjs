import { query } from './src/db.js';

const result = await query('select id, full_name, age from profiles;');

console.log(JSON.stringify(result.rows, null, 2));