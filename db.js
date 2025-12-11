// db.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // if using self-signed or special config add options here
});

pool.on('error', (err) => {
  console.error('Unexpected idle client error', err);
  process.exit(-1);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};