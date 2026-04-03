
-- Add period-based quota columns
ALTER TABLE public.farmer_subscriptions
  ADD COLUMN IF NOT EXISTS listings_posted_this_period integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS listings_limit_per_period integer, -- null = unlimited
  ADD COLUMN IF NOT EXISTS period_start timestamp with time zone NOT NULL DEFAULT date_trunc('month', now()),
  ADD COLUMN IF NOT EXISTS period_end timestamp with time zone NOT NULL DEFAULT (date_trunc('month', now()) + interval '1 month');

-- Initialize existing rows
UPDATE public.farmer_subscriptions
SET
  listings_limit_per_period = CASE
    WHEN plan = 'starter' THEN 3
    WHEN plan = 'growth' THEN 20
    ELSE NULL
  END,
  period_start = date_trunc('month', now()),
  period_end = date_trunc('month', now()) + interval '1 month',
  listings_posted_this_period = 0;

-- Server-side function to atomically check and increment quota
CREATE OR REPLACE FUNCTION public.check_and_increment_listing_quota(_farmer_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sub record;
BEGIN
  SELECT * INTO _sub FROM farmer_subscriptions WHERE farmer_id = _farmer_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Reset period if expired
  IF now() >= _sub.period_end THEN
    UPDATE farmer_subscriptions
    SET listings_posted_this_period = 0,
        period_start = date_trunc('month', now()),
        period_end = date_trunc('month', now()) + interval '1 month'
    WHERE farmer_id = _farmer_id;
    _sub.listings_posted_this_period := 0;
    _sub.listings_limit_per_period := _sub.listings_limit_per_period;
  END IF;

  -- Unlimited (null limit) → always allow
  IF _sub.listings_limit_per_period IS NULL THEN
    UPDATE farmer_subscriptions
    SET listings_posted_this_period = listings_posted_this_period + 1
    WHERE farmer_id = _farmer_id;
    RETURN true;
  END IF;

  -- Check quota
  IF _sub.listings_posted_this_period >= _sub.listings_limit_per_period THEN
    RETURN false;
  END IF;

  -- Increment and allow
  UPDATE farmer_subscriptions
  SET listings_posted_this_period = listings_posted_this_period + 1
  WHERE farmer_id = _farmer_id;

  RETURN true;
END;
$$;

-- Also update the subscription trigger to set limits on new farmers
CREATE OR REPLACE FUNCTION public.handle_new_farmer_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.role = 'farmer' THEN
    INSERT INTO public.farmer_subscriptions (
      farmer_id, plan, status,
      listings_limit_per_period, listings_posted_this_period,
      period_start, period_end
    )
    VALUES (
      NEW.id, 'starter', 'active',
      3, 0,
      date_trunc('month', now()),
      date_trunc('month', now()) + interval '1 month'
    )
    ON CONFLICT (farmer_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
