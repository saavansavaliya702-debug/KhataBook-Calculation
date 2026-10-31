// db/pool.js
// Single PostgreSQL connection pool shared by the whole backend.
require("dotenv").config({ quiet: true });

const colors = require("colors");
const { Pool, types } = require("pg");

// BIGINT columns (ids, counters, COUNT(*)) are returned as strings by
// default. The API used to return Mongo ids as strings too, but the client
// compares ids and personId with ===, so ids and person ids must share one
// type. Returning numbers keeps that comparison working.
types.setTypeParser(types.builtins.INT8, (value) =>
  value === null ? null : Number(value),
);

const sslEnabled = String(process.env.DB_SSL || "").toLowerCase() === "true";

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "OfficeData",
  max: Number(process.env.DB_POOL_MAX || 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: sslEnabled ? { rejectUnauthorized: false } : undefined,
});

// An idle client erroring out must not crash the process.
pool.on("error", (error) => {
  console.error(colors.red("PostgreSQL pool error:"), error.message);
});

const query = (text, params) => pool.query(text, params);

// Runs `work(client)` inside a transaction and rolls back on any error.
const withTransaction = async (work) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

module.exports = { pool, query, withTransaction };
