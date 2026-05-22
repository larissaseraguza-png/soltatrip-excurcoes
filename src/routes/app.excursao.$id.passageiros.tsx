import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Plus, Loader2, Trash2, QrCode, UserCheck, Search, MapPin, Armchair } from "lucide-react";
import { useState, useMemo } from "react";
import { SeatMap } from "@/components/SeatMap";

export const Route = createFileRoute("/app/excursao/$id/passageiros")({
  component: PassageirosPage,
});

type Passageiro = {
  id: string;
  nome: string;
  telefone: string | null;
  documento: string | null;
  assento: string | null;
  status: string;
  qr_code: string;
  ponto_embarque_id: string | null;
};

type Ponto = { id: string; nome: string; horario: string | null };

function PassageirosPage() {
  const { id } = useParams({ from: "/app/excursao/$id/passageiros" });
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [pontoFilter, setPontoFilter] = useState<string>("todos");
  const [open, setOpen] = useState(false);
  const [showMap, setShowMap] = useState(false);

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

  const pontoMut = useMutation({
    mutationFn: async ({ pid, ponto_embarque_id }: { pid: string; ponto_embarque_id: string | null }) => {
      await supabase.from("passageiros").update({ ponto_embarque_id }).eq("id", pid);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["passageiros", id] });
      qc.invalidateQueries({ queryKey: ["pontos-counts", id] });
    },
  });

  const pontoNome = (pid: string | null) => pontos.find((p) => p.id === pid)?.nome ?? null;

  const pagoMap = useMemo(() => {
    const m = new Map<string, boolean>();
    for (const pg of pagamentos) {
      if (pg.status === "pago") m.set(pg.passageiro_id, true);
    }
    return m;
  }, [pagamentos]);

  const taken = useMemo(() => {
    const t: Record<string, { pago: boolean; nome: string }> = {};
    for (const p of passageiros) {
      if (p.assento) t[p.assento] = { pago: !!pagoMap.get(p.id), nome: p.nome };
    }
    return t;
  }, [passageiros, pagoMap]);

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
          {filtered.map((p) => (
            <li key={p.id} className="glass rounded-2xl p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-neon-purple to-neon-pink flex items-center justify-center font-black text-sm shrink-0">
                {p.nome.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{p.nome}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {p.telefone ?? "sem telefone"} • {p.assento ? `Assento ${p.assento}` : "sem assento"}
                </p>
                {pontos.length > 0 && (
                  <div className="flex items-center gap-1 mt-1.5">
                    <MapPin className="h-3 w-3 text-neon-pink" />
                    <select
                      value={p.ponto_embarque_id ?? ""}
                      onChange={(e) => pontoMut.mutate({ pid: p.id, ponto_embarque_id: e.target.value || null })}
                      className="text-xs bg-secondary/50 border border-border rounded-md px-1.5 py-0.5 max-w-[160px] truncate"
                    >
                      <option value="">Sem ponto</option>
                      {pontos.map((pt) => (
                        <option key={pt.id} value={pt.id}>{pt.nome}</option>
                      ))}
                    </select>
                  </div>
                )}
                {pontos.length === 0 && p.ponto_embarque_id && (
                  <p className="text-xs text-muted-foreground mt-0.5">📍 {pontoNome(p.ponto_embarque_id)}</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
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
          ))}
        </ul>
      )}

      {open && <NewPassageiroModal excursaoId={id} pontos={pontos} onClose={() => setOpen(false)} />}
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

function NewPassageiroModal({ excursaoId, pontos, onClose }: { excursaoId: string; pontos: Ponto[]; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ nome: "", telefone: "", documento: "", assento: "", ponto_embarque_id: "" });
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("passageiros").insert({
      excursao_id: excursaoId,
      nome: form.nome,
      telefone: form.telefone || null,
      documento: form.documento || null,
      assento: form.assento || null,
      ponto_embarque_id: form.ponto_embarque_id || null,
    });
    setSaving(false);
    if (error) { alert(error.message); return; }
    qc.invalidateQueries({ queryKey: ["passageiros", excursaoId] });
    qc.invalidateQueries({ queryKey: ["pontos-counts", excursaoId] });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <form
        onSubmit={save}
        onClick={(e) => e.stopPropagation()}
        className="glass rounded-3xl p-6 w-full max-w-md border border-border"
      >
        <h2 className="font-display text-xl font-black mb-4">Novo passageiro</h2>
        <div className="space-y-3">
          <Field label="Nome" required value={form.nome} onChange={(v) => setForm({ ...form, nome: v })} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Telefone" value={form.telefone} onChange={(v) => setForm({ ...form, telefone: v })} />
            <Field label="Assento" value={form.assento} onChange={(v) => setForm({ ...form, assento: v })} />
          </div>
          <Field label="Documento" value={form.documento} onChange={(v) => setForm({ ...form, documento: v })} />
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Ponto de embarque</span>
            {pontos.length === 0 ? (
              <p className="mt-1 text-xs text-muted-foreground italic">
                Nenhum ponto cadastrado. Adicione em "Pontos de embarque".
              </p>
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
        </div>
        <div className="flex gap-2 mt-5">
          <button type="button" onClick={onClose} className="flex-1 h-11 rounded-xl bg-secondary font-semibold">Cancelar</button>
          <button disabled={saving || !form.nome} className="flex-1 h-11 rounded-xl bg-gradient-to-r from-neon-pink to-neon-purple text-primary-foreground font-bold disabled:opacity-50">
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
