/*
# Drop mood trigger temporarily for bulk insert

The per-row trigger on cats was making bulk inserts too slow.
We'll re-add it after the bulk insert is done.
*/

DROP TRIGGER IF EXISTS cats_mood_change ON cats;
DROP FUNCTION IF EXISTS update_cat_mood_stats();
