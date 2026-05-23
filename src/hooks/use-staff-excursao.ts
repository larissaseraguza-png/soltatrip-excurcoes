import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type StaffExcursao = {
  id: string;
  titulo: string;
  destino: string | null;
  data_evento: string;
  horario_saida: string | null;
  horario_retorno: string | null;
  total_vagas: number;
  status: string;
  cor: string | null;
  banner_url: string | null;
};

/**
 * Retorna a primeira excursão ativa vinculada ao staff logado.
 * Toda a tela do staff é escopada a essa excursão.
 */
export function useStaffExcursao() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["staff-excursao-ativa", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipe_excursoes")
        .select(
          "excursao:excursoes(id,titulo,destino,data_evento,horario_saida,horario_retorno,total_vagas,status,cor,banner_url)",
        )
        .eq("staff_user_id", user!.id)
        .eq("status", "ativo")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return ((data as any)?.excursao ?? null) as StaffExcursao | null;
    },
  });
  return { excursao: query.data ?? null, loading: query.isLoading };
}
