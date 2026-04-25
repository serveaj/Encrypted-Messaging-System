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
      id                SERIAL PRIMARY KEY,
      username          VARCHAR(50)  UNIQUE NOT NULL,
      email             VARCHAR(100) UNIQUE NOT NULL,
      password_hash     VARCHAR(255) NOT NULL,
      name              VARCHAR(100) NOT NULL,
      avatar_url        VARCHAR(255),
      encryption_key_id VARCHAR(255),
      signing_key_id    VARCHAR(255),
      created_at        TIMESTAMP DEFAULT NOW()
    )
  `);
// Messages table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id           SERIAL PRIMARY KEY,
      sender_id    INTEGER NOT NULL REFERENCES users(id),
      recipient_id INTEGER NOT NULL REFERENCES users(id),
      content      TEXT    NOT NULL,
      file_name    TEXT,
      file_type    TEXT,
      file_data    TEXT,
      created_at   TIMESTAMP DEFAULT NOW()
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

  // Friend requests table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS friend_requests (
      id         SERIAL PRIMARY KEY,
      sender_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,   -- who sent the request
      recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- who receives the request
      status     VARCHAR(20) DEFAULT 'pending',                             -- pending, accepted, rejected
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(sender_id, recipient_id)                                       -- only one pending request per pair
    )
  `);

  console.log('[DB] Tables ready: users, messages, groups, group_members, group_messages, contacts, friend_requests.');
};

// Run initDB when the server starts
initDB().catch((err) => {
  console.error('[DB] Failed to connect or create tables:', err.message);
  console.error('[DB] Check your DB_HOST, DB_USER, DB_PASSWORD, and DB_NAME in server/.env');
  process.exit(1);
});

module.exports = pool;
