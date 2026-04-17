const express        = require('express');
const router         = express.Router();
const bcrypt         = require('bcryptjs');
const jwt            = require('jsonwebtoken');
const pool           = require('../db');
const authMiddleware = require('../middleware/auth');

// Generate JWT token for user
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// Creates a new user account
router.post('/register', async (req, res) => {
  const { username, email, password, name } = req.body;

  if (!username || !email || !password || !name) {
    return res.status(400).json({
      success: false,
      message: 'All fields are required.'
    });
  }

  try {
    // Hash the password with bcrypt before saving to db
    const password_hash = await bcrypt.hash(password, 10);

    // Generate a avatar
    const avatar_url = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1abc9c&color=fff`;

    // Insert the new user into the database.
    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, name, avatar_url)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, username, name, avatar_url`,
      [username, email, password_hash, name, avatar_url]
    );

    const newUser = result.rows[0];

    // Build the user object
    const user = {
      id:       newUser.id,
      username: newUser.username,
      name:     newUser.name,
      avatar:   newUser.avatar_url,
    };

    // Generate a token so user is auto logged in
    const token = generateToken(user);

    // Send success response with the token and user info
    return res.status(201).json({ success: true, token, user });

  } catch (err) {
    // Error for already taken username or email
    if (err.code === '23505') {
      if (err.constraint && err.constraint.includes('username')) {
        return res.status(409).json({ success: false, message: 'That username is already taken.' });
      }
      if (err.constraint && err.constraint.includes('email')) {
        return res.status(409).json({ success: false, message: 'An account with that email already exists.' });
      }
    }

    // Something unexpected went wrong — log it and return a generic error
    console.error('[Auth] Register error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

// Logs in an existing user
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'Username and password are required.'
    });
  }

  try {
    // Look up user in the DB
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );

    const dbUser = result.rows[0];

    if (!dbUser) {
      // User not found
      return res.status(401).json({ success: false, message: 'Invalid username or password.' });
    }

    // Password hash comparison
    const passwordMatch = await bcrypt.compare(password, dbUser.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: 'Invalid username or password.' });
    }

    const user = {
      id:       dbUser.id,
      username: dbUser.username,
      name:     dbUser.name,
      avatar:   dbUser.avatar_url,
    };

    const token = generateToken(user);

    return res.json({ success: true, token, user });

  } catch (err) {
    console.error('[Auth] Login error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

// Returns list of all registered users
router.get('/users', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, name, avatar_url FROM users ORDER BY name ASC'
    );

    const users = result.rows.map(u => ({
      id:       u.id,
      username: u.username,
      name:     u.name,
      avatar:   u.avatar_url,
      status:   'online',
    }));

    return res.json({ success: true, users });

  } catch (err) {
    console.error('[Auth] Get users error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Updates display name
router.put('/profile', authMiddleware, async (req, res) => {
  const { name } = req.body;
  const userId   = req.user.id;

  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: 'Name cannot be empty.' });
  }

  try {
    const result = await pool.query(
      `UPDATE users SET name = $1 WHERE id = $2
       RETURNING id, username, name, avatar_url`,
      [name.trim(), userId]
    );

    const updatedUser = {
      id:       result.rows[0].id,
      username: result.rows[0].username,
      name:     result.rows[0].name,
      avatar:   result.rows[0].avatar_url,
    };

    return res.json({ success: true, user: updatedUser });

  } catch (err) {
    console.error('[Auth] Update profile error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;