-- Supabase Schema for Mileage Tracker
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- Trips table
CREATE TABLE IF NOT EXISTS trips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id TEXT UNIQUE NOT NULL,
  title TEXT,
  date DATE,
  description TEXT,
  location TEXT,
  classification TEXT,
  confidence INTEGER,
  reasoning TEXT,
  source TEXT,
  suggested_destination TEXT,
  destination TEXT,
  destination_address TEXT,
  round_trip_miles NUMERIC,
  cost NUMERIC,
  duration TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Destination cache
CREATE TABLE IF NOT EXISTS destination_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cache_key TEXT UNIQUE NOT NULL,
  address TEXT NOT NULL,
  miles NUMERIC,
  duration TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Learning memory
CREATE TABLE IF NOT EXISTS learning_memory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  classification TEXT NOT NULL,
  destination TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- App settings (custom keywords etc)
CREATE TABLE IF NOT EXISTS app_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  custom_keywords JSONB DEFAULT '{"business":[],"personal":[]}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS for simplicity (single-user app)
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE destination_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Allow all operations with anon key (single-user app)
CREATE POLICY "Allow all on trips" ON trips FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on destination_cache" ON destination_cache FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on learning_memory" ON learning_memory FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on app_settings" ON app_settings FOR ALL USING (true) WITH CHECK (true);
