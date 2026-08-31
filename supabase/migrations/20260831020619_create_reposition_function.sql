/*
# Create function to reposition water cats onto land

1. Functions
- `reposition_water_cats(batch_size int)`: Moves cats that are in the ocean onto random land positions.
  - Finds cats NOT on any land polygon
  - Generates random points within the union of all land polygons
  - Updates those cats' lat/lng to the new land positions
  - Returns the number of cats repositioned

2. Important Notes
- Uses ST_GeneratePoints for guaranteed-on-land placement.
- Processes in batches to avoid timeouts.
- The geom column auto-updates via the GENERATED ALWAYS clause.
*/

CREATE OR REPLACE FUNCTION reposition_water_cats(batch_size int DEFAULT 50000)
RETURNS int AS $$
DECLARE
  repositioned_count int;
  land_union geometry;
BEGIN
  -- Get the union of all land polygons as a single multipolygon
  SELECT ST_Collect(geom) INTO land_union FROM land_polygons;
  
  -- Find water cats and reposition them
  WITH water_cats AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY id) AS rn
    FROM cats
    WHERE NOT EXISTS (SELECT 1 FROM land_polygons lp WHERE ST_Contains(lp.geom, cats.geom))
    LIMIT batch_size
  ),
  -- Generate exactly as many points as we need, on land
  new_points AS (
    SELECT 
      (ST_Dump(ST_GeneratePoints(land_union, (SELECT count(*) FROM water_cats)))).geom AS geom,
      ROW_NUMBER() OVER () AS rn
    FROM (SELECT 1) t
  )
  UPDATE cats
  SET lat = ST_Y(np.geom),
      lng = ST_X(np.geom)
  FROM water_cats wc
  JOIN new_points np ON wc.rn = np.rn
  WHERE cats.id = wc.id;
  
  GET DIAGNOSTICS repositioned_count = ROW_COUNT;
  
  RETURN repositioned_count;
END;
$$ LANGUAGE plpgsql;
