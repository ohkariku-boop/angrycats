/*
# Create land_polygons table for land-based cat placement

1. New Tables
- `land_polygons`: stores simplified polygon shapes of world landmasses.
  - `id` (serial, primary key)
  - `name` (text) — name of the landmass
  - `geom` (geometry(Polygon, 4326)) — simplified polygon

2. Security
- Enable RLS, allow anon read access (public reference data).

3. Important Notes
- Polygons are simplified outlines of continents and major islands.
- Used with ST_Contains to ensure cats are placed on land, not in the ocean.
- Cats in Antarctica are excluded (no cats on ice).
*/

CREATE TABLE IF NOT EXISTS land_polygons (
  id serial PRIMARY KEY,
  name text NOT NULL,
  geom geometry(Polygon, 4326) NOT NULL
);

CREATE INDEX IF NOT EXISTS land_polygons_geom_idx ON land_polygons USING GIST(geom);

ALTER TABLE land_polygons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_land" ON land_polygons;
CREATE POLICY "anon_read_land" ON land_polygons FOR SELECT
  TO anon, authenticated USING (true);

-- Insert simplified landmass polygons
-- Coordinates are rough approximations: (lng, lat) pairs

INSERT INTO land_polygons (name, geom) VALUES

-- North America (including Central America, excluding Greenland)
('North America', ST_GeomFromText('POLYGON((
  -168 65, -160 70, -140 72, -120 72, -100 73, -80 73, -60 60, -55 52,
  -60 46, -65 42, -70 38, -75 35, -80 32, -82 26, -80 24, -83 22,
  -87 18, -92 16, -97 16, -105 20, -110 24, -115 30, -120 35,
  -122 38, -125 42, -128 49, -135 55, -145 60, -155 58, -160 55,
  -165 60, -168 65
))', 4326)),

-- South America
('South America', ST_GeomFromText('POLYGON((
  -80 12, -75 10, -70 12, -60 10, -52 5, -48 0, -42 -5, -38 -10,
  -35 -8, -38 -15, -40 -22, -45 -25, -48 -28, -52 -35, -58 -40,
  -62 -42, -65 -50, -68 -55, -70 -55, -72 -50, -75 -45, -78 -40,
  -80 -30, -80 -20, -78 -10, -80 0, -80 5, -80 12
))', 4326)),

-- Africa
('Africa', ST_GeomFromText('POLYGON((
  -17 35, -10 32, -5 35, 0 36, 10 37, 20 33, 25 32, 30 32, 33 30,
  35 28, 38 22, 40 15, 45 12, 48 12, 50 11, 52 10, 50 5, 45 4,
  42 0, 40 -5, 40 -10, 38 -15, 35 -20, 32 -25, 28 -30, 25 -33,
  20 -35, 18 -34, 15 -30, 12 -25, 10 -20, 8 -15, 5 -10, 0 -5,
  -5 0, -8 5, -10 8, -12 12, -15 15, -17 20, -16 25, -12 28, -17 35
))', 4326)),

-- Europe (including Scandinavia, excluding UK which is separate)
('Europe', ST_GeomFromText('POLYGON((
  -10 36, -5 36, 0 38, 5 43, 10 44, 15 45, 20 40, 25 38, 28 40,
  30 42, 35 45, 40 48, 45 52, 50 55, 55 58, 60 65, 55 70,
  40 70, 30 68, 25 65, 20 60, 15 55, 10 55, 5 52, 0 50,
  -5 48, -8 45, -10 40, -10 36
))', 4326)),

-- Asia (including Middle East, India, Southeast Asia, but excluding Japan)
('Asia', ST_GeomFromText('POLYGON((
  25 38, 30 37, 35 35, 40 30, 45 25, 50 25, 55 25, 58 22, 55 15,
  52 12, 48 8, 45 10, 42 12, 40 15, 38 18, 35 22, 38 25, 42 28,
  45 30, 50 32, 55 35, 60 38, 65 40, 70 42, 75 40, 80 35, 85 30,
  90 25, 95 22, 100 20, 105 18, 108 15, 105 10, 108 8, 110 5,
  115 0, 118 -2, 120 -5, 125 -5, 130 0, 135 5, 130 10, 125 15,
  120 20, 118 22, 115 25, 110 22, 105 25, 100 28, 95 30, 90 35,
  85 40, 80 45, 75 50, 70 55, 65 60, 60 65, 55 70, 50 72,
  45 70, 40 68, 35 65, 30 60, 28 55, 25 50, 22 45, 25 40, 25 38
))', 4326)),

-- Australia
('Australia', ST_GeomFromText('POLYGON((
  115 -12, 120 -15, 125 -12, 130 -12, 135 -15, 140 -18, 145 -18,
  148 -22, 150 -25, 152 -28, 150 -32, 148 -35, 145 -38, 140 -38,
  135 -35, 130 -32, 125 -33, 120 -35, 115 -35, 113 -30, 115 -25,
  115 -20, 115 -12
))', 4326)),

-- Greenland
('Greenland', ST_GeomFromText('POLYGON((
  -50 83, -30 83, -20 80, -15 75, -20 70, -25 65, -35 60,
  -45 60, -50 65, -55 70, -58 75, -55 80, -50 83
))', 4326)),

-- British Isles (UK + Ireland)
('British Isles', ST_GeomFromText('POLYGON((
  -10 55, -8 58, -5 58, -2 55, 0 52, 1 50, -2 50, -5 52,
  -8 52, -10 50, -10 55
))', 4326)),

-- Japan
('Japan', ST_GeomFromText('POLYGON((
  130 32, 135 34, 140 36, 142 40, 145 43, 142 45, 140 42,
  138 38, 135 35, 132 33, 130 32
))', 4326)),

-- Indonesia + Malaysia (rough)
('Indonesia', ST_GeomFromText('POLYGON((
  95 5, 100 5, 105 0, 110 -3, 115 -5, 120 -8, 125 -8, 130 -5,
  135 -3, 140 -3, 140 -8, 135 -8, 130 -10, 120 -10, 115 -8,
  110 -8, 105 -7, 100 -2, 95 5
))', 4326)),

-- Philippines
('Philippines', ST_GeomFromText('POLYGON((
  120 18, 125 18, 128 12, 125 7, 122 6, 120 10, 118 15, 120 18
))', 4326)),

-- New Zealand
('New Zealand', ST_GeomFromText('POLYGON((
  166 -46, 172 -41, 175 -38, 178 -37, 178 -42, 175 -46, 170 -47, 166 -46
))', 4326)),

-- Madagascar
('Madagascar', ST_GeomFromText('POLYGON((
  43 -12, 48 -15, 50 -20, 49 -25, 45 -25, 43 -20, 43 -12
))', 4326)),

-- Caribbean (Cuba, Hispaniola, etc.)
('Caribbean', ST_GeomFromText('POLYGON((
  -85 22, -78 22, -74 20, -70 18, -66 18, -62 16, -60 16,
  -62 20, -68 22, -75 22, -80 23, -85 22
))', 4326)),

-- Iceland
('Iceland', ST_GeomFromText('POLYGON((
  -24 64, -13 64, -13 67, -24 67, -24 64
))', 4326)),

-- New Guinea
('New Guinea', ST_GeomFromText('POLYGON((
  131 -2, 145 -3, 150 -9, 141 -10, 134 -9, 131 -2
))', 4326)),

-- Sri Lanka
('Sri Lanka', ST_GeomFromText('POLYGON((
  80 6, 82 6, 82 10, 80 10, 80 6
))', 4326)),

-- Taiwan
('Taiwan', ST_GeomFromText('POLYGON((
  120 22, 122 22, 122 25, 120 25, 120 22
))', 4326)),

-- Korea
('Korea', ST_GeomFromText('POLYGON((
  125 33, 130 33, 130 38, 127 39, 125 38, 125 33
))', 4326))

ON CONFLICT DO NOTHING;
