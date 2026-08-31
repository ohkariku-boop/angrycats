/*
# Create get_random_cats function for map rendering

1. Functions
- `get_random_cats(south, west, north, east, cat_limit)`: Returns a random sample of cats
  within the given geographic bounds. Handles the antimeridian (date line) crossing
  where west > east (e.g., viewing Russia/Japan wraps from 170 to -170).

2. Important Notes
- Uses random() ordering so different cats appear each time the map loads
- Handles the antimeridian case by splitting the query into two longitude ranges
- Returns cats with id, lat, lng, mood, made_happy_at fields
- This ensures even geographic coverage instead of always returning the same cats
*/

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
    WHERE cats.lat BETWEEN south AND north
      AND cats.lng BETWEEN west AND east
    ORDER BY random()
    LIMIT cat_limit;
  ELSE
    RETURN QUERY
    SELECT * FROM (
      (SELECT cats.id, cats.lat, cats.lng, cats.mood, cats.made_happy_at
       FROM cats
       WHERE cats.lat BETWEEN south AND north
         AND cats.lng BETWEEN west AND 180
       ORDER BY random()
       LIMIT cat_limit / 2)
      UNION ALL
      (SELECT cats.id, cats.lat, cats.lng, cats.mood, cats.made_happy_at
       FROM cats
       WHERE cats.lat BETWEEN south AND north
         AND cats.lng BETWEEN -180 AND east
       ORDER BY random()
       LIMIT cat_limit / 2)
    ) combined;
  END IF;
END;
$$ LANGUAGE plpgsql;
