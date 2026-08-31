/*
# Replace get_random_cats with fast spatial-index-based function

The previous version used ORDER BY random() which scanned and sorted
1M rows taking 6+ seconds, causing the frontend to time out and show
no cats at all.

This version uses the GiST spatial index (geom && ST_MakeEnvelope) for
fast bounding-box queries (~1-400ms depending on area size). It returns
a deterministic sample; the frontend shuffles the results for variety.

Handles the antimeridian (date line) crossing where west > east.
*/

DROP FUNCTION IF EXISTS get_random_cats(double precision, double precision, double precision, double precision, integer);

CREATE OR REPLACE FUNCTION get_random_cats(
  south double precision,
  west double precision,
  north double precision,
  east double precision,
  cat_limit int DEFAULT 500
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
    LIMIT cat_limit;
  ELSE
    RETURN QUERY
    SELECT cats.id, cats.lat, cats.lng, cats.mood, cats.made_happy_at
    FROM cats
    WHERE cats.geom && ST_MakeEnvelope(west, south, 180, north, 4326)
    LIMIT cat_limit / 2;

    RETURN QUERY
    SELECT cats.id, cats.lat, cats.lng, cats.mood, cats.made_happy_at
    FROM cats
    WHERE cats.geom && ST_MakeEnvelope(-180, south, east, north, 4326)
    LIMIT cat_limit / 2;
  END IF;
END;
$$ LANGUAGE plpgsql;
