-- Ensure registrations table has the referral columns
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE DEFAULT lower(substring(md5(random()::text), 1, 8));
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS referred_by TEXT;

-- Create index for faster lookup
CREATE INDEX IF NOT EXISTS idx_registrations_referral_code ON registrations(referral_code);
CREATE INDEX IF NOT EXISTS idx_registrations_referred_by ON registrations(referred_by);

-- Function to track referral stats
CREATE OR REPLACE VIEW referral_stats AS
SELECT 
    r.id as registration_id,
    r.full_name,
    r.event_id,
    r.referral_code,
    COUNT(sub.id) as referral_count
FROM registrations r
LEFT JOIN registrations sub ON r.referral_code = sub.referred_by
GROUP BY r.id, r.full_name, r.event_id, r.referral_code;
