import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { StaffShell, Pill } from "@/components/staff/Shell";
import { supabase } from "@/integrations/supabase/client";
import { useStaffExcursao } from "@/hooks/use-staff-excursao";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import { Search, Loader2, MapPin, Armchair, Phone, Bus, Ticket, AlertCircle } from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/staff/passageiros")({
  component: PassageirosStaff,
});

type Passageiro = {
  id: string;
  nome: string;
  telefone: string | null;
  assento: string | null;
  seat_id: string | null;
  status: string;
  ponto_embarque_id: string | null;
};
type Ponto = { id: string; nome: string; horario: string | null };

function PassageirosStaff() {
  const { excursao, onibusId, onibus, loading: loadingExc } = useStaffExcursao();
  const [search, setSearch] = useState("");

  const { data: passageiros = [], isLoading: loadingPax } = useQuery({
    queryKey: ["staff-passageiros", excursao?.id, onibusId],
    enabled: !!excursao?.id,
    queryFn: async () => {
      let q = supabase
        .from("passageiros")
        .select("id,nome,telefone,assento,seat_id,status,ponto_embarque_id,onibus_id")
        .eq("excursao_id", excursao!.id)
        .order("created_at", { ascending: false });
      if (onibusId) q = q.eq("onibus_id", onibusId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Passageiro[];
    },
  });

  const { data: pontos = [] } = useQuery({
    queryKey: ["staff-pontos", excursao?.id, onibusId],
    enabled: !!excursao?.id,
    queryFn: async () => {
      let q = supabase
        .from("pontos_embarque")
        .select("id,nome,horario,onibus_id")
        .eq("excursao_id", excursao!.id)
        .order("ordem", { ascending: true });
      if (onibusId) q = q.or(`onibus_id.eq.${onibusId},onibus_id.is.null`);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Ponto[];
    },
  });

  const { data: seats = [] } = useQuery({
    queryKey: ["staff-seats", excursao?.id, onibusId],
    enabled: !!excursao?.id,
    queryFn: async () => {
      let q = supabase
        .from("seats")
        .select("id,seat_number,onibus_id")
        .eq("excursao_id", excursao!.id);
      if (onibusId) q = q.eq("onibus_id", onibusId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });


  const { data: pedidos = [] } = useQuery({
    queryKey: ["staff-pax-pedidos-list", excursao?.id],
    enabled: !!excursao?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pedidos_itens")
        .select("id,passageiro_id,status,enviado_em,recebido_em,nao_recebido_em")
        .eq("excursao_id", excursao!.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  useRealtimeSync(
    `staff-passageiros-${excursao?.id ?? "none"}-${onibusId ?? "all"}`,
    excursao?.id
      ? [
          { table: "passageiros", filter: `excursao_id=eq.${excursao.id}` },
          { table: "seats", filter: `excursao_id=eq.${excursao.id}` },
          { table: "pontos_embarque", filter: `excursao_id=eq.${excursao.id}` },
          { table: "pedidos_itens", filter: `excursao_id=eq.${excursao.id}` },
        ]
      : [],
    [
      ["staff-passageiros", excursao?.id, onibusId],
      ["staff-seats", excursao?.id, onibusId],
      ["staff-pontos", excursao?.id, onibusId],
      ["staff-pax-pedidos-list", excursao?.id],
    ],
  );

  const seatById = useMemo(() => new Map((seats as any[]).map((s) => [s.id, s.seat_number])), [seats]);
  const pontoById = useMemo(() => new Map(pontos.map((p) => [p.id, p])), [pontos]);
  const pedidosByPax = useMemo(() => {
    const m = new Map<string, { total: number; pendentes: number; naoRecebidos: number }>();
    (pedidos as any[]).forEach((p) => {
      if (!p.passageiro_id) return;
      const cur = m.get(p.passageiro_id) ?? { total: 0, pendentes: 0, naoRecebidos: 0 };
      cur.total += 1;
      if (p.nao_recebido_em) cur.naoRecebidos += 1;
      else if (!p.recebido_em && !p.enviado_em) cur.pendentes += 1;
      m.set(p.passageiro_id, cur);
    });
    return m;
  }, [pedidos]);
  const filtered = passageiros.filter((p) =>
    p.nome.toLowerCase().includes(search.toLowerCase()) || (p.telefone ?? "").includes(search),
  );

  return (
    <StaffShell title="Controle de Passageiros" subtitle={excursao?.titulo ?? "Atualizações em tempo real"}>
      {onibus && (
        <div className="glass rounded-2xl p-3 mb-3 flex items-center gap-2 border border-neon-green/30 bg-neon-green/5">
          <Bus className="size-4 text-neon-green shrink-0" />
          <div className="text-xs">
            <span className="text-muted-foreground">Ônibus vinculado:</span>{" "}
            <span className="font-semibold">{onibus.nome}</span>
          </div>
        </div>
      )}
      <div className="glass rounded-2xl p-3 flex items-center gap-2 mb-4">
        <Search className="size-4 text-muted-foreground ml-2" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome ou telefone…" className="flex-1 bg-transparent outline-none text-sm" />
      </div>

      {loadingExc || loadingPax ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : !excursao ? (
        <div className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">Nenhuma excursão ativa vinculada.</div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">Nenhum passageiro encontrado.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => {
            const ponto = p.ponto_embarque_id ? pontoById.get(p.ponto_embarque_id) : null;
            const seat = p.assento ?? (p.seat_id ? seatById.get(p.seat_id) : null) ?? "—";
            return (
              <Link key={p.id} to="/staff/passageiro/$id" params={{ id: p.id }} className="glass rounded-2xl p-4 block hover:border-neon-green/50 border border-transparent transition">
                <div className="flex items-center gap-3">
                  <div className="size-12 rounded-full bg-gradient-to-br from-neon-purple to-neon-pink grid place-items-center font-display font-black text-primary-foreground">
                    {p.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold truncate">{p.nome}</p>
                      <Pill tone={p.status === "confirmado" ? "green" : "yellow"}>{p.status}</Pill>
                    </div>
                    <div className="grid gap-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Phone className="size-3" /> {p.telefone ?? "sem telefone"}</span>
                      <span className="flex items-center gap-1"><Armchair className="size-3 text-neon-pink" /> Poltrona {seat}</span>
                      <span className="flex items-center gap-1"><MapPin className="size-3 text-neon-green" /> {ponto ? `${ponto.nome}${ponto.horario ? ` · ${ponto.horario}` : ""}` : "Sem ponto"}</span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </StaffShell>
  );
}