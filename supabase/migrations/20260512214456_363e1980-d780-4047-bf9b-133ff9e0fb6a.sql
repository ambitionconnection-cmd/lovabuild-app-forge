
-- Fix mislocated shop coordinates
UPDATE shops SET latitude = 35.70368500, longitude = 139.64985300 WHERE id = 'ef1e5b1a-70cc-48f6-8832-3026eb612302';
UPDATE shops SET latitude = 35.66309750, longitude = 139.70276000 WHERE id = 'c009b940-30db-4c0d-95e9-45f11ea3c3b7';
UPDATE shops SET latitude = 35.66323300, longitude = 139.71493800 WHERE id = '0d5bfe32-2108-4b9f-a02c-2645ff3e4b87';
UPDATE shops SET latitude = 39.91239000, longitude = 116.41116000 WHERE id = 'c5c492c2-52c2-4bd9-8645-f61c5da6b524';
UPDATE shops SET latitude = 39.93588600, longitude = 116.45541900 WHERE id = '560e40d6-6a6d-4676-ab07-db3dcda4bad8';
UPDATE shops SET latitude = 39.93720380, longitude = 116.44804070 WHERE id = '7e1e85ec-5ec2-4961-829a-6bdd64bb0790';

-- Normalize country names
UPDATE shops SET country = 'United Kingdom' WHERE country = 'UK';
UPDATE shops SET country = 'United States' WHERE country = 'USA';
UPDATE brands SET country = 'United Kingdom' WHERE country = 'UK';
UPDATE brands SET country = 'United States' WHERE country = 'USA';
