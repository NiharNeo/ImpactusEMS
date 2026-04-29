import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useEventFiles(eventId: string | undefined) {
  return useQuery({
    queryKey: ["event-files", eventId],
    queryFn: async () => {
      if (!eventId) return [];
      
      const { data, error } = await supabase.storage
        .from("event-assets")
        .list(eventId);

      if (error) throw error;

      // Transform into absolute URLs
      return data.map(file => ({
        ...file,
        url: supabase.storage.from("event-assets").getPublicUrl(`${eventId}/${file.name}`).data.publicUrl,
        id: file.id || file.name
      }));
    },
    enabled: !!eventId,
  });
}

export function useUploadEventFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ eventId, file }: { eventId: string; file: File }) => {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${eventId}/${fileName}`;

      const { data, error } = await supabase.storage
        .from("event-assets")
        .upload(filePath, file);

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { eventId }) => {
      qc.invalidateQueries({ queryKey: ["event-files", eventId] });
    },
  });
}

export function useDeleteEventFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ eventId, fileName }: { eventId: string; fileName: string }) => {
      const { error } = await supabase.storage
        .from("event-assets")
        .remove([`${eventId}/${fileName}`]);

      if (error) throw error;
    },
    onSuccess: (_, { eventId }) => {
      qc.invalidateQueries({ queryKey: ["event-files", eventId] });
    },
  });
}
 
