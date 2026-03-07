
-- Fix overly permissive notification INSERT policy
DROP POLICY "Authenticated users can create notifications" ON public.notifications;

CREATE POLICY "Authenticated users can create notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
