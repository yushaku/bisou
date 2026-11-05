ALTER TABLE users ADD COLUMN birth_date TEXT CHECK (birth_date IS NULL OR birth_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]');
