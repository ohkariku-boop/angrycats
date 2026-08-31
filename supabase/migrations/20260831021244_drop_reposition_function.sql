/*
# Clean up: drop the reposition helper function

The reposition_water_cats function was temporary and is no longer needed.
All cats have been moved onto land.
*/

DROP FUNCTION IF EXISTS reposition_water_cats(int);
