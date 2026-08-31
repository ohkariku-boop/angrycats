/*
# Recreate reposition function and move remaining water cats to land
*/

CREATE OR REPLACE FUNCTION reposition_water_cats(batch_size int DEFAULT 50000)
RETURNS int AS $$
DECLARE
  repositioned_count int;
  land_union geometry;
  cat_count int;
BEGIN
  SELECT ST_Multi(ST_Collect(geom)) INTO land_union FROM land_polygons;
  
  SELECT count(*)::int INTO cat_count
  FROM cats
  WHERE NOT EXISTS (SELECT 1 FROM land_polygons lp WHERE ST_Contains(lp.geom, cats.geom))
  LIMIT batch_size;
  
  IF cat_count = 0 THEN
    RETURN 0;
  END IF;
  
  WITH water_cats AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY id) AS rn
    FROM cats
    WHERE NOT EXISTS (SELECT 1 FROM land_polygons lp WHERE ST_Contains(lp.geom, cats.geom))
    LIMIT batch_size
  ),
  point_data AS (
    SELECT 
      (ST_Dump(ST_GeneratePoints(land_union, cat_count))).geom AS geom,
      generate_series(1, cat_count) AS rn
    FROM (SELECT 1) t
  )
  UPDATE cats
  SET lat = ST_Y(pd.geom),
      lng = ST_X(pd.geom)
  FROM water_cats wc
  JOIN point_data pd ON wc.rn = pd.rn
  WHERE cats.id = wc.id;
  
  GET DIAGNOSTICS repositioned_count = ROW_COUNT;
  
  RETURN repositioned_count;
END;
$$ LANGUAGE plpgsql;
