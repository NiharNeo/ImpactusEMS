-- Add referral columns to attendees
ALTER TABLE attendees ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE DEFAULT lower(substring(md5(random()::text), 1, 8));
ALTER TABLE attendees ADD COLUMN IF NOT EXISTS referred_by TEXT REFERENCES attendees(referral_code);

-- Create index for faster lookup
CREATE INDEX IF NOT EXISTS idx_attendees_referral_code ON attendees(referral_code);
CREATE INDEX IF NOT EXISTS idx_attendees_referred_by ON attendees(referred_by);

-- Function to track referral stats
CREATE OR REPLACE VIEW referral_stats AS
SELECT 
    a.id as attendee_id,
    a.full_name,
    a.event_id,
    a.referral_code,
    COUNT(r.id) as referral_count
FROM attendees a
LEFT JOIN attendees r ON a.referral_code = r.referred_by
GROUP BY a.id, a.full_name, a.event_id, a.referral_code;
