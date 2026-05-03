-- Custom auth migration:
--   1. New auth_tokens table — magic-link tokens issued by /api/auth/magic-link
--      and consumed by /api/auth/callback.
--   2. Decouple profiles from auth.users so the app owns user identity.
--
-- Run this in the Supabase SQL editor.

-- 1. Magic-link tokens ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS auth_tokens (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text        NOT NULL,
  token      text        NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used       boolean     NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_tokens_token      ON auth_tokens(token);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_email      ON auth_tokens(email);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_expires_at ON auth_tokens(expires_at);

-- 2. Decouple profiles.id from auth.users(id) ────────────────────────
-- The app issues its own JWT and creates profiles directly via the service-role
-- client, so the FK to auth.users is no longer valid. Give id a default and
-- make email the canonical lookup key.
DO $$
DECLARE
  fk_name text;
BEGIN
  SELECT conname INTO fk_name
  FROM   pg_constraint
  WHERE  conrelid = 'public.profiles'::regclass
    AND  contype  = 'f'
    AND  conname LIKE '%auth_users%' OR conname LIKE 'profiles_id_fkey';
  IF fk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.profiles DROP CONSTRAINT %I', fk_name);
  END IF;
END$$;

ALTER TABLE profiles
  ALTER COLUMN id    SET DEFAULT gen_random_uuid(),
  ALTER COLUMN email SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email ON profiles(lower(email));
