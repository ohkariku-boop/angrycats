/*
# Fix reposition function: use ST_Multi(ST_Collect()) for proper multipolygon
*/

CREATE OR REPLACE FUNCTION reposition_water_cats(batch_size int DEFAULT 50000)
RETURNS int AS $$
DECLARE
  repositioned_count int;
  land_union geometry;
BEGIN
  SELECT ST_Multi(ST_Collect(geom)) INTO land_union FROM land_polygons;
  
  WITH water_cats AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY id) AS rn
    FROM cats
    WHERE NOT EXISTS (SELECT 1 FROM land_polygons lp WHERE ST_Contains(lp.geom, cats.geom))
    LIMIT batch_size
  ),
  new_points AS (
    SELECT 
      (ST_Dump(ST_GeneratePoints(land_union, (SELECT count(*)::int FROM water_cats)))).geom AS geom,
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
