CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  provider VARCHAR(20) NOT NULL,
  provider_id VARCHAR(150) NOT NULL,
  email VARCHAR(320),
  display_name VARCHAR(120) NOT NULL,
  avatar_url TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','blocked')),
  role VARCHAR(20) NOT NULL DEFAULT 'user'
    CHECK (role IN ('user','admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider, provider_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS users_provider_email_unique
ON users (LOWER(email), provider)
WHERE email IS NOT NULL;

CREATE TABLE IF NOT EXISTS titles (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(180) NOT NULL,
  synopsis TEXT NOT NULL DEFAULT '',
  kind VARCHAR(20) NOT NULL CHECK (kind IN ('movie','series')),
  category VARCHAR(80) NOT NULL DEFAULT 'Destaques',
  poster_url TEXT NOT NULL DEFAULT '',
  banner_url TEXT NOT NULL DEFAULT '',
  playback_url TEXT NOT NULL,
  year INTEGER,
  age_rating VARCHAR(20) DEFAULT 'Livre',
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS watch_progress (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title_id BIGINT NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
  seconds INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(user_id, title_id)
);

CREATE TABLE IF NOT EXISTS user_lists (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title_id BIGINT NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(user_id, title_id)
);
