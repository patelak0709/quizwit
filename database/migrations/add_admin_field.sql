USE quiz_app;

-- Add is_admin field to users table
ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;

-- Set is_admin to FALSE for existing users
UPDATE users SET is_admin = FALSE WHERE is_admin IS NULL; 