
CREATE OR REPLACE FUNCTION public.notify_on_new_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _reviewer_name text;
  _product_title text;
  _preview text;
BEGIN
  -- Only notify the farmer, not the reviewer themselves
  IF NEW.farmer_id IS NULL OR NEW.farmer_id = NEW.reviewer_id THEN
    RETURN NEW;
  END IF;

  SELECT name INTO _reviewer_name FROM profiles WHERE id = NEW.reviewer_id;
  
  IF NEW.product_id IS NOT NULL THEN
    SELECT title INTO _product_title FROM products WHERE id = NEW.product_id;
  END IF;

  _preview := COALESCE(_reviewer_name, 'Someone') || ' gave ' || NEW.rating || ' stars';
  IF NEW.comment IS NOT NULL THEN
    _preview := _preview || ': ' || LEFT(NEW.comment, 60);
  END IF;

  INSERT INTO notifications (user_id, type, title, body, reference_id, read)
  VALUES (
    NEW.farmer_id,
    'review',
    'New review on ' || COALESCE(_product_title, 'your product'),
    _preview,
    NEW.product_id,
    false
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_review
  AFTER INSERT ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_new_review();
