-- Update registration function to support referrals
OR REPLACE FUNCTION register_for_event(
  p_event_id UUID,
  p_data JSONB,
  p_referred_by TEXT DEFAULT NULL
) RETURNS TEXT AS $$
DECLARE
  v_registration_id TEXT;
  v_full_name TEXT;
  v_email TEXT;
BEGIN
  v_full_name := p_data->>'Full Name';
  v_email := p_data->>'Email Address';

  INSERT INTO registrations (
    event_id,
    full_name,
    email,
    data,
    referred_by
  ) VALUES (
    p_event_id,
    v_full_name,
    v_email,
    p_data,
    p_referred_by
  ) RETURNING id::TEXT INTO v_registration_id;

  RETURN v_registration_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
