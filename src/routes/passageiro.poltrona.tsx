import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Shell } from "@/components/passageiro/Shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, Armchair, Check } from "lucide-react";

type Search = { pax?: string; reserva?: string };

export const Route = createFileRoute("/passageiro/poltrona")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    pax: typeof s.pax === "string" ? s.pax : undefined,
    reserva: typeof s.reserva === "string" ? s.reserva : undefined,
  }),
  component: Poltrona,
});

function Poltrona() {
  const { user } = useAuth();
  const { pax, reserva: reservaLegacy } = Route.useSearch();
  const paxId = pax ?? reservaLegacy;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [saving, setSaving] = useState<string | null>(null);

  const { data: reserva, isLoading: l1 } = useQuery({
    queryKey: ["pax-poltrona", paxId],
    enabled: !!paxId && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("passageiros")
        .select("id, seat_id, payment_status, amount_paid, excursao_id, reserva_id, excursao:excursoes(id, titulo)")
        .eq("id", paxId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: seats = [], isLoading: l2 } = useQuery({
    queryKey: ["seats", reserva?.excursao_id],
    enabled: !!reserva?.excursao_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seats")
        .select("id, seat_number, occupied, reserved_by")
        .eq("excursao_id", reserva!.excursao_id)
        .order("seat_number");
      if (error) throw error;
      return (data ?? []).sort((a, b) => Number(a.seat_number) - Number(b.seat_number));
    },
  });

  if (l1 || l2) {
    return (
      <Shell title="Escolher poltrona">
        <div className="flex justify-center py-20">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      </Shell>
    );
  }

  if (!reserva) {
    return (
      <Shell title="Escolher poltrona">
        <p className="text-center text-sm text-muted-foreground py-10">Reserva não encontrada.</p>
      </Shell>
    );
  }

  if (Number(reserva.amount_paid) <= 0) {
    return (
      <Shell title="Escolher poltrona">
        <div className="glass rounded-3xl p-10 text-center">
          <p className="text-sm text-muted-foreground">Faça pelo menos um pagamento para liberar a escolha de poltrona.</p>
          <button
            onClick={() => navigate({ to: "/passageiro/pagamentos", search: { reserva: reserva.id } as any })}
            className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Ir para pagamento
          </button>
        </div>
      </Shell>
    );
  }

  // Poltrona já escolhida — bloqueada definitivamente
  if (reserva.seat_id) {
    const meuSeat = (seats as any[]).find((s) => s.id === reserva.seat_id);
    return (
      <Shell title="Sua poltrona" subtitle={(reserva as any).excursao?.titulo}>
        <div className="glass rounded-3xl p-8 text-center">
          <div className="mx-auto size-24 rounded-3xl bg-gradient-to-br from-neon-pink to-neon-purple grid place-items-center glow-primary mb-4">
            <Armchair className="size-10 text-primary-foreground" />
          </div>
          <p className="text-xs text-muted-foreground">Poltrona confirmada</p>
          <p className="font-display font-black text-5xl mt-1">{meuSeat?.seat_number ?? "—"}</p>
          <p className="text-[12px] text-muted-foreground mt-3">
            Sua escolha está salva. Apenas o excursionista pode alterar.
          </p>
          <button
            onClick={() => navigate({ to: "/passageiro/reserva/$id", params: { id: (reserva as any).reserva_id ?? reserva.id } })}
            className="mt-5 w-full h-12 rounded-2xl font-bold bg-primary text-primary-foreground glow-primary"
          >
            Voltar para a reserva
          </button>
        </div>
      </Shell>
    );
  }

  async function escolher(seat: any) {
    if (!user || !reserva) return;
    if (seat.occupied && seat.reserved_by !== user.id) return;
    setSaving(seat.id);
    try {
      // Libera poltrona anterior, se houver
      if (reserva.seat_id && reserva.seat_id !== seat.id) {
        await supabase
          .from("seats")
          .update({ occupied: false, reserved_by: null, passageiro_id: null })
          .eq("id", reserva.seat_id)
          .eq("reserved_by", user.id);
      }
      // Marca nova
      const { error } = await supabase
        .from("seats")
        .update({ occupied: true, reserved_by: user.id, passageiro_id: reserva.id })
        .eq("id", seat.id)
        .eq("occupied", false);
      if (error) throw error;

      await supabase
        .from("passageiros")
        .update({ seat_id: seat.id, assento: seat.seat_number })
        .eq("id", reserva.id);

      qc.invalidateQueries({ queryKey: ["seats"] });
      qc.invalidateQueries({ queryKey: ["reserva-poltrona"] });
    } catch (err: any) {
      alert(err.message ?? "Erro ao escolher poltrona");
    } finally {
      setSaving(null);
    }
  }

  return (
    <Shell title="Escolher poltrona" subtitle={(reserva as any).excursao?.titulo}>
      <div className="glass rounded-3xl p-5 mb-5">
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-neon-green" /> Disponível</span>
          <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-neon-pink" /> Sua</span>
          <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-muted" /> Ocupada</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {seats.map((s: any) => {
          const isMine = s.reserved_by === user?.id;
          const isOccupied = s.occupied && !isMine;
          const isSaving = saving === s.id;
          return (
            <button
              key={s.id}
              disabled={isOccupied || isSaving}
              onClick={() => escolher(s)}
              className={`aspect-square rounded-2xl grid place-items-center font-bold transition ${
                isMine
                  ? "bg-gradient-to-br from-neon-pink to-neon-purple text-primary-foreground glow-primary"
                  : isOccupied
                  ? "bg-muted text-muted-foreground opacity-50 cursor-not-allowed"
                  : "bg-neon-green/20 text-neon-green hover:bg-neon-green/30"
              }`}
            >
              {isSaving ? (
                <Loader2 className="size-5 animate-spin" />
              ) : isMine ? (
                <Check className="size-5" />
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <Armchair className="size-4" />
                  <span className="text-xs">{s.seat_number}</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {seats.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-10">Nenhuma poltrona disponível.</p>
      )}
    </Shell>
  );
}
