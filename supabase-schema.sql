-- ── MEETINGS ─────────────────────────────────────────────────
CREATE TABLE meetings (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id      text        UNIQUE NOT NULL,
  transcript    text        NOT NULL,
  summary       jsonb       NOT NULL,
  input_type    text        NOT NULL DEFAULT 'text'
                            CHECK (input_type IN ('text','audio','video')),
  drive_file_id text,
  created_at    timestamptz DEFAULT now(),
  user_id       uuid        REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;

-- Public read (magic link — no auth required)
CREATE POLICY "meetings_public_read" ON meetings
  FOR SELECT USING (true);

-- Owner or anonymous can insert
CREATE POLICY "meetings_owner_insert" ON meetings
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR user_id IS NULL
  );

-- ── TASKS ─────────────────────────────────────────────────────
CREATE TABLE tasks (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id  uuid    NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  owner       text    NOT NULL,
  description text    NOT NULL,
  done        boolean DEFAULT false
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks_public_read" ON tasks
  FOR SELECT USING (true);

CREATE POLICY "tasks_insert" ON tasks
  FOR INSERT WITH CHECK (true);

-- ── INTEGRATION LOGS ──────────────────────────────────────────
CREATE TABLE integration_logs (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id  uuid        NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  type        text        NOT NULL CHECK (type IN ('slack','teams')),
  channel     text,
  sent_at     timestamptz DEFAULT now()
);

ALTER TABLE integration_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "integration_owner_only" ON integration_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM meetings m
      WHERE m.id = meeting_id
      AND (m.user_id = auth.uid() OR m.user_id IS NULL)
    )
  );

-- ── INDEXES ───────────────────────────────────────────────────
CREATE INDEX idx_meetings_short_id ON meetings(short_id);
CREATE INDEX idx_tasks_meeting_id  ON tasks(meeting_id);
