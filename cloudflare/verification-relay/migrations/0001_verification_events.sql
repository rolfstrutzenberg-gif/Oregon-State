CREATE TABLE IF NOT EXISTS verification_events (
  id TEXT PRIMARY KEY,
  payload TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  lease_until TEXT,
  error TEXT,
  status_code INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_verification_events_queue
  ON verification_events (status, lease_until, created_at);
