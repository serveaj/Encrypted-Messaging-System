const express        = require('express');
const router         = express.Router();
const pool           = require('../db');
const authMiddleware = require('../middleware/auth');

// Gets users accepted contacts
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

// Send a friend request
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
    // Check if they're already contacts
    const existingContact = await pool.query(
      `SELECT 1 FROM contacts WHERE user_id = $1 AND contact_id = $2`,
      [userId, contactId]
    );

    if (existingContact.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Already a contact.' });
    }

    // Check if there's already a pending request from either side
    const existingRequest = await pool.query(
      `SELECT * FROM friend_requests 
       WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)
       AND status = 'pending'`,
      [userId, contactId]
    );

    if (existingRequest.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Request already pending.' });
    }

    // Create the friend request
    const result = await pool.query(
      `INSERT INTO friend_requests (sender_id, receiver_id, status)
       VALUES ($1, $2, 'pending')
       RETURNING id, sender_id, receiver_id, status, created_at`,
      [userId, contactId]
    );

    const request = result.rows[0];

    return res.json({ 
      success: true, 
      requestId: request.id,
      message: 'Friend request sent.' 
    });
  } catch (err) {
    console.error('[Contacts] Send friend request error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Get pending friend requests for the logged-in user
router.get('/requests/pending', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        fr.id as request_id,
        fr.sender_id,
        u.id,
        u.username,
        u.name,
        u.avatar_url,
        fr.created_at
       FROM friend_requests fr
       JOIN users u ON u.id = fr.sender_id
       WHERE fr.receiver_id = $1 AND fr.status = 'pending'
       ORDER BY fr.created_at DESC`,
      [req.user.id]
    );

    return res.json({ success: true, requests: result.rows });
  } catch (err) {
    console.error('[Contacts] Get pending requests error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Accept a friend request
router.post('/requests/:requestId/accept', authMiddleware, async (req, res) => {
  const { requestId } = req.params;
  const userId = req.user.id;

  try {
    // Get the request
    const request = await pool.query(
      `SELECT * FROM friend_requests WHERE id = $1`,
      [requestId]
    );

    if (request.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    const friendRequest = request.rows[0];

    // Verify the user is the receiver
    if (friendRequest.receiver_id !== userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    if (friendRequest.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Request already processed.' });
    }

    // Update request status to accepted
    await pool.query(
      `UPDATE friend_requests SET status = 'accepted', updated_at = NOW() WHERE id = $1`,
      [requestId]
    );

    // Add contact for both sides (bidirectional)
    await pool.query(
      `INSERT INTO contacts (user_id, contact_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [friendRequest.sender_id, friendRequest.receiver_id]
    );

    await pool.query(
      `INSERT INTO contacts (user_id, contact_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [friendRequest.receiver_id, friendRequest.sender_id]
    );

    // Get the sender's info to return
    const senderInfo = await pool.query(
      `SELECT id, username, name, avatar_url FROM users WHERE id = $1`,
      [friendRequest.sender_id]
    );

    // Get the receiver's (current user's) info to send to the sender
    const receiverInfo = await pool.query(
      `SELECT id, username, name, avatar_url FROM users WHERE id = $1`,
      [userId]
    );

    // Notify the sender that the request was accepted
    const io = req.app.get('io');
    const onlineUsers = req.app.get('onlineUsers');
    const senderSocketId = onlineUsers[friendRequest.sender_id];
    
    if (senderSocketId && io && receiverInfo.rows[0]) {
      io.to(senderSocketId).emit('friend_request_accepted', {
        contact: {
          id: receiverInfo.rows[0].id,
          name: receiverInfo.rows[0].name,
          username: receiverInfo.rows[0].username,
          avatar_url: receiverInfo.rows[0].avatar_url,
        }
      });
    }

    return res.json({ 
      success: true,
      contact: senderInfo.rows[0],
      message: 'Friend request accepted.' 
    });
  } catch (err) {
    console.error('[Contacts] Accept request error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Reject a friend request
router.post('/requests/:requestId/reject', authMiddleware, async (req, res) => {
  const { requestId } = req.params;
  const userId = req.user.id;

  try {
    // Get the request
    const request = await pool.query(
      `SELECT * FROM friend_requests WHERE id = $1`,
      [requestId]
    );

    if (request.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    const friendRequest = request.rows[0];

    // Verify the user is the receiver
    if (friendRequest.receiver_id !== userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    if (friendRequest.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Request already processed.' });
    }

    // Update request status to rejected
    await pool.query(
      `UPDATE friend_requests SET status = 'rejected', updated_at = NOW() WHERE id = $1`,
      [requestId]
    );

    return res.json({ 
      success: true,
      message: 'Friend request rejected.' 
    });
  } catch (err) {
    console.error('[Contacts] Reject request error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;