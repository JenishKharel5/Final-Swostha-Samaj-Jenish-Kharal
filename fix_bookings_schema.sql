-- Drop existing check constraint if it exists
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS check_booking_type;

-- Modify user_id to allow NULL values
ALTER TABLE bookings MODIFY COLUMN user_id INT NULL;

-- Add check constraint to ensure either user_id or guest information is provided
ALTER TABLE bookings 
ADD CONSTRAINT check_booking_type 
CHECK (
    (user_id IS NOT NULL) OR 
    (guest_fullname IS NOT NULL AND guest_email IS NOT NULL AND guest_phone IS NOT NULL)
); 