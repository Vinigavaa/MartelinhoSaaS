/*
  # Create services table for auto repair management

  1. New Tables
    - `services`
      - `id` (uuid, primary key)
      - `client_name` (text)
      - `service_date` (date)
      - `car_plate` (text)
      - `car_model` (text)
      - `service_value` (numeric)
      - `repaired_part` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `services` table
    - Add policies for authenticated users to perform CRUD operations
*/

CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name text NOT NULL,
  service_date date NOT NULL,
  car_plate text NOT NULL,
  car_model text NOT NULL,
  service_value numeric NOT NULL,
  repaired_part text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view all services"
  ON services
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create services"
  ON services
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update services"
  ON services
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Users can delete services"
  ON services
  FOR DELETE
  TO authenticated
  USING (true);