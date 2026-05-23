import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ArrowLeft, Loader2, AlertCircle, Plus, Trash2, MapPin, ImagePlus, X } from "lucide-react";

export const Route = createFileRoute("/app/excursao/nova")({
  component: NovaExcursao,
});

type Ponto = {
  nome: string;
  endereco: string;
  horario: string;
  referencia: string;
};

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
    preco: "",
    total_vagas: "",
    cor: "#a855f7",
  });
  const [pontos, setPontos] = useState<Ponto[]>([
    { nome: "", endereco: "", horario: "", referencia: "" },
  ]);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleBannerChange(f: File | null) {
    setBannerFile(f);
    if (bannerPreview) URL.revokeObjectURL(bannerPreview);
    setBannerPreview(f ? URL.createObjectURL(f) : null);
  }

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function updatePonto(idx: number, patch: Partial<Ponto>) {
    setPontos((arr) => arr.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  }
  function addPonto() {
    setPontos((arr) => [...arr, { nome: "", endereco: "", horario: "", referencia: "" }]);
  }
  function removePonto(idx: number) {
    setPontos((arr) => (arr.length === 1 ? arr : arr.filter((_, i) => i !== idx)));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setBusy(true);
    try {
      const validPontos = pontos
        .map((p) => ({
          nome: p.nome.trim(),
          endereco: p.endereco.trim(),
          horario: p.horario.trim(),
          referencia: p.referencia.trim(),
        }))
        .filter((p) => p.nome.length > 0);

      if (validPontos.length === 0) {
        throw new Error("Adicione pelo menos um ponto de embarque.");
      }

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
          ponto_embarque: null,
          preco: Number(form.preco) || 0,
          total_vagas: Number(form.total_vagas) || 0,
          cor: form.cor,
          status: "publicada",
        })
        .select("id")
        .single();
      if (error) throw error;

      // Upload do banner (se houver) e update da excursão
      if (bannerFile) {
        try {
          const ext = bannerFile.name.split(".").pop() || "jpg";
          const path = `${user.id}/${data.id}-${Date.now()}.${ext}`;
          const { error: upErr } = await supabase.storage
            .from("excursao-banners")
            .upload(path, bannerFile, { upsert: true, cacheControl: "3600" });
          if (!upErr) {
            const { data: pub } = supabase.storage.from("excursao-banners").getPublicUrl(path);
            await supabase.from("excursoes").update({ banner_url: pub.publicUrl }).eq("id", data.id);
          }
        } catch {
          // ignora falha de upload, excursão já foi criada
        }
      }

      const rows = validPontos.map((p, i) => ({
        excursao_id: data.id,
        nome: p.nome,
        endereco: p.endereco || null,
        horario: p.horario || null,
        referencia: p.referencia || null,
        ordem: i,
      }));
      const { error: pErr } = await supabase.from("pontos_embarque").insert(rows);
      if (pErr) throw pErr;

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

        <div className="grid grid-cols-2 gap-3">
          <Field label="Preço (R$)" type="number" required value={form.preco} onChange={(v) => set("preco", v)} placeholder="350" />
          <Field label="Total de vagas" type="number" required value={form.total_vagas} onChange={(v) => set("total_vagas", v)} placeholder="46" />
        </div>

        {/* Pontos de embarque (lista dinâmica) */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-sm font-bold">Pontos de embarque</p>
              <p className="text-xs text-muted-foreground">O passageiro escolherá um na reserva.</p>
            </div>
          </div>

          <div className="space-y-3">
            {pontos.map((p, idx) => (
              <div key={idx} className="rounded-2xl border border-border bg-background/40 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-neon-pink">
                    <MapPin className="h-3.5 w-3.5" /> Ponto {idx + 1}
                  </span>
                  {pontos.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePonto(idx)}
                      className="h-7 w-7 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center"
                      aria-label="Remover ponto"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-[1fr_110px] gap-2">
                  <input
                    placeholder="Nome do local *"
                    value={p.nome}
                    onChange={(e) => updatePonto(idx, { nome: e.target.value })}
                    className="h-10 px-3 rounded-xl bg-secondary/40 border border-border text-sm focus:border-primary focus:outline-none"
                  />
                  <input
                    type="time"
                    value={p.horario}
                    onChange={(e) => updatePonto(idx, { horario: e.target.value })}
                    className="h-10 px-2 rounded-xl bg-secondary/40 border border-border text-sm focus:border-primary focus:outline-none"
                  />
                </div>
                <input
                  placeholder="Endereço"
                  value={p.endereco}
                  onChange={(e) => updatePonto(idx, { endereco: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl bg-secondary/40 border border-border text-sm focus:border-primary focus:outline-none"
                />
                <input
                  placeholder="Referência (opcional)"
                  value={p.referencia}
                  onChange={(e) => updatePonto(idx, { referencia: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl bg-secondary/40 border border-border text-sm focus:border-primary focus:outline-none"
                />
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addPonto}
            className="mt-3 w-full h-11 rounded-xl border border-dashed border-border text-sm font-semibold flex items-center justify-center gap-1.5 hover:border-primary hover:text-primary transition"
          >
            <Plus className="h-4 w-4" /> Adicionar ponto de embarque
          </button>
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
