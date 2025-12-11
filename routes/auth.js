// routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');
require('dotenv').config();

const SALT_ROUNDS = 10;

// register
router.post('/register', async (req, res) => {
  try{
    const { username, email, password } = req.body;
    if(!username || !password) return res.status(400).json({ message: 'Missing fields' });

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);

    const insert = await db.query(
      `INSERT INTO users (username, email, password) VALUES ($1,$2,$3) RETURNING id, username, email, role, points`,
      [username, email || null, hashed]
    );
    const user = insert.rows[0];
    return res.status(201).json({ user });
  }catch(err){
    if(err.code === '23505'){ // unique_violation
      return res.status(400).json({ message: 'Username or email already exists' });
    }
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// login
router.post('/login', async (req, res) => {
  try{
    const { username, password } = req.body;
    if(!username || !password) return res.status(400).json({ message: 'Missing fields' });

    const q = await db.query('SELECT * FROM users WHERE username=$1 OR email=$1 LIMIT 1', [username]);
    const user = q.rows[0];
    if(!user) return res.status(401).json({ message: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.password);
    if(!ok) return res.status(401).json({ message: 'Invalid credentials' });

    const payload = {
      id: user.id,
      username: user.username,
      role: user.role
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, user: { id: user.id, username: user.username, email: user.email, role: user.role, points: user.points } });
  }catch(err){
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// get current profile (protected)
const verifyToken = require('../middleware/verifyToken');
router.get('/me', verifyToken, async (req, res) => {
  try{
    const q = await db.query('SELECT id, username, email, role, points, tasks_completed, pomodoro_done, roadmap_done FROM users WHERE id=$1', [req.user.id]);
    const user = q.rows[0];
    if(!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user });
  }catch(err){
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Ini mengizinkan user yang *login* untuk mengatur password baru
router.post('/reset-password', verifyToken, async (req, res) => {
    try {
        const { current_password, new_password } = req.body;
        const userId = req.user.id; // ID user dari token JWT

        if (!current_password || !new_password) {
            return res.status(400).json({ message: 'Password lama dan baru wajib diisi.' });
        }

        // 1. Ambil hash password lama dari database
        const q = await db.query('SELECT password FROM users WHERE id=$1', [userId]);
        const user = q.rows[0];

        if (!user) {
            return res.status(404).json({ message: 'Pengguna tidak ditemukan.' });
        }

        // 2. Verifikasi password lama
        const isMatch = await bcrypt.compare(current_password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Password lama salah.' });
        }

        // 3. Hash password baru
        const hashed = await bcrypt.hash(new_password, 10);

        // 4. Update password di database
        await db.query(
            `UPDATE users SET password = $1 WHERE id = $2`,
            [hashed, userId]
        );

        // 5. Reset password selesai
        res.json({ message: 'Password berhasil direset. Silakan login kembali.' });
    } catch(err) {
        console.error("Error resetting password:", err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;