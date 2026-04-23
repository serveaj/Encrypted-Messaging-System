const express        = require('express');
const router         = express.Router();
const pool           = require('../db');
const authMiddleware = require('../middleware/auth');

// Returns the last message for each conversation
router.get('/previews', authMiddleware, async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await pool.query(`
      SELECT DISTINCT ON (other_id)
        other_id,
        content,
        created_at,
        sender_id
      FROM (
        SELECT
          CASE WHEN sender_id = $1 THEN recipient_id ELSE sender_id END AS other_id,
          content,
          created_at,
          sender_id
        FROM messages
        WHERE sender_id = $1 OR recipient_id = $1
      ) sub
      ORDER BY other_id, created_at DESC
    `, [userId]);

    return res.json({ success: true, previews: result.rows });

  } catch (err) {
    console.error('[Messages] Previews error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});


// Gets message history between two users
router.get('/:userId', authMiddleware, async (req, res) => {
  const myId    = req.user.id;
  const theirId = parseInt(req.params.userId);

  try {
    const result = await pool.query(`
      SELECT
        m.id,
        m.sender_id,
        m.recipient_id,
        m.content,
        m.file_name,
        m.file_type,
        m.file_data,
        m.created_at,
        u.name AS sender_name
      FROM messages m
      JOIN users u ON u.id = m.sender_id
      WHERE
        (m.sender_id = $1 AND m.recipient_id = $2)
        OR
        (m.sender_id = $2 AND m.recipient_id = $1)
      ORDER BY m.created_at ASC
    `, [myId, theirId]);

    return res.json({ success: true, messages: result.rows });

  } catch (err) {
    console.error('[Messages] Fetch history error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;