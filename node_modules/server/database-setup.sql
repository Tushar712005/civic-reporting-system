-- This script sets up the 'issues' table and inserts the sample data.
-- You can run this using a PostgreSQL client like pgAdmin or psql.

-- Drop the table if it already exists to start fresh
DROP TABLE IF EXISTS issues;

-- Create the 'issues' table
CREATE TABLE issues (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    "reportedAt" TIMESTAMPTZ NOT NULL,
    latitude DECIMAL(9, 6),
    longitude DECIMAL(9, 6),
    image_url VARCHAR(255)
);

-- Insert the same sample data we used before into the new table
INSERT INTO issues (title, status, "reportedAt") VALUES
('Large Pothole on Main St', 'New', '2025-09-10T18:00:00Z'),
('Streetlight Out at Oak & 2nd', 'In Progress', '2025-09-10T17:30:00Z'),
('Overflowing Bin at City Park', 'New', '2025-09-10T16:45:00Z'),
('Faded Crosswalk at School Zone', 'Resolved', '2025-09-09T11:00:00Z');

-- You can verify the data was inserted with this command:
-- SELECT * FROM issues;

