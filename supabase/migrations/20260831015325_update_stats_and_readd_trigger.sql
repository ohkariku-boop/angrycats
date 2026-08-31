/*
# Update global stats and re-add mood trigger

1. Data Updates
- Set global_stats to reflect 1,000,000 angry cats (0 happy).

2. Functions & Triggers
- Re-create update_cat_mood_stats() function and cats_mood_change trigger.
- The trigger fires AFTER INSERT OR UPDATE OF mood on cats.
- On UPDATE mood change: increments/decrements happy_cats and angry_cats.
- On INSERT: increments total_cats and the appropriate mood counter.
*/

-- Update stats to match reality
UPDATE global_stats SET
  total_cats = (SELECT count(*) FROM cats),
  happy_cats = (SELECT count(*) FROM cats WHERE mood = 'happy'),
  angry_cats = (SELECT count(*) FROM cats WHERE mood = 'angry'),
  updated_at = now()
WHERE id = 1;

-- Re-create the function
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
