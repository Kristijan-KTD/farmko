
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
  _existing_id uuid;
BEGIN
  SELECT CASE
    WHEN c.participant_one = NEW.sender_id THEN c.participant_two
    ELSE c.participant_one
  END INTO _receiver_id
  FROM conversations c
  WHERE c.id = NEW.conversation_id;

  SELECT name INTO _sender_name
  FROM profiles
  WHERE id = NEW.sender_id;

  _preview := LEFT(NEW.text, 80);

  SELECT id INTO _existing_id
  FROM notifications
  WHERE user_id = _receiver_id
    AND type = 'message'
    AND reference_id = NEW.conversation_id
    AND read = false
  LIMIT 1;

  IF _existing_id IS NOT NULL THEN
    UPDATE notifications
    SET body = _preview,
        title = _sender_name || ' sent you a message',
        created_at = now()
    WHERE id = _existing_id;
  ELSE
    INSERT INTO notifications (user_id, type, title, body, reference_id, read)
    VALUES (_receiver_id, 'message', _sender_name || ' sent you a message', _preview, NEW.conversation_id, false);
  END IF;

  RETURN NEW;
END;
$$;
