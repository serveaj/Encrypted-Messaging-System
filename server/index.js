const express = require('express');
const cors    = require('cors');
const http    = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

// Import DB
const pool = require('./db');

// Import route files
const authRoutes    = require('./routes/auth');
const messageRoutes = require('./routes/messages');
const groupRoutes    = require('./routes/groups');
const contactRoutes  = require('./routes/contacts');

const app = express();

// Allows communication between front and backend
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

app.use(express.json());

app.use('/api/auth',     authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/groups',   groupRoutes);   
app.use('/api/contacts', contactRoutes); 

// Confirm server is running
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'SecureComm server is running.' });
});

// Returns list of onlie userIDs
app.get('/api/online', (req, res) => {
  const onlineUserIds = Object.keys(onlineUsers).map(Number);
  res.json({ success: true, onlineUserIds });
});

// HTTP server for socket.io
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  }
});

// Online users list
const onlineUsers = {};

// Make io and onlineUsers available to routes
app.set('io', io);
app.set('onlineUsers', onlineUsers);

io.on('connection', (socket) => {
  console.log(`[Socket.io] New connection: ${socket.id}`);

// Socket event for registering/logging in
  socket.on('register', (userId) => {
    onlineUsers[userId] = socket.id;
    console.log(`[Socket.io] User ${userId} is online`);
    io.emit('user_online', Number(userId));
  });

  // Socket event for sending messages
  socket.on('send_message', async ({ senderId, recipientId, content, fileName, fileType, fileData }) => {
    try {
      // Encrypt message via encryption service
      let contentToStore = content;
      const usersRes = await pool.query(
        'SELECT id, username, encryption_key_id, signing_key_id FROM users WHERE id = ANY($1)',
        [[senderId, recipientId]]
      );
      const sender   = usersRes.rows.find(u => u.id === senderId);
      const receiver = usersRes.rows.find(u => u.id === recipientId);

      if (sender?.signing_key_id && receiver?.encryption_key_id) {
        try {
          const encRes  = await fetch('http://encryption:8080/crypto/encrypt', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
              message:                 content,
              senderUsername:          sender.username,
              senderSigningKeyId:      sender.signing_key_id,
              receiverUsername:        receiver.username,
              receiverEncryptionKeyId: receiver.encryption_key_id,
            }),
          });
          const encData = await encRes.json();
          contentToStore = JSON.stringify({ encrypted: true, ...encData });
        } catch (encErr) {
          console.error('[Socket.io] Encryption failed, storing plaintext:', encErr.message);
        }
      }

      // Save the encrypted message to the DB
      const result = await pool.query(
        `INSERT INTO messages (sender_id, recipient_id, content, file_name, file_type, file_data)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, sender_id, recipient_id, content, file_name, file_type, file_data, created_at`,
        [senderId, recipientId, contentToStore, fileName || null, fileType || null, fileData || null]
      );

      const savedMessage = result.rows[0];

      // Build message object
      const messagePayload = {
        id:          savedMessage.id,
        senderId:    savedMessage.sender_id,
        recipientId: savedMessage.recipient_id,
        content:     savedMessage.content,
        createdAt:   savedMessage.created_at,
        fileName:    savedMessage.file_name  || null,
        fileType:    savedMessage.file_type  || null,
        fileData:    savedMessage.file_data  || null,
      };

      // Send message to recipient if they are online
      const recipientSocketId = onlineUsers[recipientId];
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('receive_message', messagePayload);
        console.log(`[Socket.io] Message delivered to user ${recipientId}`);
      } else {
        console.log(`[Socket.io] User ${recipientId} is offline — message saved for later`);
      }

      // Confirm to sender
      socket.emit('message_sent', messagePayload);

    } catch (err) {
      console.error('[Socket.io] send_message error:', err.message);
      socket.emit('message_error', { message: 'Failed to send message. Please try again.' });
    }
  });

  // Socket event for creating a group
  socket.on('create_group', async ({ creatorId, name, memberIds }) => {
    try {
      const groupResult = await pool.query(
        `INSERT INTO groups (name, created_by) VALUES ($1, $2)
         RETURNING id, name, created_at`,
        [name, creatorId]
      );
      const group = groupResult.rows[0];

      const allMemberIds = [...new Set([creatorId, ...memberIds])];

      for (const userId of allMemberIds) {
        await pool.query(
          'INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)',
          [group.id, userId]
        );
      }

      // Build group payload to send to all members
      const groupPayload = {
        id:        group.id,
        name:      group.name,
        createdAt: group.created_at,
        memberIds: allMemberIds,
      };

      for (const userId of allMemberIds) {
        const socketId = onlineUsers[userId];
        if (socketId) {
          io.to(socketId).emit('group_created', groupPayload);
        }
      }

      console.log(`[Socket.io] Group "${name}" created with ${allMemberIds.length} members`);

    } catch (err) {
      console.error('[Socket.io] create_group error:', err.message);
      socket.emit('group_error', { message: 'Failed to create group.' });
    }
  });

  // Socket event for sending a message in a group
  socket.on('send_group_message', async ({ senderId, groupId, content, fileName, fileType, fileData }) => {
    try {
      // Fetch sender info and all group members with their KMS keys
      const senderResult = await pool.query(
        'SELECT id, username, name, signing_key_id FROM users WHERE id = $1', [senderId]
      );
      const senderRow  = senderResult.rows[0];
      const senderName = senderRow?.name || 'Unknown';

      const membersResult = await pool.query(
        `SELECT u.id, u.username, u.encryption_key_id
         FROM group_members gm
         JOIN users u ON u.id = gm.user_id
         WHERE gm.group_id = $1`, [groupId]
      );

      // Encrypt for all members if keys are available
      let contentToStore = content;
      const memberKeys = {};
      const membersWithKeys = membersResult.rows.filter(m => m.encryption_key_id);

      if (senderRow?.signing_key_id && membersWithKeys.length > 0) {
        try {
          const encRes  = await fetch('http://encryption:8080/crypto/encrypt-group', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
              message:           content,
              senderUsername:    senderRow.username,
              senderSigningKeyId: senderRow.signing_key_id,
              groupId:           String(groupId),
              members:           membersWithKeys.map(m => ({
                username:        m.username,
                encryptionKeyId: m.encryption_key_id,
              })),
            }),
          });
          const encData = await encRes.json();
          contentToStore = JSON.stringify({
            encrypted:      true,
            encryptedPayload: encData.encryptedPayload,
            iv:             encData.iv,
            signature:      encData.signature,
            memberKeys:     encData.memberKeys,
          });
        } catch (encErr) {
          console.error('[Socket.io] Group encryption failed, storing plaintext:', encErr.message);
        }
      }

      const result = await pool.query(
        `INSERT INTO group_messages (group_id, sender_id, content)
         VALUES ($1, $2, $3)
         RETURNING id, group_id, sender_id, content, created_at`,
        [groupId, senderId, contentToStore]
      );
      const saved = result.rows[0];

      const membersResult2 = await pool.query(
        'SELECT user_id FROM group_members WHERE group_id = $1', [groupId]
      );

      const messagePayload = {
        id:         saved.id,
        groupId:    saved.group_id,
        senderId:   saved.sender_id,
        senderName,
        content,
        createdAt:  saved.created_at,
        fileName:   fileName || null,
        fileType:   fileType || null,
        fileData:   fileData || null,
      };

      for (const { user_id } of membersResult2.rows) {
        if (user_id !== senderId) {
          const socketId = onlineUsers[user_id];
          if (socketId) {
            io.to(socketId).emit('receive_group_message', messagePayload);
          }
        }
      }

      socket.emit('group_message_sent', messagePayload);

    } catch (err) {
      console.error('[Socket.io] send_group_message error:', err.message);
      socket.emit('message_error', { message: 'Failed to send group message.' });
    }
  });

  // Socket event for sending a friend request
  socket.on('send_friend_request', async ({ senderId, receiverId }) => {
    try {
      const targetId = Number(receiverId);

      if (!Number.isInteger(targetId)) {
        socket.emit('friend_request_error', { message: 'Invalid receiver.' });
        return;
      }

      // Get sender info
      const senderResult = await pool.query(
        'SELECT id, username, name, avatar_url FROM users WHERE id = $1',
        [senderId]
      );
      if (senderResult.rows.length === 0) {
        socket.emit('friend_request_error', { message: 'Sender not found.' });
        return;
      }

      const sender = senderResult.rows[0];
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const existingContact = await client.query(
          `SELECT 1 FROM contacts WHERE (user_id = $1 AND contact_id = $2) OR (user_id = $2 AND contact_id = $1)`,
          [senderId, targetId]
        );

        if (existingContact.rows.length > 0) {
          await client.query('ROLLBACK');
          socket.emit('friend_request_error', { message: 'Already a contact.' });
          return;
        }

        const existingRequest = await client.query(
          `SELECT id, status FROM friend_requests
           WHERE (sender_id = $1 AND recipient_id = $2) OR (sender_id = $2 AND recipient_id = $1)`,
          [senderId, targetId]
        );

        if (existingRequest.rows.length > 0) {
          const pendingRequest = existingRequest.rows.find(r => r.status === 'pending');
          if (pendingRequest) {
            await client.query('ROLLBACK');
            socket.emit('friend_request_error', { message: 'Request already pending.' });
            return;
          }

          await client.query(
            `DELETE FROM friend_requests
             WHERE (sender_id = $1 AND recipient_id = $2) OR (sender_id = $2 AND recipient_id = $1)`,
            [senderId, targetId]
          );
        }

        // Create the friend request in DB
        const requestResult = await client.query(
          `INSERT INTO friend_requests (sender_id, recipient_id, status)
           VALUES ($1, $2, 'pending')
           ON CONFLICT DO NOTHING
           RETURNING id, sender_id, recipient_id, status, created_at`,
          [senderId, targetId]
        );

        if (requestResult.rows.length === 0) {
          await client.query('ROLLBACK');
          socket.emit('friend_request_error', { message: 'Unable to create friend request.' });
          return;
        }

        const request = requestResult.rows[0];

        // Notify the receiver if they're online
        const receiverSocketId = onlineUsers[targetId];
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('friend_request_received', {
            request_id: request.id,
            sender_id: sender.id,
            username: sender.username,
            name: sender.name,
            avatar_url: sender.avatar_url,
            created_at: request.created_at,
          });
          console.log(`[Socket.io] Friend request sent from ${senderId} to ${targetId}`);
        } else {
          console.log(`[Socket.io] User ${receiverId} is offline — friend request saved`);
        }

        await client.query('COMMIT');

        // Confirm to sender
        socket.emit('friend_request_sent', {
          requestId: request.id,
          message: 'Friend request sent.'
        });
      } catch (err) {
        try {
          await client.query('ROLLBACK');
        } catch (rollbackErr) {
          console.error('[Socket.io] Rollback error:', rollbackErr.message);
        }
        throw err;
      } finally {
        client.release();
      }

    } catch (err) {
      console.error('[Socket.io] send_friend_request error:', err.message);
      socket.emit('friend_request_error', { message: 'Failed to send friend request.' });
    }
  });

  // Disconnect when user closes tab or loses connection
  socket.on('disconnect', () => {
    for (const [userId, socketId] of Object.entries(onlineUsers)) {
      if (socketId === socket.id) {
        delete onlineUsers[userId];
        console.log(`[Socket.io] User ${userId} went offline`);
        io.emit('user_offline', Number(userId));
        break;
      }
    }
  });
});

// Listen for servers
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`\n[Server] SecureComm backend running on http://localhost:${PORT}`);
  console.log(`[Server] Health check: http://localhost:${PORT}/api/health\n`);
});
