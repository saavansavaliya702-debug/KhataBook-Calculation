-- Creates the application database. Run it once, connected to the
-- "postgres" maintenance database:
--
--   psql -U postgres -h localhost -d postgres -f backend/db/create-database.sql
--
-- The tables themselves are created automatically by the backend on startup
-- (see db/schema.sql), so this file only creates the database.

SELECT 'CREATE DATABASE "OfficeData" WITH ENCODING ''UTF8'''
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'OfficeData')
\gexec
