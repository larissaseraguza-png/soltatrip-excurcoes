import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Save, Upload, QrCode, Copy, Link2, Plus, Trash2, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/app/pagamentos-config")({
  head: () => ({ meta: [{ title: "Configurações de pagamento — SoltaTrip" }, { name: "robots", content: "noindex" }] }),
  component: PagamentosConfig,
});

type PaymentLink = { label: string; url: string; provider?: string };

type ProfileRow = {
  pix_key: string | null;
  pix_recipient: string | null;
  pix_qr_url: string | null;
  payment_links: PaymentLink[] | null;
};

const PROVIDER_PRESETS = [
  { label: "Mercado Pago", provider: "mercadopago" },
  { label: "PagSeguro", provider: "pagseguro" },
  { label: "InfinitePay", provider: "infinitepay" },
  { label: "Stripe", provider: "stripe" },
  { label: "Outro", provider: "outro" },
];

function PagamentosConfig() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["payment-config", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("pix_key,pix_recipient,pix_qr_url,payment_links")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as ProfileRow | null;
    },
  });

  const [pixKey, setPixKey] = useState("");
  const [pixRecipient, setPixRecipient] = useState("");
  const [pixQr, setPixQr] = useState<string | null>(null);
  const [links, setLinks] = useState<PaymentLink[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!data) return;
    setPixKey(data.pix_key ?? "");
    setPixRecipient(data.pix_recipient ?? "");
    setPixQr(data.pix_qr_url ?? null);
    setLinks(Array.isArray(data.payment_links) ? (data.payment_links as PaymentLink[]) : []);
  }, [data]);

  async function uploadQr(file: File) {
    if (!user) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `pix-qr/${user.id}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("excursao-banners").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: pub } = supabase.storage.from("excursao-banners").getPublicUrl(path);
      setPixQr(pub.publicUrl);
      toast.success("QR Code enviado");
    } catch (e: any) {
      toast.error(e.message ?? "Falha no upload");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!user) return;
    // basic validation
    const cleanLinks = links
      .map((l) => ({ label: (l.label ?? "").trim(), url: (l.url ?? "").trim(), provider: l.provider }))
      .filter((l) => l.label && l.url && /^https?:\/\//i.test(l.url));
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        pix_key: pixKey.trim() || null,
        pix_recipient: pixRecipient.trim() || null,
        pix_qr_url: pixQr,
        payment_links: cleanLinks,
      });
      if (error) throw error;
      toast.success("Configurações salvas");
      qc.invalidateQueries({ queryKey: ["payment-config", user.id] });
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold">Configurações de pagamento</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Configure suas próprias formas de recebimento. A plataforma não processa pagamentos nem retém valores.
        </p>
      </div>

      <div className="glass rounded-2xl p-4 mb-4 flex items-start gap-3 border border-neon-green/20">
        <ShieldCheck className="h-5 w-5 text-neon-green mt-0.5 shrink-0" />
        <p className="text-xs text-muted-foreground">
          Você recebe diretamente em sua conta. O passageiro vê o seu Pix ou link externo e confirma o pagamento.
          Você confirma manualmente no painel financeiro de cada excursão.
        </p>
      </div>

      {/* PIX */}
      <div className="glass rounded-3xl p-5 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <QrCode className="h-5 w-5 text-neon-green" />
          <h3 className="font-display font-bold">Pix</h3>
        </div>

        <label className="block mb-3">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Chave Pix</span>
          <input
            value={pixKey}
            onChange={(e) => setPixKey(e.target.value)}
            placeholder="CPF, e-mail, telefone ou chave aleatória"
            className="mt-1 w-full bg-input rounded-xl px-4 h-11 text-sm outline-none border border-border focus:border-neon-pink"
          />
        </label>

        <label className="block mb-3">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Nome do recebedor</span>
          <input
            value={pixRecipient}
            onChange={(e) => setPixRecipient(e.target.value)}
            placeholder="Nome que aparece no comprovante"
            className="mt-1 w-full bg-input rounded-xl px-4 h-11 text-sm outline-none border border-border focus:border-neon-pink"
          />
        </label>

        <div>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">QR Code (imagem)</span>
          <div className="mt-2 flex items-center gap-3">
            <div className="size-24 rounded-2xl bg-background/50 border border-border overflow-hidden grid place-items-center">
              {pixQr ? (
                <img src={pixQr} alt="QR Pix" className="size-full object-contain" />
              ) : (
                <QrCode className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <div className="flex flex-col gap-2">
              <label className="inline-flex items-center gap-2 px-3 h-10 rounded-xl bg-primary text-primary-foreground text-xs font-bold cursor-pointer glow-primary">
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                {pixQr ? "Trocar imagem" : "Enviar QR Code"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && uploadQr(e.target.files[0])}
                />
              </label>
              {pixQr && (
                <button
                  onClick={() => setPixQr(null)}
                  className="text-xs text-muted-foreground hover:text-destructive inline-flex items-center gap-1"
                >
                  <Trash2 className="h-3 w-3" /> Remover
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Links externos */}
      <div className="glass rounded-3xl p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-neon-pink" />
            <h3 className="font-display font-bold">Links de pagamento</h3>
          </div>
          <button
            onClick={() => setLinks([...links, { label: "", url: "", provider: "outro" }])}
            className="inline-flex items-center gap-1 px-3 h-9 rounded-xl bg-primary/20 text-primary text-xs font-bold"
          >
            <Plus className="h-3.5 w-3.5" /> Adicionar
          </button>
        </div>

        {links.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Adicione links externos (Mercado Pago, PagSeguro, InfinitePay, Stripe etc.) que o passageiro abrirá para pagar com cartão.
          </p>
        ) : (
          <div className="space-y-3">
            {links.map((l, i) => (
              <div key={i} className="rounded-2xl border border-border bg-background/30 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <select
                    value={l.provider ?? "outro"}
                    onChange={(e) => {
                      const provider = e.target.value;
                      const preset = PROVIDER_PRESETS.find((p) => p.provider === provider);
                      const next = [...links];
                      next[i] = { ...next[i], provider, label: l.label || preset?.label || "" };
                      setLinks(next);
                    }}
                    className="h-9 rounded-lg bg-input px-2 text-xs border border-border"
                  >
                    {PROVIDER_PRESETS.map((p) => (
                      <option key={p.provider} value={p.provider}>{p.label}</option>
                    ))}
                  </select>
                  <input
                    value={l.label}
                    onChange={(e) => {
                      const next = [...links];
                      next[i] = { ...next[i], label: e.target.value };
                      setLinks(next);
                    }}
                    placeholder="Nome do botão"
                    className="flex-1 h-9 rounded-lg bg-input px-3 text-xs border border-border"
                  />
                  <button
                    onClick={() => setLinks(links.filter((_, idx) => idx !== i))}
                    className="size-9 grid place-items-center rounded-lg bg-destructive/15 text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <input
                  value={l.url}
                  onChange={(e) => {
                    const next = [...links];
                    next[i] = { ...next[i], url: e.target.value };
                    setLinks(next);
                  }}
                  placeholder="https://..."
                  className="w-full h-10 rounded-lg bg-input px-3 text-sm border border-border"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="w-full h-12 rounded-2xl bg-gradient-to-r from-neon-purple to-neon-pink text-primary-foreground font-bold glow-primary flex items-center justify-center gap-2 disabled:opacity-60"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Salvar configurações
      </button>
    </div>
  );
}
