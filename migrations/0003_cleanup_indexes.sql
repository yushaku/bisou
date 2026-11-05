-- Indexes for the daily cleanup (src/worker/lib/cleanup.ts), so each DELETE is a SEARCH.
-- Additive only. Not needed: pair_codes (expires_at) exists since 0002, and the existing
-- otp_requests (email, created_at) and join_attempts (user_id, created_at) indexes cannot
-- serve a filter on created_at alone.

CREATE INDEX otp_codes_expires_at ON otp_codes (expires_at);
CREATE INDEX sessions_expires_at ON sessions (expires_at);
CREATE INDEX otp_requests_created_at ON otp_requests (created_at);
CREATE INDEX join_attempts_created_at ON join_attempts (created_at);
