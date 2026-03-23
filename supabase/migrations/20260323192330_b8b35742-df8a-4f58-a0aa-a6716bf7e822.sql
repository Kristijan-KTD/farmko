
CREATE OR REPLACE FUNCTION public.notify_on_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _receiver_id uuid;
  _sender_name text;
  _preview text;
BEGIN
  -- Find the other participant
  SELECT CASE
    WHEN c.participant_one = NEW.sender_id THEN c.participant_two
    ELSE c.participant_one
  END INTO _receiver_id
  FROM conversations c
  WHERE c.id = NEW.conversation_id;

  -- Get sender name
  SELECT name INTO _sender_name
  FROM profiles
  WHERE id = NEW.sender_id;

  -- Build preview (first 80 chars)
  _preview := LEFT(NEW.text, 80);

  -- Insert notification for receiver
  INSERT INTO notifications (user_id, type, title, body, reference_id, read)
  VALUES (_receiver_id, 'message', _sender_name || ' sent you a message', _preview, NEW.conversation_id, false);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_message_notify
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_new_message();
