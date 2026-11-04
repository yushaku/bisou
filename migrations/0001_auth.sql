-- Auth tables for the login spike: users, one-time codes, request log for rate limits, sessions.
-- Times are Unix epoch milliseconds.

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  locale TEXT NOT NULL DEFAULT 'vi' CHECK (locale IN ('vi', 'en')),
  created_at INTEGER NOT NULL
);

-- One live code per email. Only the HMAC of the code is stored.
CREATE TABLE otp_codes (
  email TEXT PRIMARY KEY,
  code_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

-- One row per accepted code request, used for the per email rate limit.
CREATE TABLE otp_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX otp_requests_email_created ON otp_requests (email, created_at);

-- Only SHA-256 of the session token is stored.
CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX sessions_user_id ON sessions (user_id);
