const express        = require('express');
const router         = express.Router();
const pool           = require('../db');
const authMiddleware = require('../middleware/auth');


// Returns all groups user is a member of
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT g.id, g.name, g.created_by, g.created_at,
              array_agg(gm.user_id) AS member_ids,
              last_msg.content      AS last_message,
              last_msg.created_at   AS last_message_at,
              last_msg.sender_name  AS last_message_sender
       FROM groups g
       JOIN group_members gm ON gm.group_id = g.id
       LEFT JOIN LATERAL (
         SELECT gm2.content, gm2.created_at, u.name AS sender_name
         FROM group_messages gm2
         JOIN users u ON u.id = gm2.sender_id
         WHERE gm2.group_id = g.id
         ORDER BY gm2.created_at DESC
         LIMIT 1
       ) last_msg ON true
       WHERE g.id IN (
         SELECT group_id FROM group_members WHERE user_id = $1
       )
       GROUP BY g.id, last_msg.content, last_msg.created_at, last_msg.sender_name
       ORDER BY g.created_at DESC`,
      [req.user.id]
    );

    return res.json({ success: true, groups: result.rows });
  } catch (err) {
    console.error('[Groups] Get groups error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Returns message history for each group
router.get('/:groupId/messages', authMiddleware, async (req, res) => {
  const groupId = parseInt(req.params.groupId);
  const userId  = req.user.id;

  try {
    const memberCheck = await pool.query(
      'SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, userId]
    );
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ success: false, message: 'Not a member of this group.' });
    }

    const result = await pool.query(
      `SELECT gm.id, gm.sender_id, gm.content, gm.created_at,
              u.name AS sender_name
       FROM group_messages gm
       JOIN users u ON u.id = gm.sender_id
       WHERE gm.group_id = $1
       ORDER BY gm.created_at ASC`,
      [groupId]
    );

    return res.json({ success: true, messages: result.rows });
  } catch (err) {
    console.error('[Groups] Get messages error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;