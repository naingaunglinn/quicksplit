-- ── PROFILES (public mirror of auth.users) ───────────────────
CREATE TABLE profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_owner_read" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_owner_update" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Allow the signed-in user to insert their own row if the signup trigger did not run (e.g. legacy users)
CREATE POLICY "profiles_owner_insert" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, email)
  VALUES (new.id, new.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

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
