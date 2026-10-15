-- No emails, names, IP addresses, recipe text, lists, products, or tokens.
CREATE TABLE usage_logs(id INTEGER PRIMARY KEY, subject TEXT NOT NULL, tool TEXT NOT NULL, status TEXT NOT NULL, duration_ms INTEGER NOT NULL, created_at INTEGER NOT NULL);
CREATE INDEX usage_created_at ON usage_logs(created_at);
CREATE TABLE rate_limits(subject TEXT NOT NULL, bucket TEXT NOT NULL, window INTEGER NOT NULL, count INTEGER NOT NULL, expires_at INTEGER NOT NULL, PRIMARY KEY(subject,bucket,window));
