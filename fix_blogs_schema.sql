-- Check if blogs table exists and add status column if needed
ALTER TABLE blogs 
ADD COLUMN IF NOT EXISTS status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending';

-- Create index on status column if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_status ON blogs(status);

-- Update existing blogs to have 'approved' status
UPDATE blogs SET status = 'approved' WHERE status IS NULL; 