const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     process.env.DB_PORT     || 5432,
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME     || 'securecomm',
});

// Creates tables if they don't already exist
const initDB = async () => {
// Users table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,            -- auto-incrementing unique ID
      username      VARCHAR(50)  UNIQUE NOT NULL,  -- unique login handle
      email         VARCHAR(100) UNIQUE NOT NULL,  -- unique email address
      password_hash VARCHAR(255) NOT NULL,         -- hashed password (NEVER plain text)
      name          VARCHAR(100) NOT NULL,         -- display name
      avatar_url    VARCHAR(255),                  -- profile picture URL
      created_at    TIMESTAMP DEFAULT NOW()        -- auto-set when user is created
    )
  `);
// Messages table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id           SERIAL PRIMARY KEY,
      sender_id    INTEGER NOT NULL REFERENCES users(id),    -- who sent it
      recipient_id INTEGER NOT NULL REFERENCES users(id),    -- who received it
      content      TEXT    NOT NULL,                         -- the message text
      created_at   TIMESTAMP DEFAULT NOW()                   -- when it was sent
    )
  `);
  // Groups table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS groups (
      id         SERIAL PRIMARY KEY,
      name       VARCHAR(100) NOT NULL,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  // Group members table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS group_members (
      group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
      user_id  INTEGER REFERENCES users(id)  ON DELETE CASCADE,
      PRIMARY KEY (group_id, user_id)
    )
  `);
  // Group messages table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS group_messages (
      id         SERIAL PRIMARY KEY,
      group_id   INTEGER REFERENCES groups(id)   ON DELETE CASCADE,
      sender_id  INTEGER REFERENCES users(id),
      content    TEXT    NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  // Contacts table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS contacts (
      user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE, -- the person who added
      contact_id INTEGER REFERENCES users(id) ON DELETE CASCADE, -- the person they added
      created_at TIMESTAMP DEFAULT NOW(),
      PRIMARY KEY (user_id, contact_id)                          -- prevents duplicate entries
    )
  `);

  console.log('[DB] Tables ready: users, messages, groups, group_members, group_messages, contacts.');
};

// Run initDB when the server starts
initDB().catch((err) => {
  console.error('[DB] Failed to connect or create tables:', err.message);
  console.error('[DB] Check your DB_HOST, DB_USER, DB_PASSWORD, and DB_NAME in server/.env');
  process.exit(1);
});

module.exports = pool;