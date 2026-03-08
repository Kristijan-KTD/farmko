-- Add missing columns to analytics_events
ALTER TABLE analytics_events 
ADD COLUMN IF NOT EXISTS listing_id uuid REFERENCES products(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_analytics_events_farmer_id ON analytics_events(farmer_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_listing_id ON analytics_events(listing_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_farmer_created ON analytics_events(farmer_id, created_at);

-- Create farmer_daily_stats table for aggregation
CREATE TABLE IF NOT EXISTS farmer_daily_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  profile_views integer DEFAULT 0,
  listing_views integer DEFAULT 0,
  listing_clicks integer DEFAULT 0,
  contact_clicks integer DEFAULT 0,
  favorites integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(farmer_id, date)
);

-- Create indexes for farmer_daily_stats
CREATE INDEX IF NOT EXISTS idx_farmer_daily_stats_farmer_id ON farmer_daily_stats(farmer_id);
CREATE INDEX IF NOT EXISTS idx_farmer_daily_stats_date ON farmer_daily_stats(date);
CREATE INDEX IF NOT EXISTS idx_farmer_daily_stats_farmer_date ON farmer_daily_stats(farmer_id, date);

-- Enable RLS on farmer_daily_stats
ALTER TABLE farmer_daily_stats ENABLE ROW LEVEL SECURITY;

-- RLS policies for farmer_daily_stats
CREATE POLICY "Farmers can view own stats"
  ON farmer_daily_stats FOR SELECT
  USING (auth.uid() = farmer_id);

CREATE POLICY "Admins can view all stats"
  ON farmer_daily_stats FOR SELECT
  USING (has_role(auth.uid(), 'admin'::admin_role));

CREATE POLICY "System can insert stats"
  ON farmer_daily_stats FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update stats"
  ON farmer_daily_stats FOR UPDATE
  USING (true);

-- Create favorites table
CREATE TABLE IF NOT EXISTS favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  listing_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, listing_id)
);

-- Enable RLS on favorites
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- RLS policies for favorites
CREATE POLICY "Users can view their own favorites"
  ON favorites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own favorites"
  ON favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites"
  ON favorites FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Farmers can view favorites for their listings"
  ON favorites FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM products WHERE products.id = favorites.listing_id AND products.farmer_id = auth.uid()
  ));

-- Index for favorites
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_listing_id ON favorites(listing_id);