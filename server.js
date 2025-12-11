// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const leaderboardRoutes = require('./routes/leaderboard');
const tasksRoutes = require('./routes/tasks'); 
const userRoutes = require('./routes/user'); // ⭐ BARU: Import route user untuk sync stats
const forgotRoutes = require('./routes/forgot');

const app = express();
app.use(cors());
app.use(express.json());

// API endpoints
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/tasks', tasksRoutes); 
app.use('/api/user', userRoutes); // ⭐ BARU: Tambahkan endpoint /api/user
app.use('/api/forgot', forgotRoutes);

// health
app.get('/api/health', (req, res) => res.json({ ok: true }));

// static frontend optional (if you put frontend in backend/public)
// app.use(express.static(path.join(__dirname,'public')));

const PORT = process.env.PORT || 4000;
app.listen(PORT, ()=> {
  console.log(`Server running on port ${PORT}`);
});