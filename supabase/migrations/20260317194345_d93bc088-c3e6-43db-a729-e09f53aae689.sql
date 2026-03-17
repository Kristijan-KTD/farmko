
-- Add product_id to instafarm_posts for product tagging
ALTER TABLE public.instafarm_posts ADD COLUMN product_id uuid REFERENCES public.products(id) ON DELETE SET NULL DEFAULT NULL;

-- Add last_seen_at to profiles for online status
ALTER TABLE public.profiles ADD COLUMN last_seen_at timestamp with time zone DEFAULT now();
