import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type Integration = {
  id: string;
  platform: string;
  webhook_url: string;
  is_active: boolean;
};

export function useIntegrations() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["integrations", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("integrations")
        .select("*");
      if (error) throw error;
      return data as Integration[];
    },
    enabled: !!user,
  });
}

export function useUpsertIntegration() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ platform, webhook_url }: { platform: string; webhook_url: string }) => {
      const { data, error } = await supabase
        .from("integrations")
        .upsert({
          user_id: user!.id,
          platform,
          webhook_url,
          is_active: true,
        }, { onConflict: "user_id, platform" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["integrations"] }),
  });
}

export function useDeleteIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("integrations")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["integrations"] }),
  });
}
 
