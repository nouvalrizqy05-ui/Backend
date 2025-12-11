// backend/routes/tasks.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const verifyToken = require('../middleware/verifyToken'); 

// 1. GET /api/tasks (READ: Mendapatkan SEMUA tugas pengguna yang sedang login)
router.get('/', verifyToken, async (req, res) => {
  try {
    // req.user.id didapat dari JWT payload yang didecode oleh verifyToken
    const q = await db.query(
      `SELECT * FROM tasks 
       WHERE user_id=$1 
       ORDER BY due_date ASC, created_at ASC`, 
      [req.user.id]
    );
    res.json({ tasks: q.rows });
  } catch(err) {
    console.error(err);
    res.status(500).json({ message: 'Server error retrieving tasks' });
  }
});

// 2. POST /api/tasks (CREATE: Membuat tugas baru)
router.post('/', verifyToken, async (req, res) => {
  try {
    const { title, due_date, due_time } = req.body;
    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }

    const q = await db.query(
      `INSERT INTO tasks (user_id, title, due_date, due_time, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING *`, 
      [req.user.id, title, due_date || null, due_time || null]
    );
    res.status(201).json({ task: q.rows[0], message: 'Task created' });
  } catch(err) {
    console.error(err);
    res.status(500).json({ message: 'Server error creating task' });
  }
});

// 3. PUT /api/tasks/:id (UPDATE: Memperbarui status/title tugas dan Poin)
router.put('/:id', verifyToken, async (req, res) => {
  const client = await db.pool.connect(); // ⭐ BARU: Dapatkan koneksi klien untuk transaksi
  try {
    await client.query('BEGIN'); // ⭐ BARU: Mulai transaksi
    
    const { id } = req.params;
    const { title, status } = req.body;
    
    // Ambil status tugas LAMA sebelum diupdate (dibutuhkan untuk menghitung reward)
    const oldTaskRes = await client.query('SELECT status FROM tasks WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    
    if (oldTaskRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Task not found or unauthorized' });
    }
    
    const oldStatus = oldTaskRes.rows[0].status;

    // --- 1. Persiapan Query UPDATE Tasks ---
    let queryParts = [];
    let params = [];
    let paramIndex = 1;

    if (title !== undefined) {
        queryParts.push(`title = $${paramIndex++}`);
        params.push(title);
    }
    if (status !== undefined) {
        queryParts.push(`status = $${paramIndex++}`);
        params.push(status);
    }

    if (queryParts.length === 0) {
        return res.status(400).json({ message: 'No fields provided for update' });
    }
    
    // Tambahkan id tugas dan user_id untuk filter keamanan
    params.push(id);
    params.push(req.user.id);

    const q = await client.query(
      `UPDATE tasks SET ${queryParts.join(', ')}, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $${paramIndex++} AND user_id = $${paramIndex++} 
       RETURNING *`, 
      params
    );
    
    const updatedTask = q.rows[0];

    // --- 2. LOGIKA REWARD/PENGHITUNGAN ACHIEVEMENTS ---
    const newStatus = updatedTask.status;
    const REWARD_POINTS = 5; 
    
    if (newStatus === 'completed' && oldStatus !== 'completed') {
        // ⭐ KASUS A: Tugas BARU selesai (Award Poin)
        await client.query(
            `UPDATE users SET 
             points = points + $1, 
             tasks_completed = tasks_completed + 1
             WHERE id = $2`,
            [REWARD_POINTS, req.user.id]
        );
    } else if (newStatus !== 'completed' && oldStatus === 'completed') {
        // ⭐ KASUS B: Tugas dibatalkan (Penalti Poin)
        await client.query(
            `UPDATE users SET 
             points = GREATEST(0, points - $1), 
             tasks_completed = GREATEST(0, tasks_completed - 1)
             WHERE id = $2`,
            [REWARD_POINTS, req.user.id] // Gunakan REWARD_POINTS sebagai penalti
        );
    }

    await client.query('COMMIT'); // ⭐ COMMIT: Simpan semua perubahan
    res.json({ task: updatedTask, message: 'Task and user achievements updated' });
  } catch(err) {
    await client.query('ROLLBACK'); // ⭐ ROLLBACK: Batalkan jika ada error SQL
    console.error(err);
    res.status(500).json({ message: 'Server error updating task and achievements' });
  } finally {
    client.release(); // ⭐ Lepaskan koneksi klien
  }
});

// 4. DELETE /api/tasks/:id (DELETE: Menghapus tugas)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const q = await db.query(
      `DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING id`, 
      [id, req.user.id]
    );

    if (q.rows.length === 0) {
      return res.status(404).json({ message: 'Task not found or unauthorized' });
    }
    
    res.json({ message: 'Task deleted' });
  } catch(err) {
    console.error(err);
    res.status(500).json({ message: 'Server error deleting task' });
  }
});

module.exports = router;