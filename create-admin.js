// create-admin.js
require('dotenv').config();
const bcrypt = require('bcrypt');
const db = require('./db');

(async ()=>{
  try{
    const email = process.env.ADMIN_EMAIL || 'admin@local';
    const password = process.env.ADMIN_PASSWORD || 'admin123';
    const username = process.env.ADMIN_USERNAME || 'admin';
    const hashed = await bcrypt.hash(password, 10);

    // insert if not exists
    const exists = await db.query('SELECT id FROM users WHERE username=$1 OR email=$2', [username, email]);
    if(exists.rows.length > 0){
      console.log('Admin already exists.');
      process.exit(0);
    }

    await db.query('INSERT INTO users (username, email, password, role, points) VALUES ($1,$2,$3,$4,$5)', [username, email, hashed, 'admin', 0]);
    console.log('Admin created:', username);
    process.exit(0);
  }catch(err){
    console.error(err);
    process.exit(1);
  }
})();