import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { StaffShell, Pill } from "@/components/staff/Shell";
import { supabase } from "@/integrations/supabase/client";
import { useStaffExcursao } from "@/hooks/use-staff-excursao";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import { SeatMap } from "@/components/SeatMap";
import { Bus, Loader2 } from "lucide-react";

export const Route = createFileRoute("/staff/onibus")({
  component: OnibusStaff,
});

function OnibusStaff() {
  const { excursao, onibusId, onibus, loading } = useStaffExcursao();

  const { data: passageiros = [] } = useQuery({
    queryKey: ["staff-onibus-pax", excursao?.id, onibusId],
    enabled: !!excursao?.id,
    queryFn: async () => {
      let q = supabase
        .from("passageiros")
        .select("id,nome,assento,seat_id,payment_status,onibus_id")
        .eq("excursao_id", excursao!.id);
      if (onibusId) q = q.eq("onibus_id", onibusId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: seats = [] } = useQuery({
    queryKey: ["staff-onibus-seats", excursao?.id, onibusId],
    enabled: !!excursao?.id,
    queryFn: async () => {
      let q = supabase
        .from("seats")
        .select("id,seat_number,occupied,passageiro_id,onibus_id")
        .eq("excursao_id", excursao!.id);
      if (onibusId) q = q.eq("onibus_id", onibusId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  useRealtimeSync(
    `staff-onibus-${excursao?.id ?? "none"}-${onibusId ?? "all"}`,
    excursao?.id
      ? [
          { table: "passageiros", filter: `excursao_id=eq.${excursao.id}` },
          { table: "seats", filter: `excursao_id=eq.${excursao.id}` },
        ]
      : [],
    [
      ["staff-onibus-pax", excursao?.id, onibusId],
      ["staff-onibus-seats", excursao?.id, onibusId],
    ],
  );

  const taken = useMemo(() => {
    const map: Record<string, { pago: boolean; nome: string }> = {};
    const paxBySeatId = new Map((passageiros as any[]).map((p) => [p.seat_id, p]));
    (seats as any[]).forEach((s) => {
      const p = paxBySeatId.get(s.id) ?? (passageiros as any[]).find((x) => x.assento === s.seat_number);
      if (p) map[s.seat_number] = { pago: p.payment_status === "paid", nome: p.nome };
    });
    return map;
  }, [seats, passageiros]);

  const ocupadas = Object.keys(taken).length;
  const total = onibus?.capacidade ?? (seats as any[]).length ?? excursao?.total_vagas ?? 0;
  const livres = Math.max(0, total - ocupadas);

  return (
    <StaffShell title="Mapa de Poltronas" subtitle={excursao?.titulo ?? "Sem excursão vinculada"}>
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : !excursao ? (
        <div className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">
          Nenhuma excursão ativa vinculada.
        </div>
      ) : (
        <>
          <div className="glass rounded-2xl p-4 mb-5 flex items-center gap-3">
            <div className="size-12 rounded-2xl bg-gradient-to-br from-neon-green to-neon-purple grid place-items-center glow-primary">
              <Bus className="size-5 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <div className="font-display font-bold">{excursao.titulo}</div>
              <div className="text-[11px] text-muted-foreground">{excursao.destino ?? "—"}</div>
            </div>
            <Pill tone="green">visualização</Pill>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-5 text-center">
            <div className="glass rounded-2xl p-3">
              <div className="text-xl font-display font-black text-neon-green">{ocupadas}</div>
              <div className="text-[10px] text-muted-foreground uppercase">Ocupadas</div>
            </div>
            <div className="glass rounded-2xl p-3">
              <div className="text-xl font-display font-black text-neon-pink">{livres}</div>
              <div className="text-[10px] text-muted-foreground uppercase">Livres</div>
            </div>
            <div className="glass rounded-2xl p-3">
              <div className="text-xl font-display font-black text-neon-purple">
                {total > 0 ? Math.round((ocupadas / total) * 100) : 0}%
              </div>
              <div className="text-[10px] text-muted-foreground uppercase">Ocupação</div>
            </div>
          </div>

          {total > 0 ? (
            <SeatMap total={total} taken={taken} />
          ) : (
            <div className="glass rounded-2xl p-6 text-center text-xs text-muted-foreground">
              Nenhuma poltrona configurada para esta excursão.
            </div>
          )}

          <p className="text-[11px] text-muted-foreground mt-4 text-center">
            Apenas o organizador pode alterar poltronas. As mudanças aparecem aqui em tempo real.
          </p>
        </>
      )}
    </StaffShell>
  );
}
