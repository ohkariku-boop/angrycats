/*
# Add random offset to get_random_cats for better variety

Adds an optional seed parameter that shifts the starting point of the
LIMIT scan, so different cats are returned on each call even without
ORDER BY random() (which is too slow on 1M rows).
*/

DROP FUNCTION IF EXISTS get_random_cats(double precision, double precision, double precision, double precision, integer);

CREATE OR REPLACE FUNCTION get_random_cats(
  south double precision,
  west double precision,
  north double precision,
  east double precision,
  cat_limit int DEFAULT 500,
  row_offset int DEFAULT 0
)
RETURNS TABLE (
  id bigint,
  lat double precision,
  lng double precision,
  mood text,
  made_happy_at timestamptz
) AS $$
BEGIN
  IF west <= east THEN
    RETURN QUERY
    SELECT cats.id, cats.lat, cats.lng, cats.mood, cats.made_happy_at
    FROM cats
    WHERE cats.geom && ST_MakeEnvelope(west, south, east, north, 4326)
    OFFSET row_offset
    LIMIT cat_limit;
  ELSE
    RETURN QUERY
    SELECT cats.id, cats.lat, cats.lng, cats.mood, cats.made_happy_at
    FROM cats
    WHERE cats.geom && ST_MakeEnvelope(west, south, 180, north, 4326)
    OFFSET row_offset
    LIMIT cat_limit / 2;

    RETURN QUERY
    SELECT cats.id, cats.lat, cats.lng, cats.mood, cats.made_happy_at
    FROM cats
    WHERE cats.geom && ST_MakeEnvelope(-180, south, east, north, 4326)
    OFFSET row_offset
    LIMIT cat_limit / 2;
  END IF;
END;
$$ LANGUAGE plpgsql;
