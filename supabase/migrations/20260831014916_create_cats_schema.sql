/*
# Create cats and global_stats tables

1. New Tables
- `cats`: stores 1,000,000 angry cats scattered across the world.
  - `id` (bigint, primary key, generated identity)
  - `lat` (double precision, not null) — latitude (-90 to 90)
  - `lng` (double precision, not null) — longitude (-180 to 180)
  - `mood` (text, not null, default 'angry') — 'angry' or 'happy'
  - `made_happy_at` (timestaptz, nullable) — when the cat was made happy
  - `created_at` (timestamptz, default now())
- `global_stats`: single-row table tracking aggregate counters.
  - `id` (int, primary key, default 1, check = 1) — ensures exactly one row
  - `total_cats` (bigint, not null, default 0)
  - `happy_cats` (bigint, not null, default 0)
  - `angry_cats` (bigint, not null, default 0)
  - `updated_at` (timestamptz, default now())

2. Indexes
- `cats_mood_idx` on `cats(mood)` — for fast counting by mood
- `cats_geom_idx` GiST index on a point column for spatial queries (we add a generated `geom` column)

3. Security
- Enable RLS on both tables.
- Allow anon + authenticated CRUD because this is a public, no-auth app.
- The data is intentionally shared/public (anyone can see cats and make them happy).

4. Important Notes
- This is a single-tenant, no-auth app. No user_id columns.
- The `global_stats` table has a CHECK constraint forcing id=1 so only one row exists.
- A trigger keeps `global_stats.angry_cats` and `happy_cats` in sync automatically.
*/

CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS cats (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  mood text NOT NULL DEFAULT 'angry' CHECK (mood IN ('angry', 'happy')),
  made_happy_at timestamptz,
  created_at timestamptz DEFAULT now(),
  geom geometry(Point, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(lng, lat), 4326)) STORED
);

CREATE INDEX IF NOT EXISTS cats_mood_idx ON cats(mood);
CREATE INDEX IF NOT EXISTS cats_geom_idx ON cats USING GIST(geom);

ALTER TABLE cats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_cats" ON cats;
CREATE POLICY "anon_select_cats" ON cats FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_cats" ON cats;
CREATE POLICY "anon_insert_cats" ON cats FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_cats" ON cats;
CREATE POLICY "anon_update_cats" ON cats FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_cats" ON cats;
CREATE POLICY "anon_delete_cats" ON cats FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS global_stats (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  total_cats bigint NOT NULL DEFAULT 0,
  happy_cats bigint NOT NULL DEFAULT 0,
  angry_cats bigint NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE global_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_stats" ON global_stats;
CREATE POLICY "anon_select_stats" ON global_stats FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_update_stats" ON global_stats;
CREATE POLICY "anon_update_stats" ON global_stats FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_insert_stats" ON global_stats;
CREATE POLICY "anon_insert_stats" ON global_stats FOR INSERT
  TO anon, authenticated WITH CHECK (true);

-- Initialize the single stats row
INSERT INTO global_stats (id, total_cats, happy_cats, angry_cats)
VALUES (1, 0, 0, 0)
ON CONFLICT (id) DO NOTHING;

-- Function to update global_stats when a cat's mood changes
CREATE OR REPLACE FUNCTION update_cat_mood_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.mood <> NEW.mood) THEN
    IF NEW.mood = 'happy' THEN
      UPDATE global_stats SET
        happy_cats = happy_cats + 1,
        angry_cats = angry_cats - 1,
        updated_at = now()
      WHERE id = 1;
    ELSIF NEW.mood = 'angry' THEN
      UPDATE global_stats SET
        happy_cats = happy_cats - 1,
        angry_cats = angry_cats + 1,
        updated_at = now()
      WHERE id = 1;
    END IF;
  ELSIF (TG_OP = 'INSERT') THEN
    UPDATE global_stats SET
      total_cats = total_cats + 1,
      angry_cats = angry_cats + (CASE WHEN NEW.mood = 'angry' THEN 1 ELSE 0 END),
      happy_cats = happy_cats + (CASE WHEN NEW.mood = 'happy' THEN 1 ELSE 0 END),
      updated_at = now()
      WHERE id = 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cats_mood_change ON cats;
CREATE TRIGGER cats_mood_change
  AFTER INSERT OR UPDATE OF mood ON cats
  FOR EACH ROW EXECUTE FUNCTION update_cat_mood_stats();