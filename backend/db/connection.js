// db/connection.js
// Replaces the old Mongoose connection: verifies PostgreSQL is reachable and
// applies db/schema.sql (idempotent) before the server starts accepting
// requests. server.js awaits the exported promise.
require("dotenv").config({ quiet: true });

const fs = require("node:fs/promises");
const path = require("node:path");
const colors = require("colors");

const { pool } = require("./pool");

const SCHEMA_FILE = path.join(__dirname, "schema.sql");

const target = () =>
  `${process.env.DB_USER || "postgres"}@${process.env.DB_HOST || "localhost"}:${
    process.env.DB_PORT || 5432
  }/${process.env.DB_NAME || "OfficeData"}`;

const bootstrap = async () => {
  await pool.query("SELECT 1");
  console.log(colors.green(`✅ PostgreSQL connected (${target()})`));

  const schema = await fs.readFile(SCHEMA_FILE, "utf8");
  await pool.query(schema);
  console.log(colors.green("✅ Database schema is up to date"));
};

const databaseReady = bootstrap();

let closing = false;
const shutdown = async (signal) => {
  if (closing) return;
  closing = true;
  try {
    await pool.end();
    console.log(colors.yellow(`⚠️ PostgreSQL pool closed (${signal})`));
  } finally {
    process.exit(0);
  }
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

module.exports = databaseReady;
