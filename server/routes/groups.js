const express        = require('express');
const router         = express.Router();
const pool           = require('../db');
const authMiddleware = require('../middleware/auth');

const ENCRYPTION_URL = 'http://encryption:8080';

async function decryptGroupContent(content, senderRow, receiverRow, groupId) {
  if (!content) return content;
  let parsed;
  try { parsed = JSON.parse(content); } catch { return content; }
  if (!parsed.encrypted) return content;

  const memberKey = parsed.memberKeys?.[receiverRow.username];
  if (!memberKey || !senderRow.signing_key_id || !receiverRow.encryption_key_id) return '[encrypted]';

  try {
    const res  = await fetch(`${ENCRYPTION_URL}/crypto/decrypt-group`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        senderUsername:          senderRow.username,
        senderSigningKeyId:      senderRow.signing_key_id,
        groupId:                 String(groupId),
        receiverUsername:        receiverRow.username,
        receiverEncryptionKeyId: receiverRow.encryption_key_id,
        encryptedPayload:        parsed.encryptedPayload,
        encryptedSessionKey:     memberKey,
        iv:                      parsed.iv,
        signature:               parsed.signature,
      }),
    });
    const data = await res.json();
    return data.plaintext || '[decryption failed]';
  } catch {
    return '[decryption failed]';
  }
}

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

    const groups = result.rows.map(g => {
      let lastMessage = g.last_message;
      try {
        const parsed = JSON.parse(g.last_message);
        if (parsed.encrypted) lastMessage = '🔒 Encrypted message';
      } catch {}
      return { ...g, last_message: lastMessage };
    });

    return res.json({ success: true, groups });
  } catch (err) {
    console.error('[Groups] Get groups error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Returns decrypted message history for a group
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

    const receiverRes = await pool.query(
      'SELECT username, encryption_key_id FROM users WHERE id = $1', [userId]
    );
    const receiverRow = receiverRes.rows[0];

    const result = await pool.query(
      `SELECT gm.id, gm.sender_id, gm.content, gm.created_at,
              u.name AS sender_name, u.username AS sender_username,
              u.signing_key_id AS sender_signing_key_id
       FROM group_messages gm
       JOIN users u ON u.id = gm.sender_id
       WHERE gm.group_id = $1
       ORDER BY gm.created_at ASC`,
      [groupId]
    );

    const messages = await Promise.all(result.rows.map(async msg => {
      const senderRow = {
        username:       msg.sender_username,
        signing_key_id: msg.sender_signing_key_id,
      };
      const content = await decryptGroupContent(msg.content, senderRow, receiverRow, groupId);
      return {
        id:          msg.id,
        sender_id:   msg.sender_id,
        content,
        created_at:  msg.created_at,
        sender_name: msg.sender_name,
      };
    }));

    return res.json({ success: true, messages });
  } catch (err) {
    console.error('[Groups] Get messages error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
