const express        = require('express');
const router         = express.Router();
const pool           = require('../db');
const authMiddleware = require('../middleware/auth');

// Gets users contacts
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.username, u.name, u.avatar_url
       FROM contacts c
       JOIN users u ON u.id = c.contact_id
       WHERE c.user_id = $1
       ORDER BY u.name ASC`,
      [req.user.id]
    );

    return res.json({ success: true, contacts: result.rows });
  } catch (err) {
    console.error('[Contacts] Get contacts error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Add contact
router.post('/', authMiddleware, async (req, res) => {
  const { contactId } = req.body;
  const userId = req.user.id;

  if (!contactId) {
    return res.status(400).json({ success: false, message: 'contactId is required.' });
  }

  if (contactId === userId) {
    return res.status(400).json({ success: false, message: 'You cannot add yourself.' });
  }

  try {
    await pool.query(
      `INSERT INTO contacts (user_id, contact_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [userId, contactId]
    );

    return res.json({ success: true });
  } catch (err) {
    console.error('[Contacts] Add contact error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;