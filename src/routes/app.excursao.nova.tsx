import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ArrowLeft, Loader2, AlertCircle, ImagePlus, X } from "lucide-react";
import { BannerCropper } from "@/components/BannerCropper";

export const Route = createFileRoute("/app/excursao/nova")({
  component: NovaExcursao,
});

const ESTADOS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR",
  "PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

type FieldErrors = {
  titulo?: string;
  destino?: string;
  estado?: string;
  data_evento?: string;
  data_fim?: string;
  preco?: string;
  banner?: string;
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
    estado: "",
    descricao: "",
    data_evento: "",
    data_fim: "",
    preco: "",
    cor: "#a855f7",
  });
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  function setCroppedBanner(blob: Blob | null) {
    if (bannerPreview) URL.revokeObjectURL(bannerPreview);
    if (!blob) {
      setBannerFile(null);
      setBannerPreview(null);
      return;
    }
    const f = new File([blob], `capa-${Date.now()}.jpg`, { type: "image/jpeg" });
    setBannerFile(f);
    setBannerPreview(URL.createObjectURL(f));
  }

  function pickFile(f: File | null) {
    if (!f) return;
    setPendingFile(f);
  }

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const errors: FieldErrors = useMemo(() => {
    const e: FieldErrors = {};
    if (!form.titulo.trim()) e.titulo = "Informe o nome da festa";
    if (!form.destino.trim()) e.destino = "Informe a cidade";
    if (!form.estado.trim()) e.estado = "Selecione o estado";
    if (!form.data_evento) e.data_evento = "Selecione a data de início";
    if (form.data_fim && form.data_evento && form.data_fim < form.data_evento) {
      e.data_fim = "Término não pode ser antes do início";
    }
    const preco = Number(form.preco);
    if (!form.preco || isNaN(preco) || preco <= 0) e.preco = "Informe um valor válido";
    if (!bannerFile) e.banner = "Envie uma imagem de capa";
    return e;
  }, [form, bannerFile]);

  const isValid = Object.keys(errors).length === 0;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError(null);
    if (!isValid) {
      setShowErrors(true);
      setError("Preencha todos os campos obrigatórios.");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase
        .from("excursoes")
        .insert({
          organizer_id: user.id,
          titulo: form.titulo.trim(),
          destino: form.destino.trim(),
          estado: form.estado || null,
          descricao: form.descricao.trim() || null,
          data_evento: form.data_evento,
          data_fim: form.data_fim || null,
          preco: Number(form.preco) || 0,
          total_vagas: 0,
          cor: form.cor,
          status: "publicada",
        })
        .select("id")
        .single();
      if (error) throw error;

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
          // banner é opcional na prática; festa já foi criada
        }
      }

      navigate({ to: "/app/excursao/$id", params: { id: data.id } });
    } catch (err: any) {
      setError(err.message ?? "Erro ao criar festa");
    } finally {
      setBusy(false);
    }
  }

  const show = showErrors;

  return (
    <div>
      {pendingFile && (
        <BannerCropper
          file={pendingFile}
          onCancel={() => setPendingFile(null)}
          onConfirm={(blob) => { setCroppedBanner(blob); setPendingFile(null); }}
        />
      )}
      <Link to="/app" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <h1 className="font-display text-3xl font-bold mb-1">Nova festa</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Cadastre apenas o evento. Os ônibus e embarques são configurados depois.
      </p>

      <form onSubmit={handleSubmit} noValidate className="glass rounded-3xl p-6 space-y-4">
        {/* Banner */}
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
                <span className="text-[10px] leading-tight">1600×900 px • 16:9 • JPG ou PNG</span>
              </div>
            ) : (
              <>
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); if (bannerFile) setPendingFile(bannerFile); }}
                  className="absolute bottom-2 left-2 inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-background/80 backdrop-blur hover:bg-background"
                >
                  <ImagePlus className="h-3 w-3" /> Ajustar
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setCroppedBanner(null); }}
                  className="absolute top-2 right-2 h-9 w-9 rounded-full bg-background/80 backdrop-blur flex items-center justify-center"
                  aria-label="Remover imagem"
                >
                  <X className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
          {show && errors.banner && <p className="mt-1 text-xs text-red-400">{errors.banner}</p>}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { pickFile(e.target.files?.[0] ?? null); e.target.value = ""; }}
          />
        </div>

        <Field label="Nome da festa" required value={form.titulo} onChange={(v) => set("titulo", v)} placeholder="Ex: Tomorrowland 2026" error={show ? errors.titulo : undefined} />

        <div className="grid grid-cols-[1fr_100px] gap-3">
          <Field label="Cidade" required value={form.destino} onChange={(v) => set("destino", v)} placeholder="Itu" error={show ? errors.destino : undefined} />
          <label className="block">
            <span className="text-xs font-semibold text-muted-foreground mb-1.5 block">Estado *</span>
            <select
              value={form.estado}
              onChange={(e) => set("estado", e.target.value)}
              className={`w-full h-11 px-3 rounded-xl bg-secondary/40 border text-sm focus:outline-none focus:ring-2 ${show && errors.estado ? "border-red-500 focus:ring-red-500/30" : "border-border focus:border-primary focus:ring-primary/30"}`}
            >
              <option value="">UF</option>
              {ESTADOS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
            </select>
            {show && errors.estado && <p className="mt-1 text-xs text-red-400">{errors.estado}</p>}
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Início" type="date" required value={form.data_evento} onChange={(v) => set("data_evento", v)} error={show ? errors.data_evento : undefined} />
          <Field label="Término" type="date" value={form.data_fim} onChange={(v) => set("data_fim", v)} error={show ? errors.data_fim : undefined} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Preço por passageiro (R$)" type="number" required value={form.preco} onChange={(v) => set("preco", v)} placeholder="350" error={show ? errors.preco : undefined} />
          <Field label="Cor" type="color" value={form.cor} onChange={(v) => set("cor", v)} />
        </div>

        <Field label="Descrição (opcional)" textarea value={form.descricao} onChange={(v) => set("descricao", v)} placeholder="Detalhes do evento" />

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
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Criar festa
        </button>
        <p className="text-[11px] text-center text-muted-foreground">
          Após criar a festa, adicione ônibus e os embarques (rota) de cada ônibus.
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
          className={`w-full h-11 px-3 rounded-xl bg-secondary/40 border focus:outline-none focus:ring-2 transition text-sm ${errCls}`}
        />
      )}
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </label>
  );
}
