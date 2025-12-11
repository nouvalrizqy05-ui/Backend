// backend/routes/forgot.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt'); // Digunakan untuk hashing password baru
const db = require('../db'); // Koneksi PostgreSQL

// Route khusus untuk menerima reset password tanpa memerlukan JWT (karena user lupa password)
// Endpoint: POST /api/forgot/submit
router.post('/submit', async (req, res) => {
    try {
        // Menerima userId dan new_password dari simulasi frontend
        const { userId, new_password } = req.body; 

        if (!userId || !new_password) {
            return res.status(400).json({ message: 'User ID dan Password baru wajib diisi.' });
        }
        
        // Asumsi: Di aplikasi nyata, userId ini didapatkan dari token reset yang valid.

        // 1. Hash password baru
        const hashed = await bcrypt.hash(new_password, 10);

        // 2. Update password di database
        const q = await db.query(
            // Penting: Update hanya berdasarkan ID yang valid (dari simulasi)
            `UPDATE users SET password = $1 WHERE id = $2`,
            [hashed, userId]
        );

        if (q.rowCount === 0) {
            // Jika tidak ada baris yang diupdate (ID tidak ditemukan)
            return res.status(404).json({ message: 'Pengguna tidak ditemukan.' });
        }

        // 3. Reset password selesai
        res.json({ message: 'Password berhasil direset! Silakan login.' });
    } catch(err) {
        console.error("Error submitting forgot password:", err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;