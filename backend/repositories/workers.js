// repositories/workers.js
// PostgreSQL queries for the "workers" table (one row per ledger entry).
const { query } = require("../db/pool");

const WORKER_FIELDS = `
  id AS _id,
  person_id AS "personId",
  person_number AS "personNumber",
  name,
  shape,
  weight,
  weight_entries AS "weightEntries",
  total_count AS "totalCount",
  total_weight AS "totalWeight",
  total_rupee AS "totalRupee",
  due_amount AS "dueAmount",
  record_date AS "recordDate",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

// Allowed PATCH fields: API name -> column name.
const UPDATABLE_COLUMNS = {
  personId: "person_id",
  personNumber: "person_number",
  name: "name",
  shape: "shape",
  weight: "weight",
  weightEntries: "weight_entries",
  totalCount: "total_count",
  totalWeight: "total_weight",
  totalRupee: "total_rupee",
  dueAmount: "due_amount",
  recordDate: "record_date",
};

const JSON_COLUMNS = new Set(["weight_entries"]);

const listWorkers = async () => {
  const { rows } = await query(
    `SELECT ${WORKER_FIELDS} FROM workers ORDER BY created_at ASC, id ASC`,
  );
  return rows;
};

const findById = async (id) => {
  const { rows } = await query(
    `SELECT ${WORKER_FIELDS} FROM workers WHERE id = $1`,
    [id],
  );
  return rows[0] || null;
};

const createWorker = async (record) => {
  const { rows } = await query(
    `INSERT INTO workers (
       person_id, person_number, name, shape, weight, weight_entries,
       total_count, total_weight, total_rupee, due_amount, record_date
     )
     VALUES ($1, $2, $3, COALESCE($4, 'Fancy'), $5, COALESCE($6::jsonb, '[]'::jsonb),
             $7, $8, $9, $10, $11)
     RETURNING ${WORKER_FIELDS}`,
    [
      record.personId ?? null,
      record.personNumber ?? null,
      record.name,
      record.shape ?? null,
      record.weight,
      record.weightEntries === undefined
        ? null
        : JSON.stringify(record.weightEntries),
      record.totalCount,
      record.totalWeight,
      record.totalRupee,
      record.dueAmount ?? null,
      record.recordDate ?? null,
    ],
  );
  return rows[0];
};

// PATCH: only the fields present in the payload are written.
const updateWorker = async (id, patch) => {
  const assignments = [];
  const values = [];

  for (const [apiField, column] of Object.entries(UPDATABLE_COLUMNS)) {
    if (!Object.prototype.hasOwnProperty.call(patch, apiField)) continue;
    let value = patch[apiField];
    if (JSON_COLUMNS.has(column)) value = JSON.stringify(value ?? []);
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  }

  if (assignments.length === 0) return findById(id);

  assignments.push("updated_at = NOW()");
  values.push(id);

  const { rows } = await query(
    `UPDATE workers SET ${assignments.join(", ")}
     WHERE id = $${values.length}
     RETURNING ${WORKER_FIELDS}`,
    values,
  );
  return rows[0] || null;
};

const deleteWorker = async (id) => {
  const { rows } = await query(
    `DELETE FROM workers WHERE id = $1 RETURNING ${WORKER_FIELDS}`,
    [id],
  );
  return rows[0] || null;
};

// --- helpers for the "legacy rows without a person" backfill (GET /People) --

const listLegacyWorkerNames = async () => {
  const { rows } = await query(
    `SELECT DISTINCT TRIM(name) AS name
       FROM workers
      WHERE person_number IS NULL
        AND name IS NOT NULL
        AND TRIM(name) <> ''`,
  );
  return rows.map((row) => row.name);
};

const attachPersonToLegacyWorkers = async (name, person) => {
  await query(
    `UPDATE workers
        SET person_id = $1,
            person_number = $2,
            updated_at = NOW()
      WHERE person_number IS NULL
        AND TRIM(name) = $3`,
    [person._id, person.personNumber, name],
  );
};

module.exports = {
  listWorkers,
  findById,
  createWorker,
  updateWorker,
  deleteWorker,
  listLegacyWorkerNames,
  attachPersonToLegacyWorkers,
};
