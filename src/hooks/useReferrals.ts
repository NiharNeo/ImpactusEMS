import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useReferralLeaderboard(eventId: string | undefined) {
  return useQuery({
    queryKey: ["referral-leaderboard", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("registrations")
        .select("id, full_name, referral_code")
        .eq("event_id", eventId!);

      if (error) throw error;

      // Manually count referrals since the view might not be synced in types yet
      const { data: allRegs, error: allErr } = await supabase
        .from("registrations")
        .select("referred_by")
        .eq("event_id", eventId!);

      if (allErr) throw allErr;

      const counts: Record<string, number> = {};
      allRegs.forEach(r => {
        if (r.referred_by) {
          counts[r.referred_by] = (counts[r.referred_by] || 0) + 1;
        }
      });

      const leaderboard = data
        .map(r => ({
          name: r.full_name || "Anonymous",
          count: counts[r.referral_code || ""] || 0
        }))
        .filter(r => r.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return leaderboard;
    },
    enabled: !!eventId,
  });
}
