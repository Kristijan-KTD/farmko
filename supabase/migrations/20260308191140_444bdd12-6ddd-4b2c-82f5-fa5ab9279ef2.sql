-- Farmer subscriptions table
CREATE TABLE public.farmer_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'starter',
  stripe_subscription_id text,
  stripe_customer_id text,
  status text NOT NULL DEFAULT 'active',
  start_date timestamp with time zone NOT NULL DEFAULT now(),
  renewal_date timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(farmer_id)
);

ALTER TABLE public.farmer_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Farmers can view own subscription" ON public.farmer_subscriptions
  FOR SELECT TO authenticated USING (auth.uid() = farmer_id);

CREATE POLICY "System can insert subscriptions" ON public.farmer_subscriptions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = farmer_id);

CREATE POLICY "System can update subscriptions" ON public.farmer_subscriptions
  FOR UPDATE TO authenticated USING (auth.uid() = farmer_id);

-- Listing views for analytics
CREATE TABLE public.listing_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  viewer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  viewed_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.listing_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert listing views" ON public.listing_views
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Farmers can view analytics for their listings" ON public.listing_views
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.products WHERE products.id = listing_views.listing_id AND products.farmer_id = auth.uid())
  );

-- Analytics events table
CREATE TABLE public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  reference_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert analytics events" ON public.analytics_events
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Farmers can view their own analytics" ON public.analytics_events
  FOR SELECT TO authenticated USING (auth.uid() = farmer_id);

-- Auto-create starter subscription for new farmers
CREATE OR REPLACE FUNCTION public.handle_new_farmer_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.role = 'farmer' THEN
    INSERT INTO public.farmer_subscriptions (farmer_id, plan, status)
    VALUES (NEW.id, 'starter', 'active')
    ON CONFLICT (farmer_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_farmer_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_farmer_subscription();