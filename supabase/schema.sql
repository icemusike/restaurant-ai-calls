-- Create enum types for reservation status and source
CREATE TYPE reservation_status AS ENUM ('Pending', 'Confirmed', 'Cancelled');
CREATE TYPE reservation_source AS ENUM ('AI Call', 'Manual');

-- Create reservations table
CREATE TABLE IF NOT EXISTS reservations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  party_size INTEGER NOT NULL CHECK (party_size > 0),
  source reservation_source NOT NULL,
  status reservation_status NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index on common query patterns
CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(date);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_phone ON reservations(phone_number);

-- Add function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update the updated_at timestamp
CREATE TRIGGER update_reservations_updated_at
BEFORE UPDATE ON reservations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create Row Level Security (RLS) policies
-- Note: In a real application, you would set up proper RLS policies based on your authentication strategy
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- Policy for public access (demo purposes only - in production you would restrict access)
CREATE POLICY "Allow public access to reservations" ON reservations
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true); 