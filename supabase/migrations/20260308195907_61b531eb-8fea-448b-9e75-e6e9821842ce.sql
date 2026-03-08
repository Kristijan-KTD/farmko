-- Drop overly permissive policies and create secure ones
DROP POLICY IF EXISTS "System can insert stats" ON farmer_daily_stats;
DROP POLICY IF EXISTS "System can update stats" ON farmer_daily_stats;

-- Secure insert policy - only authenticated users can insert for themselves
CREATE POLICY "Farmers can insert own stats"
  ON farmer_daily_stats FOR INSERT
  WITH CHECK (auth.uid() = farmer_id);

-- Secure update policy
CREATE POLICY "Farmers can update own stats"
  ON farmer_daily_stats FOR UPDATE
  USING (auth.uid() = farmer_id);