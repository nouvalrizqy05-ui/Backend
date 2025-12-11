// routes/admin.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const verifyAdmin = require('../middleware/verifyAdminToken');

// list users
router.get('/users', verifyAdmin, async (req, res) => {
  try{
    const q = await db.query(`SELECT id, username, email, role, points, tasks_completed, pomodoro_done, roadmap_done, created_at FROM users ORDER BY points DESC`);
    res.json({ users: q.rows });
  }catch(err){
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// delete user
router.delete('/users/:id', verifyAdmin, async (req, res) => {
  try{
    const { id } = req.params;
    await db.query('DELETE FROM users WHERE id=$1', [id]);
    res.json({ message: 'Deleted' });
  }catch(err){
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// reset user data
router.post('/users/:id/reset', verifyAdmin, async (req, res) => {
  try{
    const { id } = req.params;
    await db.query(`UPDATE users SET points=0, tasks_completed=0, pomodoro_done=0, roadmap_done=0 WHERE id=$1`, [id]);
    res.json({ message: 'Reset' });
  }catch(err){
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
