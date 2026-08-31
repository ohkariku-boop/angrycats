/*
# Fix Asia polygon: replace self-intersecting polygon with proper simple polygon

The previous Asia polygon was self-intersecting, causing PostGIS to compute
a much smaller area than reality (16M sq km instead of ~44M). This resulted
in far too few cats being placed in Russia, China, Korea, and Southeast Asia.

The new polygon traces a simple clockwise outline of Asia from the Arctic
north down through the Middle East, Indian subcontinent, Southeast Asia,
China, and back up through Siberia.
*/

DELETE FROM land_polygons WHERE name = 'Asia';

INSERT INTO land_polygons (name, geom) VALUES
('Asia', ST_GeomFromText('POLYGON((
  25 45,
  25 38,
  30 37,
  35 35,
  40 30,
  45 25,
  50 25,
  55 22,
  58 18,
  55 8,
  60 8,
  65 15,
  70 20,
  75 15,
  80 8,
  85 5,
  90 10,
  95 8,
  100 5,
  105 0,
  108 5,
  115 5,
  120 10,
  125 15,
  130 20,
  135 25,
  140 30,
  145 38,
  155 45,
  165 55,
  175 65,
  175 73,
  140 75,
  100 76,
  60 75,
  40 72,
  30 68,
  25 60,
  22 55,
  25 50,
  25 45
))', 4326));

-- Also fix Europe polygon to not overlap with the new Asia polygon
DELETE FROM land_polygons WHERE name = 'Europe';

INSERT INTO land_polygons (name, geom) VALUES
('Europe', ST_GeomFromText('POLYGON((
  -10 36,
  -5 36,
  0 38,
  5 43,
  10 44,
  15 45,
  20 42,
  24 40,
  24 45,
  22 50,
  20 55,
  15 55,
  10 55,
  5 52,
  0 50,
  -5 48,
  -8 45,
  -10 40,
  -10 36
))', 4326));
