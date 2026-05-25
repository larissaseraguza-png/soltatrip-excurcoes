import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Save, Upload, User as UserIcon, Phone, Mail, MapPin, Instagram, Globe, Building2, FileText, Bus, Users as UsersIcon, CalendarClock, DollarSign, Link2, Copy, Share2, ExternalLink, Check } from "lucide-react";

export const Route = createFileRoute("/app/perfil")({
  head: () => ({ meta: [{ title: "Meu perfil — SoltaTrip" }, { name: "robots", content: "noindex" }] }),
  component: Perfil,
});

type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  company_name: string | null;
  city: string | null;
  bio: string | null;
  instagram_url: string | null;
  website_url: string | null;
  slug: string | null;
};

function Perfil() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,full_name,phone,avatar_url,company_name,city,bio,instagram_url,website_url,slug")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as Profile | null;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["profile-stats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data: exs } = await supabase
        .from("excursoes")
        .select("id,data_evento,status")
        .eq("organizer_id", user!.id);
      const ids = (exs ?? []).map((e) => e.id);
      const total = exs?.length ?? 0;
      const futuras = (exs ?? []).filter((e) => e.data_evento >= today && e.status !== "encerrada").length;
      const realizadas = total - futuras;

      let pax = 0;
      let receita = 0;
      if (ids.length) {
        const { count } = await supabase
          .from("passageiros")
          .select("id", { count: "exact", head: true })
          .in("excursao_id", ids);
        pax = count ?? 0;
        const { data: pays } = await supabase
          .from("pagamentos")
          .select("valor,status")
          .in("excursao_id", ids)
          .eq("status", "confirmado");
        receita = (pays ?? []).reduce((s, p) => s + Number(p.valor || 0), 0);
      }
      return { total, futuras, realizadas, pax, receita };
    },
  });

  const [form, setForm] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (data) setForm(data);
    else if (user) setForm({
      id: user.id, full_name: "", phone: "", avatar_url: null,
      company_name: "", city: "", bio: "", instagram_url: "", website_url: "", slug: null,
    });
  }, [data, user]);

  async function uploadAvatar(file: File) {
    if (!user) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `avatars/${user.id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("excursao-banners").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("excursao-banners").getPublicUrl(path);
      setForm((f) => f ? { ...f, avatar_url: pub.publicUrl } : f);
      toast.success("Foto enviada");
    } catch (e: any) {
      toast.error(e.message ?? "Falha no upload");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!user || !form) return;
    setSaving(true);
    try {
      const cleanSlug = form.slug?.trim().toLowerCase() || null;
      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        full_name: form.full_name,
        phone: form.phone,
        avatar_url: form.avatar_url,
        company_name: form.company_name,
        city: form.city,
        bio: form.bio,
        instagram_url: form.instagram_url,
        website_url: form.website_url,
        slug: cleanSlug,
      });
      if (error) throw error;
      toast.success("Perfil salvo");
      qc.invalidateQueries({ queryKey: ["profile", user.id] });
    } catch (e: any) {
      const msg = e?.message ?? "";
      if (msg.includes("slug_invalid_length")) toast.error("Slug precisa ter entre 3 e 40 caracteres");
      else if (msg.includes("slug_invalid_format")) toast.error("Slug aceita apenas letras minúsculas, números, '-' e '_'");
      else if (msg.includes("slug_reserved")) toast.error("Esse slug é reservado, escolha outro");
      else if (msg.includes("duplicate") || msg.includes("unique")) toast.error("Esse link já está em uso");
      else toast.error(msg || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  const publicUrl = form?.slug
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/e/${form.slug}`
    : null;
  const [copied, setCopied] = useState(false);
  async function copyLink() {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      toast.success("Link copiado");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar");
    }
  }
  async function shareLink() {
    if (!publicUrl) return;
    const name = form?.company_name || form?.full_name || "Excursionista";
    if (navigator.share) {
      try {
        await navigator.share({ title: `${name} no SoltaTrip`, url: publicUrl });
      } catch {}
    } else {
      copyLink();
    }
  }

  if (isLoading || !form) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  const initials = (form.full_name || form.company_name || user?.email || "?").slice(0, 2).toUpperCase();

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold">Meu perfil</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Identidade profissional da sua operação.</p>
      </div>

      <div className="glass rounded-3xl p-5 mb-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="size-20 rounded-2xl overflow-hidden bg-gradient-to-br from-neon-purple to-neon-pink grid place-items-center text-primary-foreground font-display font-black text-2xl">
              {form.avatar_url ? (
                <img src={form.avatar_url} alt="" className="size-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <label className="absolute -bottom-1 -right-1 size-8 rounded-full bg-primary text-primary-foreground grid place-items-center cursor-pointer glow-primary">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])}
              />
            </label>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display text-xl font-bold truncate">{form.full_name || "Sem nome"}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" /> {user?.email}</p>
            {form.company_name && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><Building2 className="h-3 w-3" /> {form.company_name}</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <StatCard icon={Bus} label="Excursões realizadas" value={String(stats?.realizadas ?? 0)} hint={`${stats?.total ?? 0} no total`} />
        <StatCard icon={CalendarClock} label="Próximas excursões" value={String(stats?.futuras ?? 0)} hint="agendadas" />
        <StatCard icon={UsersIcon} label="Passageiros" value={String(stats?.pax ?? 0)} hint="transportados" />
        <StatCard icon={DollarSign} label="Receita total" value={`R$ ${Number(stats?.receita ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`} hint="pagamentos confirmados" />
      </div>

      <div className="glass rounded-3xl p-5 mb-4 relative overflow-hidden">
        <div className="absolute -top-16 -right-16 size-40 rounded-full bg-neon-purple/20 blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <Link2 className="h-4 w-4 text-neon-pink" />
            <h3 className="font-display font-bold text-sm uppercase tracking-wider">Meu link de divulgação</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Compartilhe sua página pública. Apenas suas excursões aparecem para quem entrar pelo seu link.
          </p>

          <label className="block">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Seu slug</span>
            <div className="mt-1 flex items-stretch rounded-xl bg-input border border-border focus-within:border-neon-pink overflow-hidden">
              <span className="px-3 grid place-items-center text-xs text-muted-foreground bg-background/40 border-r border-border">
                soltatrip.app/e/
              </span>
              <input
                value={form.slug ?? ""}
                onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "") })}
                placeholder="seu-nome"
                maxLength={40}
                className="flex-1 px-3 h-11 text-sm outline-none bg-transparent"
              />
            </div>
            <span className="text-[10px] text-muted-foreground">
              3-40 caracteres. Letras minúsculas, números, "-" e "_".
            </span>
          </label>

          {publicUrl && (
            <>
              <div className="mt-3 rounded-xl border border-border bg-background/40 px-3 py-2.5 text-xs font-mono break-all">
                {publicUrl}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <button
                  onClick={copyLink}
                  className="h-10 rounded-xl border border-border bg-card text-xs font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-secondary transition"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-neon-green" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copiado" : "Copiar"}
                </button>
                <button
                  onClick={shareLink}
                  className="h-10 rounded-xl border border-border bg-card text-xs font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-secondary transition"
                >
                  <Share2 className="h-3.5 w-3.5" /> Compartilhar
                </button>
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="h-10 rounded-xl bg-primary text-primary-foreground text-xs font-semibold inline-flex items-center justify-center gap-1.5 glow-primary hover:opacity-90 transition"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Abrir
                </a>
              </div>
              <p className="mt-3 text-[10px] text-muted-foreground">
                QR Code em breve.
              </p>
            </>
          )}
          {!publicUrl && (
            <p className="mt-3 text-xs text-muted-foreground">
              Defina um slug e clique em <strong>Salvar perfil</strong> para gerar seu link.
            </p>
          )}
        </div>
      </div>

      <Section title="Dados pessoais">

        <Field icon={UserIcon} label="Nome completo" value={form.full_name ?? ""} onChange={(v) => setForm({ ...form, full_name: v })} />
        <Field icon={Phone} label="Telefone" value={form.phone ?? ""} onChange={(v) => setForm({ ...form, phone: v })} placeholder="(11) 99999-9999" />
        <Field icon={MapPin} label="Cidade/Região" value={form.city ?? ""} onChange={(v) => setForm({ ...form, city: v })} placeholder="São Paulo, SP" />
      </Section>

      <Section title="Empresa/Marca">
        <Field icon={Building2} label="Nome do excursionista ou empresa" value={form.company_name ?? ""} onChange={(v) => setForm({ ...form, company_name: v })} placeholder="Ex.: Trip Brasil" />
        <label className="block">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1"><FileText className="h-3 w-3" /> Descrição curta</span>
          <textarea
            value={form.bio ?? ""}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            placeholder="Conte rapidamente sobre você e suas viagens"
            maxLength={280}
            className="mt-1 w-full bg-input rounded-xl px-4 py-3 text-sm outline-none border border-border focus:border-neon-pink min-h-24"
          />
          <span className="text-[10px] text-muted-foreground">{(form.bio ?? "").length}/280</span>
        </label>
      </Section>

      <Section title="Redes sociais (opcional)">
        <Field icon={Instagram} label="Instagram" value={form.instagram_url ?? ""} onChange={(v) => setForm({ ...form, instagram_url: v })} placeholder="https://instagram.com/seu-perfil" />
        <Field icon={Globe} label="Site / Linktree" value={form.website_url ?? ""} onChange={(v) => setForm({ ...form, website_url: v })} placeholder="https://seu-site.com" />
      </Section>

      <button
        onClick={save}
        disabled={saving}
        className="w-full h-12 rounded-2xl bg-gradient-to-r from-neon-purple to-neon-pink text-primary-foreground font-bold glow-primary flex items-center justify-center gap-2 disabled:opacity-60"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Salvar perfil
      </button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-3xl p-5 mb-4">
      <h3 className="font-display font-bold text-sm uppercase tracking-wider text-muted-foreground mb-4">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ icon: Icon, label, value, onChange, placeholder }: { icon: typeof UserIcon; label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
        <Icon className="h-3 w-3" /> {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full bg-input rounded-xl px-4 h-11 text-sm outline-none border border-border focus:border-neon-pink"
      />
    </label>
  );
}

function StatCard({ icon: Icon, label, value, hint }: { icon: typeof UserIcon; label: string; value: string; hint?: string }) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-[10px] uppercase tracking-wider font-semibold">{label}</span>
      </div>
      <p className="font-display text-2xl font-black mt-1">{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  );
}
