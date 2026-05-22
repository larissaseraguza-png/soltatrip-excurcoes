import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Plus, Loader2, Trash2, QrCode, UserCheck, UserX, Search } from "lucide-react";
import { useState } from "react";

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
};

function PassageirosPage() {
  const { id } = useParams({ from: "/app/excursao/$id/passageiros" });
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const { data: excursao } = useQuery({
    queryKey: ["excursao", id],
    queryFn: async () => {
      const { data } = await supabase.from("excursoes").select("titulo,total_vagas").eq("id", id).single();
      return data;
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["passageiros", id] }),
  });

  const statusMut = useMutation({
    mutationFn: async ({ pid, status }: { pid: string; status: string }) => {
      await supabase.from("passageiros").update({ status }).eq("id", pid);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["passageiros", id] }),
  });

  const filtered = passageiros.filter((p) =>
    p.nome.toLowerCase().includes(search.toLowerCase()) ||
    (p.telefone ?? "").includes(search)
  );

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

      <div className="relative mb-4">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome ou telefone"
          className="w-full h-11 pl-9 pr-3 rounded-xl bg-input border border-border text-sm"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">
          Nenhum passageiro {search ? "encontrado" : "ainda"}.
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((p) => (
            <li key={p.id} className="glass rounded-2xl p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-neon-purple to-neon-pink flex items-center justify-center font-black text-sm">
                {p.nome.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{p.nome}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {p.telefone ?? "sem telefone"} • {p.assento ? `Assento ${p.assento}` : "sem assento"}
                </p>
              </div>
              <StatusPill status={p.status} />
              <div className="flex items-center gap-1">
                {p.status !== "confirmado" && (
                  <button
                    title="Confirmar"
                    onClick={() => statusMut.mutate({ pid: p.id, status: "confirmado" })}
                    className="h-8 w-8 rounded-lg bg-neon-green/10 text-neon-green hover:bg-neon-green/20 flex items-center justify-center"
                  >
                    <UserCheck className="h-4 w-4" />
                  </button>
                )}
                <Link
                  title="QR"
                  to="/app/excursao/$id/passageiros"
                  params={{ id }}
                  className="h-8 w-8 rounded-lg bg-secondary text-foreground hover:bg-secondary/80 flex items-center justify-center"
                  onClick={(e) => {
                    e.preventDefault();
                    navigator.clipboard.writeText(p.qr_code);
                    alert(`Código QR copiado: ${p.qr_code}`);
                  }}
                >
                  <QrCode className="h-4 w-4" />
                </Link>
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

      {open && <NewPassageiroModal excursaoId={id} onClose={() => setOpen(false)} />}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    pendente: "bg-yellow-500/10 text-yellow-400",
    confirmado: "bg-neon-green/10 text-neon-green",
    embarcado: "bg-neon-purple/15 text-neon-purple",
    cancelado: "bg-red-500/10 text-red-400",
  };
  return (
    <span className={`hidden sm:inline-flex text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full ${map[status] ?? "bg-secondary"}`}>
      {status}
    </span>
  );
}

function NewPassageiroModal({ excursaoId, onClose }: { excursaoId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ nome: "", telefone: "", documento: "", assento: "" });
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
    });
    setSaving(false);
    if (error) { alert(error.message); return; }
    qc.invalidateQueries({ queryKey: ["passageiros", excursaoId] });
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
