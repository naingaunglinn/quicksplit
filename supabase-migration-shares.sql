ALTER TABLE meetings
  ADD COLUMN IF NOT EXISTS share_mode     text    NOT NULL DEFAULT 'private'
    CHECK (share_mode IN ('private', 'public_link', 'restricted')),
  ADD COLUMN IF NOT EXISTS share_token    text    UNIQUE,
  ADD COLUMN IF NOT EXISTS allowed_emails text[]  NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_meetings_share_token ON meetings(share_token);
