import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import { ArrowLeft, Calendar, MapPin, Clock, Users, DollarSign, Loader2, Trash2, ChevronRight, Wallet, QrCode, MapPinned, UserCog, Ban, ImagePlus, Bus, MessageCircle, Save, Ticket } from "lucide-react";

export const Route = createFileRoute("/app/excursao/$id/")({
  component: ExcursaoDetalhe,
});

function ExcursaoDetalhe() {
  const { id } = useParams({ from: "/app/excursao/$id/" });
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<null | "cancel" | "delete" | "upload">(null);

  const { data, isLoading } = useQuery({
    queryKey: ["excursao", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("excursoes")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  useRealtimeSync(
    `excursao-detail-${id}`,
    [{ table: "excursoes", filter: `id=eq.${id}` }],
    [["excursao", id], ["excursoes"], ["excursoes-publicadas"], ["minhas-reservas"]],
  );

  async function handleCancel() {
    if (!confirm("Cancelar essa excursão? Ela ficará marcada como 'cancelada' para todos os passageiros e não receberá novas reservas.")) return;
    setBusy("cancel");
    try {
      const { error } = await supabase
        .from("excursoes")
        .update({ status: "cancelada" })
        .eq("id", id);
      if (error) throw error;
      // Atualiza passageiros para 'cancelado'
      await supabase.from("passageiros").update({ status: "cancelado" }).eq("excursao_id", id);
      qc.invalidateQueries();
      alert("Excursão cancelada.");
    } catch (err: any) {
      alert(err.message ?? "Erro ao cancelar.");
    } finally {
      setBusy(null);
    }
  }

  async function handleDelete() {
    if (!confirm("EXCLUIR definitivamente esta excursão? Todos os dados (passageiros, reservas, pagamentos) serão removidos. Esta ação não pode ser desfeita.")) return;
    setBusy("delete");
    try {
      // Apaga dependentes (sem FK cascade)
      await supabase.from("checkins").delete().eq("excursao_id", id);
      await supabase.from("pagamentos").delete().eq("excursao_id", id);
      await supabase.from("seats").delete().eq("excursao_id", id);
      await supabase.from("pontos_embarque").delete().eq("excursao_id", id);
      await supabase.from("passageiros").delete().eq("excursao_id", id);
      await supabase.from("reservas").delete().eq("excursao_id", id);
      await supabase.from("equipe_excursoes").delete().eq("excursao_id", id);
      const { error } = await supabase.from("excursoes").delete().eq("id", id);
      if (error) throw error;
      qc.invalidateQueries();
      navigate({ to: "/app" });
    } catch (err: any) {
      alert(err.message ?? "Erro ao excluir.");
      setBusy(null);
    }
  }

  async function handleBannerUpload(file: File) {
    if (!user) return;
    setBusy("upload");
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("excursao-banners")
        .upload(path, file, { upsert: true, cacheControl: "3600" });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("excursao-banners").getPublicUrl(path);
      const { error: updErr } = await supabase
        .from("excursoes")
        .update({ banner_url: pub.publicUrl })
        .eq("id", id);
      if (updErr) throw updErr;
      qc.invalidateQueries({ queryKey: ["excursao", id] });
    } catch (err: any) {
      alert(err.message ?? "Erro ao enviar imagem.");
    } finally {
      setBusy(null);
    }
  }

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }
  if (!data) return <p className="text-center text-muted-foreground py-20">Excursão não encontrada.</p>;

  return (
    <div>
      <Link to="/app" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <div
        className="rounded-3xl overflow-hidden mb-6 h-48 relative glow-primary group"
        style={
          data.banner_url
            ? { backgroundImage: `url(${data.banner_url})`, backgroundSize: "cover", backgroundPosition: "center" }
            : { background: `linear-gradient(135deg, ${data.cor ?? "#a855f7"}, #ec4899)` }
        }
      >
        {!data.banner_url && <div className="absolute inset-0 grid-bg opacity-40" />}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy === "upload"}
          className="absolute top-3 right-3 inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-background/70 backdrop-blur hover:bg-background/90 transition disabled:opacity-50"
        >
          {busy === "upload" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
          {data.banner_url ? "Trocar capa" : "Adicionar capa"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleBannerUpload(f);
            e.target.value = "";
          }}
        />
        <div className="absolute bottom-4 left-5 right-5">
          <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-background/60 backdrop-blur">
            {data.status}
          </span>
          <h1 className="font-display text-2xl font-black mt-1 leading-tight drop-shadow-lg">{data.titulo}</h1>
          <p className="text-xs text-white/90 mt-0.5 drop-shadow">{data.destino} · {new Date(data.data_evento).toLocaleDateString("pt-BR")}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <Info icon={MapPin} label="Destino" value={data.destino} />
        <Info icon={Calendar} label="Data" value={new Date(data.data_evento).toLocaleDateString("pt-BR")} />
        <Info icon={Clock} label="Saída" value={data.horario_saida ?? "—"} />
        <Info icon={Clock} label="Retorno" value={data.horario_retorno ?? "—"} />
        <Info icon={Users} label="Vagas" value={data.total_vagas} />
        <Info icon={DollarSign} label="Preço" value={`R$ ${Number(data.preco).toFixed(2)}`} />
      </div>


      {data.descricao && (
        <div className="glass rounded-2xl p-4 mb-6">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-1">Sobre</p>
          <p className="text-sm">{data.descricao}</p>
        </div>
      )}

      <PontosSummary excursaoId={id} />

      <div className="space-y-2 mb-6">
        <NavCard to="/app/excursao/$id/onibus" id={id} icon={Bus} title="Ônibus" desc="Gerenciar múltiplos ônibus desta excursão" />
        <NavCard to="/app/excursao/$id/passageiros" id={id} icon={Users} title="Passageiros" desc="Cadastrar, confirmar e gerenciar a lista" />
        <NavCard to="/app/excursao/$id/pontos" id={id} icon={MapPinned} title="Pontos de embarque" desc="Definir locais e horários de embarque" />
        <NavCard to="/app/excursao/$id/financeiro" id={id} icon={Wallet} title="Financeiro" desc="Lançar pagamentos e acompanhar entradas" />
        <NavCard to="/app/excursao/$id/checkin" id={id} icon={QrCode} title="Check-in QR" desc="Embarcar passageiros com leitor de QR" />
        <NavCard to="/app/excursao/$id/equipe" id={id} icon={UserCog} title="Equipe / Staff" desc="Convidar e gerenciar staff desta excursão" />
      </div>

      <WhatsappLinks excursao={data} />


      <div className="grid grid-cols-2 gap-2">
        {data.status !== "cancelada" && (
          <button
            onClick={handleCancel}
            disabled={busy !== null}
            className="h-11 rounded-xl border border-yellow-500/30 text-yellow-400 font-semibold hover:bg-yellow-500/10 transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {busy === "cancel" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />} Cancelar
          </button>
        )}
        <button
          onClick={handleDelete}
          disabled={busy !== null}
          className={`h-11 rounded-xl border border-red-500/30 text-red-400 font-semibold hover:bg-red-500/10 transition flex items-center justify-center gap-2 disabled:opacity-50 ${data.status === "cancelada" ? "col-span-2" : ""}`}
        >
          {busy === "delete" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Excluir definitivamente
        </button>
      </div>
    </div>
  );
}

function Info({ icon: Icon, label, value }: { icon: any; label: string; value: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl p-3">
      <Icon className="h-4 w-4 text-neon-pink mb-1.5" />
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}

function NavCard({ to, id, icon: Icon, title, desc }: { to: string; id: string; icon: any; title: string; desc: string }) {
  return (
    <Link to={to} params={{ id }} className="glass rounded-2xl p-4 flex items-center gap-3 hover:border-neon-pink/40 transition border border-transparent">
      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-neon-purple to-neon-pink flex items-center justify-center">
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <p className="font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}

function PontosSummary({ excursaoId }: { excursaoId: string }) {
  const { data: pontos = [] } = useQuery({
    queryKey: ["pontos", excursaoId],
    queryFn: async () => {
      const { data } = await supabase
        .from("pontos_embarque")
        .select("id, nome, horario")
        .eq("excursao_id", excursaoId)
        .order("ordem", { ascending: true });
      return (data ?? []) as { id: string; nome: string; horario: string | null }[];
    },
  });
  const { data: counts = {} } = useQuery({
    queryKey: ["pontos-counts", excursaoId],
    queryFn: async () => {
      const { data } = await supabase
        .from("passageiros")
        .select("ponto_embarque_id")
        .eq("excursao_id", excursaoId);
      const map: Record<string, number> = {};
      (data ?? []).forEach((p: any) => {
        const k = p.ponto_embarque_id ?? "_sem";
        map[k] = (map[k] ?? 0) + 1;
      });
      return map;
    },
  });

  if (pontos.length === 0) return null;
  const semPonto = counts["_sem"] ?? 0;

  return (
    <div className="glass rounded-2xl p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Ocupação por ponto</p>
        <Link to="/app/excursao/$id/pontos" params={{ id: excursaoId }} className="text-xs font-bold text-neon-pink">Gerenciar</Link>
      </div>
      <ul className="space-y-1.5">
        {pontos.map((p) => (
          <li key={p.id} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 min-w-0">
              <MapPin className="h-3.5 w-3.5 text-neon-pink shrink-0" />
              <span className="truncate">{p.nome}</span>
              {p.horario && <span className="text-xs text-muted-foreground">{p.horario}</span>}
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-secondary">{counts[p.id] ?? 0}</span>
          </li>
        ))}
        {semPonto > 0 && (
          <li className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground italic">Sem ponto definido</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400">{semPonto}</span>
          </li>
        )}
      </ul>
    </div>
  );
}

function WhatsappLinks({ excursao }: { excursao: any }) {
  const qc = useQueryClient();
  const [pax, setPax] = useState(excursao.whatsapp_group_url ?? "");
  const [staff, setStaff] = useState(excursao.whatsapp_staff_group_url ?? "");
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState(false);

  async function save() {
    setSaving(true);
    setOk(false);
    try {
      const norm = (v: string) => {
        const t = v.trim();
        if (!t) return null;
        return /^https?:\/\//i.test(t) ? t : `https://${t}`;
      };
      const { error } = await supabase
        .from("excursoes")
        .update({ whatsapp_group_url: norm(pax), whatsapp_staff_group_url: norm(staff) })
        .eq("id", excursao.id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["excursao", excursao.id] });
      setOk(true);
      setTimeout(() => setOk(false), 2000);
    } catch (err: any) {
      alert(err.message ?? "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="glass rounded-2xl p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <MessageCircle className="h-4 w-4 text-neon-green" />
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Grupos de WhatsApp</p>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Toda comunicação acontece no WhatsApp. Cole abaixo o link de convite (chat.whatsapp.com/...).
      </p>
      <label className="block mb-3">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Grupo dos passageiros</span>
        <input
          value={pax}
          onChange={(e) => setPax(e.target.value)}
          placeholder="https://chat.whatsapp.com/..."
          className="mt-1 w-full h-10 px-3 rounded-xl bg-secondary/40 border border-border text-sm focus:border-primary focus:outline-none"
        />
      </label>
      <label className="block mb-3">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Grupo da staff</span>
        <input
          value={staff}
          onChange={(e) => setStaff(e.target.value)}
          placeholder="https://chat.whatsapp.com/..."
          className="mt-1 w-full h-10 px-3 rounded-xl bg-secondary/40 border border-border text-sm focus:border-primary focus:outline-none"
        />
      </label>
      <button
        onClick={save}
        disabled={saving}
        className="w-full h-10 rounded-xl bg-gradient-to-r from-neon-purple to-neon-pink font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {ok ? "Salvo!" : "Salvar links"}
      </button>
      <p className="text-[10px] text-muted-foreground mt-2">
        Para grupos específicos por ônibus, vá em <b>Ônibus</b> e edite cada um.
      </p>
    </div>
  );
}
