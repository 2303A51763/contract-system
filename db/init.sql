CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('REQUESTER','LEGAL','FINANCE','ADMIN'))
);

CREATE TABLE contracts (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  counterparty TEXT NOT NULL,
  value NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  created_by INT REFERENCES users(id),
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE approvals (
  id SERIAL PRIMARY KEY,
  contract_id INT REFERENCES contracts(id) ON DELETE CASCADE,
  approver_role TEXT NOT NULL,
  decision TEXT NOT NULL DEFAULT 'PENDING',
  decided_by INT REFERENCES users(id),
  comment TEXT,
  decided_at TIMESTAMPTZ
);

CREATE TABLE audit_log (
  id SERIAL PRIMARY KEY,
  contract_id INT,
  actor_id INT,
  action TEXT NOT NULL,
  details JSONB,
  at TIMESTAMPTZ DEFAULT now()
);