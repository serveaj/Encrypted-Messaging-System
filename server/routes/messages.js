const express        = require('express');
const router         = express.Router();
const pool           = require('../db');
const authMiddleware = require('../middleware/auth');

const ENCRYPTION_URL = 'http://encryption:8080';

async function decryptContent(content, senderRow, receiverRow) {
  if (!content) return content;
  let parsed;
  try { parsed = JSON.parse(content); } catch { return content; }
  if (!parsed.encrypted) return content;

  if (!senderRow.signing_key_id || !receiverRow.encryption_key_id) return '[encrypted]';

  try {
    const res  = await fetch(`${ENCRYPTION_URL}/crypto/decrypt`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        senderUsername:        senderRow.username,
        senderSigningKeyId:    senderRow.signing_key_id,
        receiverUsername:      receiverRow.username,
        receiverEncryptionKeyId: receiverRow.encryption_key_id,
        encryptedPayload:      parsed.encryptedPayload,
        encryptedSessionKey:   parsed.encryptedSessionKey,
        iv:                    parsed.iv,
        signature:             parsed.signature,
      }),
    });
    const data = await res.json();
    if (!data.plaintext) {
      console.error('[Decrypt] Encryption service error:', JSON.stringify(data));
    }
    return data.plaintext || '[decryption failed]';
  } catch (err) {
    console.error('[Decrypt] Fetch error:', err.message);
    return '[decryption failed]';
  }
}

// Returns the last message for each conversation (with decryption)
router.get('/previews', authMiddleware, async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await pool.query(`
      SELECT DISTINCT ON (other_id)
        other_id,
        m.content,
        m.created_at,
        m.sender_id,
        s.username AS sender_username,
        s.signing_key_id AS sender_signing_key_id,
        r.username AS receiver_username,
        r.encryption_key_id AS receiver_encryption_key_id
      FROM (
        SELECT
          CASE WHEN sender_id = $1 THEN recipient_id ELSE sender_id END AS other_id,
          id, content, created_at, sender_id, recipient_id
        FROM messages
        WHERE sender_id = $1 OR recipient_id = $1
      ) sub
      JOIN messages m ON m.id = sub.id
      JOIN users s ON s.id = m.sender_id
      JOIN users r ON r.id = m.recipient_id
      ORDER BY other_id, m.created_at DESC
    `, [userId]);

    const previews = await Promise.all(result.rows.map(async row => {
      const senderRow   = { username: row.sender_username,   signing_key_id: row.sender_signing_key_id };
      const receiverRow = { username: row.receiver_username, encryption_key_id: row.receiver_encryption_key_id };
      const content     = await decryptContent(row.content, senderRow, receiverRow);
      return { other_id: row.other_id, sender_id: row.sender_id, created_at: row.created_at, content };
    }));

    return res.json({ success: true, previews });

  } catch (err) {
    console.error('[Messages] Previews error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Gets and decrypts message history between two users
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
        s.username AS sender_username,
        s.name     AS sender_name,
        s.signing_key_id AS sender_signing_key_id,
        r.username AS receiver_username,
        r.encryption_key_id AS receiver_encryption_key_id
      FROM messages m
      JOIN users s ON s.id = m.sender_id
      JOIN users r ON r.id = m.recipient_id
      WHERE
        (m.sender_id = $1 AND m.recipient_id = $2)
        OR
        (m.sender_id = $2 AND m.recipient_id = $1)
      ORDER BY m.created_at ASC
    `, [myId, theirId]);

    const messages = await Promise.all(result.rows.map(async msg => {
      const senderRow   = { username: msg.sender_username,   signing_key_id: msg.sender_signing_key_id };
      const receiverRow = { username: msg.receiver_username, encryption_key_id: msg.receiver_encryption_key_id };
      const content     = await decryptContent(msg.content, senderRow, receiverRow);
      return {
        id:           msg.id,
        sender_id:    msg.sender_id,
        recipient_id: msg.recipient_id,
        content,
        file_name:    msg.file_name,
        file_type:    msg.file_type,
        file_data:    msg.file_data,
        created_at:   msg.created_at,
        sender_name:  msg.sender_name,
      };
    }));

    return res.json({ success: true, messages });

  } catch (err) {
    console.error('[Messages] Fetch history error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
