-- Drop the old view if it exists
DROP VIEW IF EXISTS referral_leaderboard;

-- Create a robust leaderboard view
CREATE OR REPLACE VIEW referral_leaderboard AS
SELECT 
    r.event_id,
    r.full_name,
    r.referral_code,
    COUNT(sub.id) as count
FROM registrations r
LEFT JOIN registrations sub ON r.referral_code = sub.referred_by
WHERE r.referral_code IS NOT NULL
GROUP BY r.event_id, r.full_name, r.referral_code
HAVING COUNT(sub.id) > 0
ORDER BY count DESC;
