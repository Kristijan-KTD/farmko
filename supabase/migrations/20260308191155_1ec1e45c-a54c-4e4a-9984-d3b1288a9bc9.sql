-- Fix overly permissive INSERT policies
DROP POLICY "Anyone can insert listing views" ON public.listing_views;
CREATE POLICY "Authenticated users can insert listing views" ON public.listing_views
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = viewer_id OR viewer_id IS NULL);

DROP POLICY "Anyone can insert analytics events" ON public.analytics_events;
CREATE POLICY "Authenticated users can insert analytics events" ON public.analytics_events
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);