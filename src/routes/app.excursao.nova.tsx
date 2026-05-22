import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/app/excursao/nova")({
  component: NovaExcursao,
});

function NovaExcursao() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    titulo: "",
    destino: "",
    descricao: "",
    data_evento: "",
    horario_saida: "",
    horario_retorno: "",
    ponto_embarque: "",
    preco: "",
    total_vagas: "",
    cor: "#a855f7",
  });

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setBusy(true);
    try {
      const { data, error } = await supabase
        .from("excursoes")
        .insert({
          organizer_id: user.id,
          titulo: form.titulo.trim(),
          destino: form.destino.trim(),
          descricao: form.descricao.trim() || null,
          data_evento: form.data_evento,
          horario_saida: form.horario_saida || null,
          horario_retorno: form.horario_retorno || null,
          ponto_embarque: form.ponto_embarque.trim() || null,
          preco: Number(form.preco) || 0,
          total_vagas: Number(form.total_vagas) || 0,
          cor: form.cor,
          status: "publicada",
        })
        .select("id")
        .single();
      if (error) throw error;
      navigate({ to: "/app/excursao/$id", params: { id: data.id } });
    } catch (err: any) {
      setError(err.message ?? "Erro ao criar excursão");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Link to="/app" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <h1 className="font-display text-3xl font-bold mb-1">Nova excursão</h1>
      <p className="text-sm text-muted-foreground mb-6">Preencha os dados básicos. Você pode editar depois.</p>

      <form onSubmit={handleSubmit} className="glass rounded-3xl p-6 space-y-4">
        <Field label="Título" required value={form.titulo} onChange={(v) => set("titulo", v)} placeholder="Ex: Tomorrowland 2026" />
        <Field label="Destino" required value={form.destino} onChange={(v) => set("destino", v)} placeholder="Itu, SP" />
        <Field label="Descrição" textarea value={form.descricao} onChange={(v) => set("descricao", v)} placeholder="Detalhes da viagem (opcional)" />

        <div className="grid grid-cols-2 gap-3">
          <Field label="Data" type="date" required value={form.data_evento} onChange={(v) => set("data_evento", v)} />
          <Field label="Cor" type="color" value={form.cor} onChange={(v) => set("cor", v)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Saída" type="time" value={form.horario_saida} onChange={(v) => set("horario_saida", v)} />
          <Field label="Retorno" type="time" value={form.horario_retorno} onChange={(v) => set("horario_retorno", v)} />
        </div>
        <Field label="Ponto de embarque" value={form.ponto_embarque} onChange={(v) => set("ponto_embarque", v)} placeholder="Av. Paulista, 1578" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Preço (R$)" type="number" required value={form.preco} onChange={(v) => set("preco", v)} placeholder="350" />
          <Field label="Total de vagas" type="number" required value={form.total_vagas} onChange={(v) => set("total_vagas", v)} placeholder="46" />
        </div>

        {error && (
          <div className="flex items-start gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /> {error}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold glow-primary hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Criar excursão
        </button>
      </form>
    </div>
  );
}

function Field({
  label, value, onChange, type = "text", required, placeholder, textarea,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; required?: boolean; placeholder?: string; textarea?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground mb-1.5 block">{label}{required && " *"}</span>
      {textarea ? (
        <textarea
          required={required}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="w-full rounded-xl bg-secondary/40 border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 transition text-sm px-3 py-2.5 resize-none"
        />
      ) : (
        <input
          type={type}
          required={required}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-11 rounded-xl bg-secondary/40 border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 transition text-sm px-3"
        />
      )}
    </label>
  );
}
