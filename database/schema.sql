-- JadeAssist Database Schema
-- PostgreSQL / Supabase compatible
-- Version: 1.0.0

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
-- Stores user information with flexible auth provider support
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE,
  name VARCHAR(255),
  auth_provider VARCHAR(50) NOT NULL,
  auth_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(auth_provider, auth_id)
);

-- Index for auth lookups
CREATE INDEX IF NOT EXISTS idx_users_auth ON users(auth_provider, auth_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Conversations table
-- Stores chat conversations between users and the AI assistant
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type VARCHAR(100),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);

-- Messages table
-- Stores individual messages within conversations
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  tokens_used INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for conversation lookups
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- Event Plans table
-- Stores event planning details and progress
CREATE TABLE IF NOT EXISTS event_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  budget DECIMAL(10,2),
  guest_count INTEGER,
  event_date DATE,
  location VARCHAR(255),
  postcode VARCHAR(10),
  timeline JSONB DEFAULT '[]'::jsonb,
  checklist JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for event plan lookups
CREATE INDEX IF NOT EXISTS idx_event_plans_user_id ON event_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_event_plans_conversation_id ON event_plans(conversation_id);
CREATE INDEX IF NOT EXISTS idx_event_plans_event_date ON event_plans(event_date);

-- Suppliers table
-- Curated database of event suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  location VARCHAR(255),
  postcode VARCHAR(10),
  description TEXT,
  rating DECIMAL(3,2) DEFAULT 0.00,
  region VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for supplier searches
CREATE INDEX IF NOT EXISTS idx_suppliers_category ON suppliers(category);
CREATE INDEX IF NOT EXISTS idx_suppliers_postcode ON suppliers(postcode);
CREATE INDEX IF NOT EXISTS idx_suppliers_region ON suppliers(region);
CREATE INDEX IF NOT EXISTS idx_suppliers_rating ON suppliers(rating);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to tables
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_plans_updated_at
  BEFORE UPDATE ON event_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert sample suppliers (UK focused)
INSERT INTO suppliers (name, category, location, postcode, description, rating, region)
VALUES
  ('The Grand Hall', 'venue', 'London', 'SW1A', 'Elegant Victorian venue in central London', 4.8, 'London'),
  ('Delicious Catering Co', 'catering', 'Manchester', 'M1', 'Award-winning catering service', 4.7, 'North West'),
  ('Perfect Shots Photography', 'photographer', 'Birmingham', 'B1', 'Professional event photography', 4.9, 'Midlands'),
  ('Blooms & Petals', 'florist', 'Edinburgh', 'EH1', 'Beautiful floral arrangements', 4.6, 'Scotland'),
  ('Sound & Vision Events', 'entertainment', 'Bristol', 'BS1', 'DJ and live entertainment services', 4.5, 'South West'),
  ('Elite Event Styling', 'decorator', 'Leeds', 'LS1', 'Contemporary event decoration and styling', 4.7, 'Yorkshire'),
  ('Luxury Transport Solutions', 'transport', 'Cardiff', 'CF10', 'Premium event transportation', 4.8, 'Wales')
ON CONFLICT DO NOTHING;

-- Analytics Events table
-- Stores analytics events for tracking conversions and metrics
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_name VARCHAR(100) NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  properties JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_name ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_analytics_events_name_timestamp ON analytics_events(event_name, timestamp);

-- Comments for documentation
COMMENT ON TABLE users IS 'User accounts with flexible authentication provider support';
COMMENT ON TABLE conversations IS 'Chat conversations between users and the AI assistant';
COMMENT ON TABLE messages IS 'Individual messages within conversations';
COMMENT ON TABLE event_plans IS 'Event planning details and progress tracking';
COMMENT ON TABLE suppliers IS 'Curated database of event suppliers across the UK';
COMMENT ON TABLE analytics_events IS 'Analytics events for tracking user behavior and conversions';
