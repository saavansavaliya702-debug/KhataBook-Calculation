-- KhataBook schema (PostgreSQL).
--
-- This file is executed automatically every time the backend starts
-- (see db/connection.js). Every statement is idempotent, so restarting the
-- server never drops or duplicates data.

-- ---------------------------------------------------------------- accounts --
CREATE TABLE IF NOT EXISTS users (
  id         BIGSERIAL   PRIMARY KEY,
  name       TEXT        NOT NULL,
  email      TEXT        NOT NULL,
  password   TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON users (email);

-- ----------------------------------------------------------------- people --
-- A person is a worker/party in the ledger. person_number is the short
-- human friendly id (#1, #2, ...) assigned through the counters table.
CREATE TABLE IF NOT EXISTS people (
  id              BIGSERIAL   PRIMARY KEY,
  person_number   INTEGER     NOT NULL,
  name            TEXT        NOT NULL,
  normalized_name TEXT        NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS people_person_number_key ON people (person_number);
CREATE UNIQUE INDEX IF NOT EXISTS people_normalized_name_key ON people (normalized_name);

-- ---------------------------------------------------------------- workers --
-- One row per ledger entry. person_id is nullable on purpose: deleting a
-- person keeps their ledger history (ON DELETE SET NULL).
CREATE TABLE IF NOT EXISTS workers (
  id             BIGSERIAL        PRIMARY KEY,
  person_id      BIGINT           REFERENCES people (id) ON DELETE SET NULL,
  person_number  INTEGER,
  name           TEXT             NOT NULL,
  shape          TEXT             NOT NULL DEFAULT 'Fancy'
                                  CHECK (shape IN ('Fancy', 'Round')),
  weight         TEXT             NOT NULL,
  weight_entries JSONB            NOT NULL DEFAULT '[]'::jsonb,
  total_count    INTEGER          NOT NULL DEFAULT 0,
  total_weight   DOUBLE PRECISION NOT NULL DEFAULT 0,
  total_rupee    DOUBLE PRECISION NOT NULL DEFAULT 0,
  due_amount     DOUBLE PRECISION,
  record_date    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS workers_person_id_idx ON workers (person_id);
CREATE INDEX IF NOT EXISTS workers_person_number_idx ON workers (person_number);
CREATE INDEX IF NOT EXISTS workers_created_at_idx ON workers (created_at);

-- --------------------------------------------------------------- counters --
-- Generic sequence table, used for the person number (#1, #2, ...).
CREATE TABLE IF NOT EXISTS counters (
  name     TEXT   PRIMARY KEY,
  sequence BIGINT NOT NULL DEFAULT 0
);

INSERT INTO counters (name, sequence)
VALUES ('personNumber', 0)
ON CONFLICT (name) DO NOTHING;
