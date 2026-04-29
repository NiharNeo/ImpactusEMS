-- Final update for registration function with referral support
CREATE OR REPLACE FUNCTION register_for_event(
  p_event_id UUID,
  p_data JSONB,
  p_referred_by TEXT DEFAULT NULL
) RETURNS TEXT AS $$
DECLARE
  v_registration_id TEXT;
  v_full_name TEXT;
  v_email TEXT;
  v_referral_code TEXT;
BEGIN
  v_full_name := p_data->>'Full Name';
  v_email := p_data->>'Email Address';
  v_referral_code := lower(substring(md5(random()::text), 1, 8));

  INSERT INTO registrations (
    event_id,
    full_name,
    email,
    data,
    referred_by,
    referral_code
  ) VALUES (
    p_event_id,
    v_full_name,
    v_email,
    p_data,
    p_referred_by,
    v_referral_code
  ) RETURNING id::TEXT INTO v_registration_id;

  RETURN v_registration_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
