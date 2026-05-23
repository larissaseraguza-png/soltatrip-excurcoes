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

export type StaffOnibus = {
  id: string;
  nome: string;
  capacidade: number;
  horario_saida: string | null;
  ponto_partida: string | null;
} | null;

/**
 * Retorna a primeira excursão ativa vinculada ao staff logado,
 * junto com o ônibus específico ao qual ele está vinculado (se houver).
 * Se onibus_id for null, o staff tem acesso a todos os ônibus daquela excursão.
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
          "onibus_id, excursao:excursoes(id,titulo,destino,data_evento,horario_saida,horario_retorno,total_vagas,status,cor,banner_url)",
        )
        .eq("staff_user_id", user!.id)
        .eq("status", "ativo")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      const excursao = ((data as any)?.excursao ?? null) as StaffExcursao | null;
      const onibusId = ((data as any)?.onibus_id ?? null) as string | null;

      let onibus: StaffOnibus = null;
      if (onibusId) {
        const { data: o } = await supabase
          .from("onibus")
          .select("id,nome,capacidade,horario_saida,ponto_partida")
          .eq("id", onibusId)
          .maybeSingle();
        onibus = (o as any) ?? null;
      }
      return { excursao, onibusId, onibus };
    },
  });
  return {
    excursao: query.data?.excursao ?? null,
    onibusId: query.data?.onibusId ?? null,
    onibus: query.data?.onibus ?? null,
    loading: query.isLoading,
  };
}
