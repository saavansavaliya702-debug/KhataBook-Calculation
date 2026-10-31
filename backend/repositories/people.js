// repositories/people.js
// PostgreSQL queries for the "people" table plus the personNumber counter.
const { query, withTransaction } = require("../db/pool");

const PERSON_FIELDS = `
  id AS _id,
  person_number AS "personNumber",
  name,
  normalized_name AS "normalizedName",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

const normalizeName = (name) => String(name || "").trim().toLocaleLowerCase();

const listPeople = async () => {
  const { rows } = await query(
    `SELECT ${PERSON_FIELDS} FROM people ORDER BY person_number ASC`,
  );
  return rows;
};

const findById = async (id) => {
  const { rows } = await query(
    `SELECT ${PERSON_FIELDS} FROM people WHERE id = $1`,
    [id],
  );
  return rows[0] || null;
};

const findByNormalizedName = async (normalizedName) => {
  const { rows } = await query(
    `SELECT ${PERSON_FIELDS} FROM people WHERE normalized_name = $1`,
    [normalizedName],
  );
  return rows[0] || null;
};

// Atomically takes the next person number and inserts the person in one
// transaction. Returns the existing person when the name is already known.
const createPerson = async (rawName) => {
  const name = String(rawName || "").trim();
  const normalizedName = normalizeName(name);

  const existing = await findByNormalizedName(normalizedName);
  if (existing) return existing;

  return withTransaction(async (client) => {
    const { rows: counterRows } = await client.query(
      `INSERT INTO counters (name, sequence)
       VALUES ('personNumber', 1)
       ON CONFLICT (name) DO UPDATE SET sequence = counters.sequence + 1
       RETURNING sequence`,
    );

    const { rows } = await client.query(
      `INSERT INTO people (person_number, name, normalized_name)
       VALUES ($1, $2, $3)
       RETURNING ${PERSON_FIELDS}`,
      [counterRows[0].sequence, name, normalizedName],
    );
    return rows[0];
  });
};

// Deletes a person and resets the numbering when the list becomes empty.
// Ledger rows keep their history: workers.person_id is set to NULL.
const deletePerson = async (id) =>
  withTransaction(async (client) => {
    const { rows } = await client.query(
      `DELETE FROM people WHERE id = $1 RETURNING ${PERSON_FIELDS}`,
      [id],
    );
    if (rows.length === 0) return null;

    const { rows: countRows } = await client.query(
      "SELECT COUNT(*) AS remaining FROM people",
    );

    if (Number(countRows[0].remaining) === 0) {
      await client.query(
        `INSERT INTO counters (name, sequence)
         VALUES ('personNumber', 0)
         ON CONFLICT (name) DO UPDATE SET sequence = 0`,
      );
    }

    return rows[0];
  });

module.exports = {
  listPeople,
  findById,
  findByNormalizedName,
  createPerson,
  deletePerson,
  normalizeName,
};
