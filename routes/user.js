// backend/routes/user.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const verifyToken = require('../middleware/verifyToken');

// Route untuk sinkronisasi statistik lokal (Roadmap, Pomodoro) ke database
// Endpoint: POST /api/user/sync-stats
router.post('/sync-stats', verifyToken, async (req, res) => {
    try {
        const { roadmap_done, pomodoro_done } = req.body;
        const userId = req.user.id; // User ID dari token

        if (roadmap_done === undefined && pomodoro_done === undefined) {
            return res.status(400).json({ message: 'No stats provided' });
        }

        // Perbarui kolom statistik di tabel users
        // Note: Poin dihitung saat tasks selesai, di sini kita hanya sync count
        const q = await db.query(
            `UPDATE users 
             SET roadmap_done = $1, 
                 pomodoro_done = $2
             WHERE id = $3
             RETURNING id, roadmap_done, pomodoro_done`,
            [roadmap_done, pomodoro_done, userId]
        );

        if (q.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ message: 'Stats synchronized', user_stats: q.rows[0] });

    } catch (err) {
        console.error("Error syncing stats:", err);
        res.status(500).json({ message: 'Server error during sync' });
    }
});

module.exports = router;