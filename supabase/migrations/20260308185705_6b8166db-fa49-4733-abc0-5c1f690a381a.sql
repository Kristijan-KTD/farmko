
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.profiles(id),
  product_id uuid NOT NULL REFERENCES public.products(id),
  farmer_id uuid NOT NULL REFERENCES public.profiles(id),
  quantity integer NOT NULL DEFAULT 1,
  total_amount numeric NOT NULL,
  stripe_session_id text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view their own orders" ON public.orders
  FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "Farmers can view orders for their products" ON public.orders
  FOR SELECT USING (auth.uid() = farmer_id);

CREATE POLICY "Authenticated users can create orders" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "System can update orders" ON public.orders
  FOR UPDATE USING (auth.uid() = customer_id OR auth.uid() = farmer_id);

CREATE INDEX idx_orders_customer ON public.orders(customer_id);
CREATE INDEX idx_orders_farmer ON public.orders(farmer_id);
CREATE INDEX idx_orders_stripe_session ON public.orders(stripe_session_id);
