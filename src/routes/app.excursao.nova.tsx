import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState, type FormEvent } from "react";
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

type FieldErrors = {
  titulo?: string;
  destino?: string;
  descricao?: string;
  data_evento?: string;
  horario_saida?: string;
  horario_retorno?: string;
  preco?: string;
  total_vagas?: string;
  banner?: string;
  pontos?: string;
  pontosItems?: Array<{ nome?: string; endereco?: string; horario?: string }>;
};

function NovaExcursao() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);
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

  const errors: FieldErrors = useMemo(() => {
    const e: FieldErrors = {};
    if (!form.titulo.trim()) e.titulo = "Informe o nome da excursão";
    if (!form.destino.trim()) e.destino = "Informe a cidade/local";
    if (!form.descricao.trim()) e.descricao = "Adicione uma descrição";
    if (!form.data_evento) e.data_evento = "Selecione a data";
    if (!form.horario_saida) e.horario_saida = "Informe o horário de saída";
    if (!form.horario_retorno) e.horario_retorno = "Informe o horário de retorno";
    const preco = Number(form.preco);
    if (!form.preco || isNaN(preco) || preco <= 0) e.preco = "Informe um valor válido";
    const vagas = Number(form.total_vagas);
    if (!form.total_vagas || isNaN(vagas) || vagas <= 0)
      e.total_vagas = "Informe a quantidade de vagas (mínimo 1)";
    if (!bannerFile) e.banner = "Envie uma imagem de capa";

    const pontosItems = pontos.map((p) => {
      const item: { nome?: string; endereco?: string; horario?: string } = {};
      if (!p.nome.trim()) item.nome = "Nome obrigatório";
      if (!p.endereco.trim()) item.endereco = "Endereço obrigatório";
      if (!p.horario.trim()) item.horario = "Horário obrigatório";
      return item;
    });
    const hasPontoErr = pontosItems.some((it) => Object.keys(it).length > 0);
    if (pontos.length === 0) e.pontos = "Adicione pelo menos um ponto de embarque";
    if (hasPontoErr) e.pontosItems = pontosItems;
    return e;
  }, [form, pontos, bannerFile]);

  const isValid = Object.keys(errors).length === 0;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError(null);
    if (!isValid) {
      setShowErrors(true);
      setError("Preencha todos os campos obrigatórios antes de publicar.");
      return;
    }
    setBusy(true);
    try {
      const validPontos = pontos.map((p) => ({
        nome: p.nome.trim(),
        endereco: p.endereco.trim(),
        horario: p.horario.trim(),
        referencia: p.referencia.trim(),
      }));

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

  const show = showErrors;

  return (
    <div>
      <Link to="/app" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <h1 className="font-display text-3xl font-bold mb-1">Nova excursão</h1>
      <p className="text-sm text-muted-foreground mb-6">Todos os campos marcados com * são obrigatórios para publicar.</p>

      <form onSubmit={handleSubmit} noValidate className="glass rounded-3xl p-6 space-y-4">
        {/* Banner upload */}
        <div>
          <span className="text-xs font-semibold text-muted-foreground mb-1.5 block">Imagem de capa *</span>
          <div
            className={`relative w-full aspect-[16/9] rounded-2xl overflow-hidden border border-dashed bg-secondary/30 cursor-pointer hover:border-primary transition ${show && errors.banner ? "border-red-500" : "border-border"}`}
            style={
              bannerPreview
                ? { backgroundImage: `url(${bannerPreview})`, backgroundSize: "cover", backgroundPosition: "center" }
                : undefined
            }
            onClick={() => fileRef.current?.click()}
          >
            {!bannerPreview ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground gap-1.5 px-4 text-center">
                <ImagePlus className="h-6 w-6" />
                <span className="text-xs font-semibold">Toque para enviar imagem</span>
                <span className="text-[10px] leading-tight">Recomendado: 1600×900 px • Proporção 16:9 • JPG ou PNG</span>
              </div>
            ) : (
              <>
                {/* Área segura: o que ficar dentro do retângulo central aparece em todos os aparelhos */}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="w-[88%] h-[78%] border border-white/60 border-dashed rounded-xl" />
                </div>
                <span className="pointer-events-none absolute bottom-2 left-2 text-[10px] font-semibold text-white bg-black/60 px-2 py-0.5 rounded-full backdrop-blur">
                  Área segura
                </span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleBannerChange(null); }}
                  className="absolute top-2 right-2 h-9 w-9 rounded-full bg-background/80 backdrop-blur flex items-center justify-center"
                  aria-label="Remover imagem"
                >
                  <X className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground leading-tight">
            Use imagem horizontal 16:9 (ex: 1600×900). Mantenha o conteúdo principal centralizado para não ser cortado em Android e iPhone.
          </p>
          {show && errors.banner && <p className="mt-1 text-xs text-red-400">{errors.banner}</p>}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleBannerChange(e.target.files?.[0] ?? null)}
          />
        </div>

        <Field label="Nome da festa/excursão" required value={form.titulo} onChange={(v) => set("titulo", v)} placeholder="Ex: Tomorrowland 2026" error={show ? errors.titulo : undefined} />
        <Field label="Cidade/Local" required value={form.destino} onChange={(v) => set("destino", v)} placeholder="Itu, SP" error={show ? errors.destino : undefined} />
        <Field label="Descrição" required textarea value={form.descricao} onChange={(v) => set("descricao", v)} placeholder="Detalhes da viagem" error={show ? errors.descricao : undefined} />

        <div className="grid grid-cols-2 gap-3">
          <Field label="Data" type="date" required value={form.data_evento} onChange={(v) => set("data_evento", v)} error={show ? errors.data_evento : undefined} />
          <Field label="Cor" type="color" value={form.cor} onChange={(v) => set("cor", v)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Saída" type="time" required value={form.horario_saida} onChange={(v) => set("horario_saida", v)} error={show ? errors.horario_saida : undefined} />
          <Field label="Retorno" type="time" required value={form.horario_retorno} onChange={(v) => set("horario_retorno", v)} error={show ? errors.horario_retorno : undefined} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Preço (R$)" type="number" required value={form.preco} onChange={(v) => set("preco", v)} placeholder="350" error={show ? errors.preco : undefined} />
          <Field label="Total de vagas" type="number" required value={form.total_vagas} onChange={(v) => set("total_vagas", v)} placeholder="46" error={show ? errors.total_vagas : undefined} />
        </div>

        {/* Pontos de embarque (lista dinâmica) */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-sm font-bold">Pontos de embarque *</p>
              <p className="text-xs text-muted-foreground">O passageiro escolherá um na reserva.</p>
            </div>
          </div>

          <div className="space-y-3">
            {pontos.map((p, idx) => {
              const itemErr = show ? errors.pontosItems?.[idx] : undefined;
              return (
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
                    <div>
                      <input
                        placeholder="Nome do local *"
                        value={p.nome}
                        onChange={(e) => updatePonto(idx, { nome: e.target.value })}
                        className={`w-full h-10 px-3 rounded-xl bg-secondary/40 border text-sm focus:border-primary focus:outline-none ${itemErr?.nome ? "border-red-500" : "border-border"}`}
                      />
                      {itemErr?.nome && <p className="mt-1 text-[11px] text-red-400">{itemErr.nome}</p>}
                    </div>
                    <div>
                      <input
                        type="time"
                        value={p.horario}
                        onChange={(e) => updatePonto(idx, { horario: e.target.value })}
                        className={`w-full h-10 px-2 rounded-xl bg-secondary/40 border text-sm focus:border-primary focus:outline-none ${itemErr?.horario ? "border-red-500" : "border-border"}`}
                      />
                      {itemErr?.horario && <p className="mt-1 text-[11px] text-red-400">{itemErr.horario}</p>}
                    </div>
                  </div>
                  <div>
                    <input
                      placeholder="Endereço *"
                      value={p.endereco}
                      onChange={(e) => updatePonto(idx, { endereco: e.target.value })}
                      className={`w-full h-10 px-3 rounded-xl bg-secondary/40 border text-sm focus:border-primary focus:outline-none ${itemErr?.endereco ? "border-red-500" : "border-border"}`}
                    />
                    {itemErr?.endereco && <p className="mt-1 text-[11px] text-red-400">{itemErr.endereco}</p>}
                  </div>
                  <input
                    placeholder="Referência (opcional)"
                    value={p.referencia}
                    onChange={(e) => updatePonto(idx, { referencia: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-secondary/40 border border-border text-sm focus:border-primary focus:outline-none"
                  />
                </div>
              );
            })}
          </div>

          {show && errors.pontos && <p className="mt-2 text-xs text-red-400">{errors.pontos}</p>}

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
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Publicar excursão
        </button>
        <p className="text-[11px] text-center text-muted-foreground">
          Você poderá adicionar ônibus e staff após criar a excursão.
        </p>
      </form>
    </div>
  );
}

function Field({
  label, value, onChange, type = "text", required, placeholder, textarea, error,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; required?: boolean; placeholder?: string; textarea?: boolean; error?: string;
}) {
  const errCls = error ? "border-red-500 focus:border-red-500 focus:ring-red-500/30" : "border-border focus:border-primary focus:ring-primary/30";
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground mb-1.5 block">{label}{required && " *"}</span>
      {textarea ? (
        <textarea
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className={`w-full rounded-xl bg-secondary/40 border focus:outline-none focus:ring-2 transition text-sm px-3 py-2.5 resize-none ${errCls}`}
        />
      ) : (
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full h-11 rounded-xl bg-secondary/40 border focus:outline-none focus:ring-2 transition text-sm px-3 ${errCls}`}
        />
      )}
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </label>
  );
}
