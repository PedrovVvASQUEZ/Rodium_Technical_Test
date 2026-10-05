CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$ BEGIN
  CREATE TYPE column_type AS ENUM ('text', 'number', 'date', 'phone');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS columns (
  id uuid PRIMARY KEY,
  label text NOT NULL CHECK (length(trim(label)) > 0),
  type column_type NOT NULL,
  position integer NOT NULL CHECK (position >= 0),
  UNIQUE (id, type),
  UNIQUE (label)
);

CREATE TABLE IF NOT EXISTS contacts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contact_values (
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  column_id uuid NOT NULL,
  value_type column_type NOT NULL,
  value_text text,
  value_number numeric,
  value_date date,
  PRIMARY KEY (contact_id, column_id),
  FOREIGN KEY (column_id, value_type) REFERENCES columns(id, type) ON DELETE CASCADE,
  CHECK (
    (value_type IN ('text', 'phone') AND value_text IS NOT NULL AND value_number IS NULL AND value_date IS NULL)
    OR (value_type = 'number' AND value_text IS NULL AND value_number IS NOT NULL AND value_date IS NULL)
    OR (value_type = 'date' AND value_text IS NULL AND value_number IS NULL AND value_date IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS contact_values_column_lookup ON contact_values(column_id, value_type);