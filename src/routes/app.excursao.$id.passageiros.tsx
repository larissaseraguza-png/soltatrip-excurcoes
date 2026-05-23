import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Plus, Loader2, Trash2, QrCode, UserCheck, Search, MapPin, Armchair, Edit3, X } from "lucide-react";
import { useState, useMemo } from "react";
import { SeatMap } from "@/components/SeatMap";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import { toast } from "sonner";

export const Route = createFileRoute("/app/excursao/$id/passageiros")({
  component: PassageirosPage,
});

type Passageiro = {
  id: string;
  nome: string;
  telefone: string | null;
  documento: string | null;
  assento: string | null;
  seat_id: string | null;
  status: string;
  qr_code: string;
  ponto_embarque_id: string | null;
  observacao_interna: string | null;
  payment_status: string;
  total_price: number;
  amount_paid: number;
};

type Ponto = { id: string; nome: string; horario: string | null };
type Seat = { id: string; seat_number: string; occupied: boolean; passageiro_id: string | null };

function PassageirosPage() {
  const { id } = useParams({ from: "/app/excursao/$id/passageiros" });
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [pontoFilter, setPontoFilter] = useState<string>("todos");
  const [open, setOpen] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [editing, setEditing] = useState<Passageiro | null>(null);

  const { data: excursao } = useQuery({
    queryKey: ["excursao", id],
    queryFn: async () => {
      const { data } = await supabase.from("excursoes").select("titulo,total_vagas").eq("id", id).single();
      return data;
    },
  });

  const { data: pagamentos = [] } = useQuery({
    queryKey: ["pagamentos", id],
    queryFn: async () => {
      const { data } = await supabase.from("pagamentos").select("passageiro_id,status").eq("excursao_id", id);
      return data ?? [];
    },
  });

  const { data: pontos = [] } = useQuery({
    queryKey: ["pontos", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("pontos_embarque")
        .select("id, nome, horario")
        .eq("excursao_id", id)
        .order("ordem", { ascending: true });
      return (data ?? []) as Ponto[];
    },
  });

  const { data: seats = [] } = useQuery({
    queryKey: ["seats", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seats")
        .select("id, seat_number, occupied, passageiro_id")
        .eq("excursao_id", id)
        .order("seat_number");
      if (error) throw error;
      return (data ?? []).sort((a, b) => Number(a.seat_number) - Number(b.seat_number)) as Seat[];
    },
  });

  const { data: passageiros = [], isLoading } = useQuery({
    queryKey: ["passageiros", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("passageiros")
        .select("*")
        .eq("excursao_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Passageiro[];
    },
  });

  useRealtimeSync(
    `excursao-${id}`,
    [
      { table: "passageiros", filter: `excursao_id=eq.${id}` },
      { table: "pagamentos", filter: `excursao_id=eq.${id}` },
      { table: "seats", filter: `excursao_id=eq.${id}` },
      { table: "pontos_embarque", filter: `excursao_id=eq.${id}` },
      { table: "reservas", filter: `excursao_id=eq.${id}` },
    ],
    [
      ["passageiros", id],
      ["pagamentos", id],
      ["seats", id],
      ["pontos", id],
      ["pontos-counts", id],
      ["excursao", id],
    ],
  );

  const removeMut = useMutation({
    mutationFn: async (pid: string) => {
      await supabase.from("passageiros").delete().eq("id", pid);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["passageiros", id] });
      qc.invalidateQueries({ queryKey: ["pontos-counts", id] });
    },
  });

  const statusMut = useMutation({
    mutationFn: async ({ pid, status }: { pid: string; status: string }) => {
      await supabase.from("passageiros").update({ status }).eq("id", pid);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["passageiros", id] }),
  });

  const tripChoicesMut = useMutation({
    mutationFn: async ({
      passageiro,
      seatId,
      pontoId,
    }: {
      passageiro: Passageiro;
      seatId: string | null;
      pontoId: string | null;
    }) => {
      const { error } = await (supabase as any).rpc("organizer_update_passageiro_trip_choices", {
        p_passageiro_id: passageiro.id,
        p_seat_id: seatId,
        p_update_seat: true,
        p_ponto_embarque_id: pontoId,
        p_update_ponto: true,
      });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["passageiros", id] });
      qc.invalidateQueries({ queryKey: ["seats", id] });
      qc.invalidateQueries({ queryKey: ["pontos-counts", id] });
      setEditing(null);
      const seat = seats.find((s) => s.id === variables.seatId)?.seat_number;
      const ponto = pontos.find((p) => p.id === variables.pontoId);
      toast.success(
        [seat ? `Poltrona alterada para ${seat}` : null, ponto ? `Embarque: ${ponto.nome}${ponto.horario ? ` - ${ponto.horario}` : ""}` : null]
          .filter(Boolean)
          .join(" · "),
      );
    },
    onError: (err: any) => alert(err.message ?? "Erro ao salvar alterações"),
  });

  const pontoNome = (pid: string | null) => pontos.find((p) => p.id === pid)?.nome ?? null;
  const seatById = useMemo(() => new Map(seats.map((s) => [s.id, s])), [seats]);

  const pagoMap = useMemo(() => {
    const m = new Map<string, boolean>();
    for (const pg of pagamentos) {
      if (pg.status === "pago" && pg.passageiro_id) m.set(pg.passageiro_id, true);
    }
    return m;
  }, [pagamentos]);

  const taken = useMemo(() => {
    const t: Record<string, { pago: boolean; nome: string }> = {};
    for (const p of passageiros) {
      const seatNumber = p.assento ?? (p.seat_id ? seatById.get(p.seat_id)?.seat_number : null);
      if (seatNumber) t[seatNumber] = { pago: !!pagoMap.get(p.id), nome: p.nome };
    }
    return t;
  }, [passageiros, pagoMap, seatById]);

  const filtered = passageiros.filter((p) => {
    const matchSearch =
      p.nome.toLowerCase().includes(search.toLowerCase()) ||
      (p.telefone ?? "").includes(search);
    const matchPonto =
      pontoFilter === "todos" ||
      (pontoFilter === "_sem" ? !p.ponto_embarque_id : p.ponto_embarque_id === pontoFilter);
    return matchSearch && matchPonto;
  });

  return (
    <div>
      <Link to="/app/excursao/$id" params={{ id }} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <div className="flex items-end justify-between mb-5">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold">{excursao?.titulo ?? "Excursão"}</p>
          <h1 className="font-display text-2xl font-black">Passageiros</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {passageiros.length} / {excursao?.total_vagas ?? 0} vagas
          </p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-gradient-to-r from-neon-pink to-neon-purple text-primary-foreground font-bold text-sm glow-primary"
        >
          <Plus className="h-4 w-4" /> Novo
        </button>
      </div>

      <div className="relative mb-3">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome ou telefone"
          className="w-full h-11 pl-9 pr-3 rounded-xl bg-input border border-border text-sm"
        />
      </div>

      <button
        onClick={() => setShowMap((v) => !v)}
        className="w-full mb-4 inline-flex items-center justify-center gap-2 h-10 rounded-xl glass text-sm font-bold"
      >
        <Armchair className="h-4 w-4 text-neon-green" />
        {showMap ? "Ocultar mapa de assentos" : "Ver mapa de assentos"}
      </button>

      {showMap && (
        <div className="mb-4">
          <SeatMap total={excursao?.total_vagas ?? 0} taken={taken} />
        </div>
      )}

      {pontos.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 mb-4 -mx-1 px-1">
          <Chip active={pontoFilter === "todos"} onClick={() => setPontoFilter("todos")}>Todos</Chip>
          {pontos.map((p) => (
            <Chip key={p.id} active={pontoFilter === p.id} onClick={() => setPontoFilter(p.id)}>
              {p.nome}
            </Chip>
          ))}
          <Chip active={pontoFilter === "_sem"} onClick={() => setPontoFilter("_sem")}>Sem ponto</Chip>
        </div>
      )}


      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">
          Nenhum passageiro {search || pontoFilter !== "todos" ? "encontrado" : "ainda"}.
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((p) => {
            const displayedSeat = p.assento ?? (p.seat_id ? seatById.get(p.seat_id)?.seat_number : null);
            const displayedPonto = pontoNome(p.ponto_embarque_id);

            return (
            <li key={p.id} className="glass rounded-2xl p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-neon-purple to-neon-pink flex items-center justify-center font-black text-sm shrink-0">
                {p.nome.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{p.nome}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {p.telefone ?? "sem telefone"} • {displayedSeat ? `Assento ${displayedSeat}` : "sem assento"}
                </p>
                {pontos.length > 0 && (
                  <div className="flex items-center gap-1 mt-1.5">
                    <MapPin className="h-3 w-3 text-neon-pink" />
                    <span className="text-xs text-muted-foreground truncate">
                      {displayedPonto ?? "sem ponto"}
                    </span>
                  </div>
                )}
                {pontos.length === 0 && p.ponto_embarque_id && (
                  <p className="text-xs text-muted-foreground mt-0.5">📍 {pontoNome(p.ponto_embarque_id)}</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  title="Editar poltrona e embarque"
                  onClick={() => setEditing(p)}
                  className="h-8 w-8 rounded-lg bg-neon-purple/10 text-neon-purple hover:bg-neon-purple/20 flex items-center justify-center"
                >
                  <Edit3 className="h-4 w-4" />
                </button>
                {p.status !== "confirmado" && (
                  <button
                    title="Confirmar"
                    onClick={() => statusMut.mutate({ pid: p.id, status: "confirmado" })}
                    className="h-8 w-8 rounded-lg bg-neon-green/10 text-neon-green hover:bg-neon-green/20 flex items-center justify-center"
                  >
                    <UserCheck className="h-4 w-4" />
                  </button>
                )}
                <button
                  title="QR"
                  onClick={() => {
                    navigator.clipboard.writeText(p.qr_code);
                    alert(`Código QR copiado: ${p.qr_code}`);
                  }}
                  className="h-8 w-8 rounded-lg bg-secondary text-foreground hover:bg-secondary/80 flex items-center justify-center"
                >
                  <QrCode className="h-4 w-4" />
                </button>
                <button
                  title="Remover"
                  onClick={() => confirm(`Remover ${p.nome}?`) && removeMut.mutate(p.id)}
                  className="h-8 w-8 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
            );
          })}
        </ul>
      )}

      {open && (
        <NewPassageiroModal
          excursaoId={id}
          pontos={pontos}
          totalVagas={excursao?.total_vagas ?? 0}
          taken={taken}
          seats={seats}
          onClose={() => setOpen(false)}
        />
      )}
      {editing && (
        <EditChoicesModal
          passageiro={editing}
          pontos={pontos}
          seats={seats}
          totalVagas={excursao?.total_vagas ?? 0}
          taken={taken}
          saving={tripChoicesMut.isPending}
          onClose={() => setEditing(null)}
          onSave={(seatId, pontoId) => tripChoicesMut.mutate({ passageiro: editing, seatId, pontoId })}
        />
      )}
    </div>
  );
}

function Chip({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 h-8 px-3 rounded-full text-xs font-bold transition ${
        active ? "bg-gradient-to-r from-neon-pink to-neon-purple text-primary-foreground" : "bg-secondary text-muted-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function EditChoicesModal({
  passageiro,
  pontos,
  seats,
  totalVagas,
  taken,
  saving,
  onClose,
  onSave,
}: {
  passageiro: Passageiro;
  pontos: Ponto[];
  seats: Seat[];
  totalVagas: number;
  taken: Record<string, { pago: boolean; nome: string }>;
  saving: boolean;
  onClose: () => void;
  onSave: (seatId: string | null, pontoId: string | null) => void;
}) {
  const currentSeatNumber = passageiro.assento ?? seats.find((s) => s.id === passageiro.seat_id)?.seat_number ?? "";
  const [selectedSeatNumber, setSelectedSeatNumber] = useState(currentSeatNumber);
  const [selectedPontoId, setSelectedPontoId] = useState(passageiro.ponto_embarque_id ?? "");
  const selectedSeat = seats.find((s) => s.seat_number === selectedSeatNumber);
  const selectedPonto = pontos.find((p) => p.id === selectedPontoId);

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur flex items-end sm:items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="glass rounded-3xl p-5 w-full max-w-lg border border-border my-4">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Editar reserva</p>
            <h2 className="font-display text-xl font-black">{passageiro.nome}</h2>
          </div>
          <button type="button" onClick={onClose} className="h-9 w-9 rounded-xl bg-secondary grid place-items-center">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <section>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Editar poltrona</span>
              <span className="text-xs font-bold text-neon-pink">{selectedSeatNumber ? `Selecionada: ${selectedSeatNumber}` : "Selecione"}</span>
            </div>
            <SeatMap
              total={Math.max(totalVagas, seats.length)}
              taken={taken}
              selected={selectedSeatNumber || null}
              onSelect={(assento) => setSelectedSeatNumber(assento)}
            />
          </section>

          <section>
            <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Editar embarque</span>
            {pontos.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground italic">Nenhum ponto de embarque cadastrado.</p>
            ) : (
              <div className="mt-2 space-y-2">
                {pontos.map((ponto) => {
                  const selected = selectedPontoId === ponto.id;
                  return (
                    <button
                      key={ponto.id}
                      type="button"
                      onClick={() => setSelectedPontoId(ponto.id)}
                      className={`w-full text-left rounded-2xl p-3 border transition ${
                        selected ? "bg-neon-pink/10 border-neon-pink/60" : "bg-background/40 border-border hover:border-neon-pink/40"
                      }`}
                    >
                      <p className="font-bold text-sm">{ponto.nome}</p>
                      {ponto.horario && <p className="text-[11px] text-neon-pink">⏰ {ponto.horario}</p>}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {(selectedSeatNumber || selectedPonto) && (
            <div className="rounded-2xl bg-background/40 border border-border p-3 text-xs text-muted-foreground">
              {selectedSeatNumber && <p>Sua poltrona foi alterada para {selectedSeatNumber}.</p>}
              {selectedPonto && <p>Seu embarque foi alterado para {selectedPonto.nome}{selectedPonto.horario ? ` - ${selectedPonto.horario}` : ""}.</p>}
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-5">
          <button type="button" onClick={onClose} className="flex-1 h-11 rounded-xl bg-secondary font-semibold">Cancelar</button>
          <button
            type="button"
            disabled={saving || !selectedSeat}
            onClick={() => onSave(selectedSeat?.id ?? null, selectedPontoId || null)}
            className="flex-1 h-11 rounded-xl bg-gradient-to-r from-neon-pink to-neon-purple text-primary-foreground font-bold disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar alteração
          </button>
        </div>
      </div>
    </div>
  );
}

function NewPassageiroModal({
  excursaoId,
  pontos,
  totalVagas,
  taken,
  seats,
  onClose,
}: {
  excursaoId: string;
  pontos: Ponto[];
  totalVagas: number;
  taken: Record<string, { pago: boolean; nome: string }>;
  seats: Seat[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    nome: "",
    telefone: "",
    documento: "",
    email: "",
    assento: "",
    ponto_embarque_id: "",
    total_price: "",
    amount_paid: "",
    payment_status: "pending_payment" as "paid" | "partial_payment" | "pending_payment",
    status: "pendente" as "pendente" | "confirmado",
    observacao_interna: "",
  });
  const [saving, setSaving] = useState(false);

  const selectedSeat = seats.find((s) => s.seat_number === form.assento);
  const total = Number(form.total_price || 0);
  const paid = Number(form.amount_paid || 0);
  const restante = Math.max(0, total - paid);

  function autoPaymentStatus(t: number, p: number): "paid" | "partial_payment" | "pending_payment" {
    if (t > 0 && p >= t) return "paid";
    if (p > 0) return "partial_payment";
    return "pending_payment";
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim()) return;
    setSaving(true);
    const { error } = await (supabase as any).rpc("organizer_create_manual_passageiro", {
      p_excursao_id: excursaoId,
      p_nome: form.nome.trim(),
      p_telefone: form.telefone || null,
      p_documento: form.documento || null,
      p_email: form.email || null,
      p_seat_id: selectedSeat?.id ?? null,
      p_ponto_embarque_id: form.ponto_embarque_id || null,
      p_total_price: total,
      p_amount_paid: paid,
      p_payment_status: form.payment_status,
      p_status: form.status,
      p_observacao_interna: form.observacao_interna || null,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message ?? "Erro ao adicionar passageiro");
      return;
    }
    toast.success("Passageiro manual adicionado");
    qc.invalidateQueries({ queryKey: ["passageiros", excursaoId] });
    qc.invalidateQueries({ queryKey: ["seats", excursaoId] });
    qc.invalidateQueries({ queryKey: ["pontos-counts", excursaoId] });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur flex items-end sm:items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <form
        onSubmit={save}
        onClick={(e) => e.stopPropagation()}
        className="glass rounded-3xl p-6 w-full max-w-md border border-border my-4"
      >
        <div className="mb-4">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Reserva manual</p>
          <h2 className="font-display text-xl font-black">Adicionar passageiro manualmente</h2>
          <p className="text-[11px] text-muted-foreground mt-1">
            Use para acordos diretos, convidados ou pagamentos combinados fora do app.
          </p>
        </div>

        <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
          <Field label="Nome" required value={form.nome} onChange={(v) => setForm({ ...form, nome: v })} />
          <div className="grid grid-cols-2 gap-2">
            <Field label="Telefone" value={form.telefone} onChange={(v) => setForm({ ...form, telefone: v })} />
            <Field label="Documento" value={form.documento} onChange={(v) => setForm({ ...form, documento: v })} />
          </div>
          <Field label="Email (opcional)" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />

          {totalVagas > 0 && (
            <div>
              <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                Poltrona {form.assento && <span className="text-neon-pink">— {form.assento}</span>}
              </span>
              <div className="mt-1">
                <SeatMap
                  total={totalVagas}
                  taken={taken}
                  selected={form.assento || null}
                  onSelect={(a) => setForm({ ...form, assento: form.assento === a ? "" : a })}
                />
              </div>
            </div>
          )}

          <label className="block">
            <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Ponto de embarque</span>
            {pontos.length === 0 ? (
              <p className="mt-1 text-xs text-muted-foreground italic">Nenhum ponto cadastrado.</p>
            ) : (
              <select
                value={form.ponto_embarque_id}
                onChange={(e) => setForm({ ...form, ponto_embarque_id: e.target.value })}
                className="mt-1 w-full h-11 px-3 rounded-xl bg-input border border-border text-sm"
              >
                <option value="">— Selecionar —</option>
                {pontos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}{p.horario ? ` (${p.horario})` : ""}
                  </option>
                ))}
              </select>
            )}
          </label>

          <div className="rounded-2xl border border-border bg-background/40 p-3 space-y-3">
            <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Pagamento</p>
            <div className="grid grid-cols-2 gap-2">
              <Field
                label="Valor total (R$)"
                value={form.total_price}
                onChange={(v) => {
                  const t = Number(v || 0);
                  setForm({ ...form, total_price: v, payment_status: autoPaymentStatus(t, paid) });
                }}
              />
              <Field
                label="Valor pago (R$)"
                value={form.amount_paid}
                onChange={(v) => {
                  const p = Number(v || 0);
                  setForm({ ...form, amount_paid: v, payment_status: autoPaymentStatus(total, p) });
                }}
              />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Restante</span>
              <span className="font-bold text-neon-pink">R$ {restante.toFixed(2)}</span>
            </div>
            <label className="block">
              <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Status do pagamento</span>
              <select
                value={form.payment_status}
                onChange={(e) => setForm({ ...form, payment_status: e.target.value as any })}
                className="mt-1 w-full h-10 px-3 rounded-xl bg-input border border-border text-sm"
              >
                <option value="pending_payment">Pendente</option>
                <option value="partial_payment">Parcial</option>
                <option value="paid">Pago</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={form.status === "confirmado"}
                onChange={(e) => setForm({ ...form, status: e.target.checked ? "confirmado" : "pendente" })}
                className="h-4 w-4 accent-neon-pink"
              />
              <span className="text-muted-foreground">
                Confirmar reserva manualmente (mesmo sem pagamento completo)
              </span>
            </label>
          </div>

          <label className="block">
            <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
              Observação interna <span className="text-muted-foreground/70 normal-case">(não aparece para o passageiro)</span>
            </span>
            <textarea
              value={form.observacao_interna}
              onChange={(e) => setForm({ ...form, observacao_interna: e.target.value })}
              rows={3}
              placeholder="Ex.: combinado direto, pagar R$150 restantes no embarque."
              className="mt-1 w-full px-3 py-2 rounded-xl bg-input border border-border text-sm"
            />
          </label>
        </div>

        <div className="flex gap-2 mt-5">
          <button type="button" onClick={onClose} className="flex-1 h-11 rounded-xl bg-secondary font-semibold">Cancelar</button>
          <button disabled={saving || !form.nome.trim()} className="flex-1 h-11 rounded-xl bg-gradient-to-r from-neon-pink to-neon-purple text-primary-foreground font-bold disabled:opacity-50 inline-flex items-center justify-center gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Salvando..." : "Adicionar"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, required }: { label: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">{label}</span>
      <input
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full h-11 px-3 rounded-xl bg-input border border-border text-sm"
      />
    </label>
  );
}
