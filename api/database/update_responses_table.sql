-- Update the responses table to handle anonymous responses
-- First, remove the foreign key constraint on user_id
ALTER TABLE responses DROP FOREIGN KEY responses_ibfk_2;

-- Then, modify the user_id column to allow NULL values
ALTER TABLE responses MODIFY user_id VARCHAR(36) NULL;

-- Optionally, add a comment to document the change
ALTER TABLE responses 
COMMENT 'user_id can be NULL for anonymous responses';

-- If you want to keep the foreign key but allow NULLs (which is already the case with the schema above)
-- The issue might be with the application code trying to insert 'anonymous' as a user_id

-- Alternative solution: Create an anonymous user if it doesn't exist
-- INSERT IGNORE INTO users (id, username, password, role) 
-- VALUES ('anonymous', 'anonymous', '', 'public');

-- Then modify the responses table to use this user for anonymous responses
-- ALTER TABLE responses 
-- MODIFY user_id VARCHAR(36) NOT NULL DEFAULT 'anonymous',
-- ADD CONSTRAINT fk_responses_user_id 
--     FOREIGN KEY (user_id) 
--     REFERENCES users(id)
--     ON DELETE SET NULL;
