// repositories/users.js
// PostgreSQL queries for the "users" table (accounts created by the login /
// register pages).
const { query } = require("../db/pool");

const USER_FIELDS = `
  id AS _id,
  name,
  email,
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const findByEmail = async (email) => {
  const { rows } = await query(
    `SELECT ${USER_FIELDS}, password FROM users WHERE email = $1`,
    [normalizeEmail(email)],
  );
  return rows[0] || null;
};

const findById = async (id) => {
  const { rows } = await query(`SELECT ${USER_FIELDS} FROM users WHERE id = $1`, [
    id,
  ]);
  return rows[0] || null;
};

// Takes an already hashed password.
const createUser = async ({ name, email, password }) => {
  const { rows } = await query(
    `INSERT INTO users (name, email, password)
     VALUES ($1, $2, $3)
     RETURNING ${USER_FIELDS}`,
    [String(name).trim(), normalizeEmail(email), password],
  );
  return rows[0];
};

module.exports = { findByEmail, findById, createUser, normalizeEmail };
