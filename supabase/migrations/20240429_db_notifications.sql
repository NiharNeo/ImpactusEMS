-- Enable the HTTP extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- Function to handle notifications when a new registration occurs
CREATE OR REPLACE FUNCTION public.handle_registration_notification()
RETURNS TRIGGER AS $$
DECLARE
    integration_row RECORD;
    event_name TEXT;
    attendee_name TEXT;
    attendee_email TEXT;
    payload JSONB;
BEGIN
    -- 1. Get the event name
    SELECT name INTO event_name FROM public.events WHERE id = NEW.event_id;
    
    -- 2. Extract attendee details from the JSONB data column
    attendee_name := COALESCE(NEW.data->>'Full Name', NEW.data->>'Name', 'Someone');
    attendee_email := COALESCE(NEW.data->>'Email Address', NEW.data->>'Email', 'No email');
    
    -- 3. Loop through active integrations for the event owner
    FOR integration_row IN 
        SELECT platform, webhook_url 
        FROM public.integrations 
        WHERE user_id = (SELECT user_id FROM public.events WHERE id = NEW.event_id)
        AND is_active = true
    LOOP
        -- 4. Format and send based on platform (Case Insensitive)
        IF LOWER(integration_row.platform) = 'discord' THEN
            payload := jsonb_build_object(
                'content', '🎉 **New Registration for ' || event_name || '**',
                'embeds', jsonb_build_array(
                    jsonb_build_object(
                        'title', 'Attendee Details',
                        'color', 5814783,
                        'fields', jsonb_build_array(
                            jsonb_build_object('name', 'Name', 'value', attendee_name, 'inline', true),
                            jsonb_build_object('name', 'Email', 'value', attendee_email, 'inline', true)
                        ),
                        'footer', jsonb_build_object('text', 'Nexus Automatic Sync')
                    )
                )
            );
        ELSIF LOWER(integration_row.platform) = 'slack' THEN
            payload := jsonb_build_object(
                'text', '🎉 *New Registration for ' || event_name || '*: ' || attendee_name || ' (' || attendee_email || ')'
            );
        ELSE
            -- Default format for unknown platforms
            payload := jsonb_build_object('text', '🎉 New Registration for ' || event_name);
        END IF;

        -- 5. Execute the HTTP POST request
        PERFORM net.http_post(
            url := integration_row.webhook_url,
            body := payload,
            headers := '{"Content-Type": "application/json"}'::jsonb
        );
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS on_registration_created ON public.registrations;
CREATE TRIGGER on_registration_created
    AFTER INSERT ON public.registrations
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_registration_notification();
