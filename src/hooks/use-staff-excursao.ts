import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, useCallback, useMemo } from "react";
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

export type StaffVinculo = {
  id: string;
  excursao_id: string;
  onibus_id: string | null;
  papel: string;
  excursao: StaffExcursao | null;
};

const STORAGE_KEY = "staff:selected-excursao-id";

function readSelected(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeSelected(id: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (id) window.localStorage.setItem(STORAGE_KEY, id);
    else window.localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent("staff:selected-excursao-changed"));
  } catch {
    /* noop */
  }
}

/** Lista TODAS as excursões ativas vinculadas ao staff logado. */
export function useStaffExcursoes() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["staff-vinculos-ativos", user?.id],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipe_excursoes")
        .select(
          "id, onibus_id, papel, excursao_id, excursao:excursoes(id,titulo,destino,data_evento,horario_saida,horario_retorno,total_vagas,status,cor,banner_url)",
        )
        .eq("staff_user_id", user!.id)
        .eq("status", "ativo")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as StaffVinculo[];
    },
  });
}

/**
 * Retorna a excursão atualmente SELECIONADA pelo staff (via localStorage)
 * dentre as ativas. Se nada está selecionado, retorna a primeira ativa.
 * Isola completamente dados por festa.
 */
export function useStaffExcursao() {
  const { data: vinculos = [], isLoading } = useStaffExcursoes();
  const [selectedId, setSelectedIdState] = useState<string | null>(() => readSelected());

  // Sincroniza entre abas/componentes
  useEffect(() => {
    const onChange = () => setSelectedIdState(readSelected());
    window.addEventListener("staff:selected-excursao-changed", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("staff:selected-excursao-changed", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const setSelectedExcursao = useCallback((id: string | null) => {
    writeSelected(id);
    setSelectedIdState(id);
  }, []);

  const vinculo = useMemo<StaffVinculo | null>(() => {
    if (vinculos.length === 0) return null;
    const fromStorage = selectedId
      ? vinculos.find((v) => v.excursao_id === selectedId) ?? null
      : null;
    return fromStorage ?? null; // não auto-seleciona: força o staff a escolher
  }, [vinculos, selectedId]);

  const onibusId = vinculo?.onibus_id ?? null;

  const { data: onibus = null } = useQuery({
    queryKey: ["staff-onibus", onibusId],
    enabled: !!onibusId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("onibus")
        .select("id,nome,capacidade,horario_saida,ponto_partida")
        .eq("id", onibusId!)
        .maybeSingle();
      return (data as any) ?? null;
    },
  });

  return {
    excursao: vinculo?.excursao ?? null,
    onibusId,
    onibus: onibus as StaffOnibus,
    papel: vinculo?.papel ?? null,
    loading: isLoading,
    excursoes: vinculos,
    setSelectedExcursao,
  };
}
