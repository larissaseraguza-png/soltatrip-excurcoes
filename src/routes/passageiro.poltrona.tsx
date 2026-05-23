import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Shell } from "@/components/passageiro/Shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, Armchair, Check, MapPinned } from "lucide-react";

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
  const [savingPonto, setSavingPonto] = useState<string | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<any>(null);
  const [selectedPontoId, setSelectedPontoId] = useState<string | null>(null);

  const { data: reserva, isLoading: l1 } = useQuery({
    queryKey: ["pax-poltrona", paxId],
    enabled: !!paxId && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("passageiros")
        .select(
          "id, seat_id, assento, ponto_embarque_id, payment_status, amount_paid, excursao_id, reserva_id, excursao:excursoes(id, titulo)",
        )
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

  const { data: pontos = [], isLoading: l3 } = useQuery({
    queryKey: ["pontos-poltrona", reserva?.excursao_id],
    enabled: !!reserva?.excursao_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pontos_embarque")
        .select("id, nome, endereco, referencia, horario, ordem")
        .eq("excursao_id", reserva!.excursao_id)
        .order("ordem", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  if (l1 || l2 || l3) {
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
          <p className="text-sm text-muted-foreground">
            Faça pelo menos um pagamento para liberar a escolha de poltrona.
          </p>
          <button
            onClick={() =>
              navigate({
                to: "/passageiro/pagamentos",
                search: { reserva: (reserva as any).reserva_id ?? reserva.id } as any,
              })
            }
            className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Ir para pagamento
          </button>
        </div>
      </Shell>
    );
  }

  const selectedSeatId = selectedSeat?.id ?? reserva.seat_id;
  const selectedSeatLabel =
    selectedSeat?.seat_number ??
    (seats as any[]).find((s) => s.id === selectedSeatId)?.seat_number ??
    reserva.assento ??
    "—";
  const currentPontoId = selectedPontoId ?? reserva.ponto_embarque_id;
  const currentPonto = (pontos as any[]).find((p) => p.id === currentPontoId);

  if (selectedSeatId) {
    return (
      <Shell title="Sua poltrona" subtitle={(reserva as any).excursao?.titulo}>
        <div className="glass rounded-3xl p-8 text-center mb-5">
          <div className="mx-auto size-24 rounded-3xl bg-gradient-to-br from-neon-pink to-neon-purple grid place-items-center glow-primary mb-4">
            <Armchair className="size-10 text-primary-foreground" />
          </div>
          <p className="text-xs text-muted-foreground">Poltrona confirmada</p>
          <p className="font-display font-black text-5xl mt-1">{selectedSeatLabel}</p>
          <p className="text-[12px] text-muted-foreground mt-3">
            Agora confirme o ponto de embarque para finalizar esta etapa.
          </p>
        </div>

        <div className="glass rounded-3xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <MapPinned className="size-5 text-neon-pink" />
            <h2 className="font-display font-bold">Escolha o embarque</h2>
          </div>

          {currentPonto ? (
            <div className="bg-neon-green/10 border border-neon-green/30 rounded-2xl p-4 mb-4">
              <p className="text-xs font-bold text-neon-green mb-1">✓ Embarque confirmado</p>
              <p className="font-bold">{currentPonto.nome}</p>
              {currentPonto.endereco && (
                <p className="text-xs text-muted-foreground">{currentPonto.endereco}</p>
              )}
              {currentPonto.horario && (
                <p className="text-xs text-neon-green mt-1">⏰ {currentPonto.horario}</p>
              )}
            </div>
          ) : null}

          <div className="space-y-2">
            {(pontos as any[]).map((pt) => {
              const selected = currentPontoId === pt.id;
              const isSaving = savingPonto === pt.id;
              return (
                <button
                  key={pt.id}
                  type="button"
                  disabled={!!savingPonto}
                  onClick={() => escolherPonto(pt.id)}
                  className={`w-full text-left rounded-2xl p-3 border transition disabled:opacity-60 ${
                    selected
                      ? "bg-neon-pink/10 border-neon-pink/60"
                      : "bg-background/40 border-border hover:border-neon-pink/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-sm">{pt.nome}</p>
                      {pt.endereco && (
                        <p className="text-xs text-muted-foreground">{pt.endereco}</p>
                      )}
                      {pt.horario && <p className="text-[11px] text-neon-pink">⏰ {pt.horario}</p>}
                    </div>
                    {isSaving ? (
                      <Loader2 className="size-4 animate-spin text-neon-pink" />
                    ) : selected ? (
                      <Check className="size-4 text-neon-green" />
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>

          {pontos.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-6">
              Nenhum ponto de embarque cadastrado.
            </p>
          )}

          <button
            disabled={!currentPontoId}
            onClick={() =>
              navigate({
                to: "/passageiro/reserva/$id",
                params: { id: (reserva as any).reserva_id ?? reserva.id },
              })
            }
            className="mt-5 w-full h-12 rounded-2xl font-bold bg-primary text-primary-foreground glow-primary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Continuar para a reserva
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

      const { error: passageiroError } = await supabase
        .from("passageiros")
        .update({ seat_id: seat.id, assento: seat.seat_number })
        .eq("id", reserva.id);
      if (passageiroError) throw passageiroError;

      setSelectedSeat(seat);
      await qc.invalidateQueries({ queryKey: ["seats"] });
      await qc.invalidateQueries({ queryKey: ["pax-poltrona"] });
      await qc.invalidateQueries({ queryKey: ["reserva-passageiros"] });
    } catch (err: any) {
      alert(err.message ?? "Erro ao escolher poltrona");
    } finally {
      setSaving(null);
    }
  }

  async function escolherPonto(pontoId: string) {
    if (!reserva) return;
    setSavingPonto(pontoId);
    try {
      const { error } = await supabase
        .from("passageiros")
        .update({ ponto_embarque_id: pontoId })
        .eq("id", reserva.id);
      if (error) throw error;
      setSelectedPontoId(pontoId);
      await qc.invalidateQueries({ queryKey: ["pax-poltrona"] });
      await qc.invalidateQueries({ queryKey: ["reserva-passageiros"] });
      await qc.invalidateQueries({ queryKey: ["pagto-passageiros"] });
    } catch (err: any) {
      alert(err.message ?? "Erro ao escolher embarque");
    } finally {
      setSavingPonto(null);
    }
  }

  return (
    <Shell title="Escolher poltrona" subtitle={(reserva as any).excursao?.titulo}>
      <div className="glass rounded-3xl p-5 mb-5">
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded bg-neon-green" /> Disponível
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded bg-neon-pink" /> Sua
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded bg-muted" /> Ocupada
          </span>
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
        <p className="text-center text-sm text-muted-foreground py-10">
          Nenhuma poltrona disponível.
        </p>
      )}
    </Shell>
  );
}
