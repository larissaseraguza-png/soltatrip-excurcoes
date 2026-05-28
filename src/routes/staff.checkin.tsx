import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { StaffShell } from "@/components/staff/Shell";
import { FestaSelectorBanner, NoFestaSelected } from "@/components/staff/FestaSelector";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useStaffExcursao } from "@/hooks/use-staff-excursao";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import { CheckCircle2, XCircle, UserCheck, Loader2, Search, Camera, X, AlertTriangle, Bus, RotateCcw } from "lucide-react";
import { notify } from "@/lib/notifications/emit";

export const Route = createFileRoute("/staff/checkin")({
  component: CheckinStaff,
});

type Passageiro = {
  id: string;
  nome: string;
  assento: string | null;
  seat_id: string | null;
  qr_code: string;
  embarcado_em: string | null;
  status: string;
  payment_status: string;
  ponto_embarque_id: string | null;
  ponto?: { nome: string | null; horario: string | null } | null;
};

function CheckinStaff() {
  const { user } = useAuth();
  const { excursao, onibusId, onibus, loading } = useStaffExcursao();
  const qc = useQueryClient();
  const [code, setCode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const lastScanRef = useRef<{ code: string; at: number }>({ code: "", at: 0 });

  const { data: passageiros = [] } = useQuery({
    queryKey: ["staff-checkin-pax", excursao?.id, onibusId],
    enabled: !!excursao?.id,
    queryFn: async () => {
      let q = supabase
        .from("passageiros")
        .select("id,nome,assento,seat_id,qr_code,embarcado_em,status,payment_status,ponto_embarque_id,onibus_id,ponto:pontos_embarque(nome,horario)")
        .eq("excursao_id", excursao!.id)
        .order("embarcado_em", { ascending: false, nullsFirst: false });
      if (onibusId) q = q.eq("onibus_id", onibusId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as Passageiro[];
    },
  });

  const { data: checkins = [] } = useQuery({
    queryKey: ["staff-checkins", excursao?.id, onibusId],
    enabled: !!excursao?.id,
    queryFn: async () => {
      let q = supabase
        .from("checkins")
        .select("id,passageiro_id,created_at,onibus_id")
        .eq("excursao_id", excursao!.id)
        .order("created_at", { ascending: false })
        .limit(30);
      if (onibusId) q = q.eq("onibus_id", onibusId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  useRealtimeSync(
    `staff-checkin-${excursao?.id ?? "none"}-${onibusId ?? "all"}`,
    excursao?.id
      ? [
          { table: "passageiros", filter: `excursao_id=eq.${excursao.id}` },
          { table: "checkins", filter: `excursao_id=eq.${excursao.id}` },
        ]
      : [],
    [
      ["staff-checkin-pax", excursao?.id, onibusId],
      ["staff-checkins", excursao?.id, onibusId],
    ],
  );


  const paxById = useMemo(() => new Map(passageiros.map((p) => [p.id, p])), [passageiros]);
  const embarcados = passageiros.filter((p) => !!p.embarcado_em);
  const aguardando = passageiros.filter((p) => !p.embarcado_em);

  function showFeedback(ok: boolean, msg: string) {
    setFeedback({ ok, msg });
    setTimeout(() => setFeedback(null), 2800);
  }

  async function realizarCheckin(passageiroId: string, viaQr = false) {
    if (!excursao || !user) return;
    const pax = paxById.get(passageiroId);
    if (!pax) {
      showFeedback(false, "Passageiro não encontrado.");
      return;
    }
    if (onibusId && (pax as any).onibus_id && (pax as any).onibus_id !== onibusId) {
      showFeedback(false, `${pax.nome} é de outro ônibus.`);
      return;
    }
    if (pax.embarcado_em) {
      showFeedback(false, `${pax.nome} já embarcou — QR Code já utilizado.`);
      toast.message(`${pax.nome} já embarcou.`);
      return;
    }
    const now = new Date().toISOString();
    const { error: e1 } = await supabase
      .from("passageiros")
      .update({ embarcado_em: now, status: "embarcado" })
      .eq("id", passageiroId);
    if (e1) {
      showFeedback(false, e1.message);
      return;
    }
    const { error: e2 } = await supabase.from("checkins").insert({
      excursao_id: excursao.id,
      passageiro_id: passageiroId,
      feito_por: user.id,
      onibus_id: (pax as any).onibus_id ?? onibusId ?? null,
    });
    if (e2) {
      showFeedback(false, e2.message);
      return;
    }
    showFeedback(true, `${pax.nome} embarcou! ${viaQr ? "(QR)" : ""}`);
    toast.success(`Check-in: ${pax.nome}`);
    notify.staff.checkinFeito(pax.nome, { link: "/staff/checkin" });
    notify.excursionista.checkinFeito(pax.nome, { link: `/app/excursao/${excursao.id}/checkin` });
    qc.invalidateQueries({ queryKey: ["staff-checkin-pax", excursao.id, onibusId] });
    qc.invalidateQueries({ queryKey: ["staff-checkins", excursao.id, onibusId] });
  }

  async function desembarcar(passageiroId: string) {
    if (!excursao) return;
    const pax = paxById.get(passageiroId);
    if (!pax) return;
    if (!confirm(`Remover embarque de ${pax.nome}? O passageiro poderá embarcar novamente.`)) return;
    // Status volta para 'confirmado' (se houver pagamento) ou 'pendente'.
    const novoStatus = pax.payment_status === "paid" ? "confirmado" : "pendente";
    const { error } = await supabase
      .from("passageiros")
      .update({ embarcado_em: null, status: novoStatus })
      .eq("id", passageiroId);
    if (error) {
      showFeedback(false, error.message);
      return;
    }
    showFeedback(true, `Embarque de ${pax.nome} removido.`);
    toast.success(`${pax.nome} foi desembarcado.`);
    notify.staff.desembarqueFeito(pax.nome, { link: "/staff/checkin" });
    qc.invalidateQueries({ queryKey: ["staff-checkin-pax", excursao.id, onibusId] });
    qc.invalidateQueries({ queryKey: ["staff-checkins", excursao.id, onibusId] });
  }


  async function handleQrResult(decoded: string) {
    const clean = decoded.trim();
    // debounce: ignora leituras duplicadas em 3s
    const now = Date.now();
    if (lastScanRef.current.code === clean && now - lastScanRef.current.at < 3000) return;
    lastScanRef.current = { code: clean, at: now };

    const alvo = passageiros.find((p) => p.qr_code === clean || p.id === clean);
    if (!alvo) {
      showFeedback(false, "QR Code não reconhecido nesta excursão.");
      return;
    }
    await realizarCheckin(alvo.id, true);
  }

  async function buscarECheckin(e: React.FormEvent) {
    e.preventDefault();
    const q = code.trim();
    if (!q) return;
    const alvo = passageiros.find(
      (p) =>
        p.qr_code === q ||
        p.id === q ||
        (p.assento && p.assento.toLowerCase() === q.toLowerCase()) ||
        p.nome.toLowerCase().includes(q.toLowerCase()),
    );
    if (!alvo) {
      showFeedback(false, "Passageiro não encontrado.");
      return;
    }
    setCode("");
    await realizarCheckin(alvo.id);
  }

  return (
    <StaffShell title="Embarque / Check-in" subtitle={excursao?.titulo ?? "Selecione uma festa"}>
      <FestaSelectorBanner />
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : !excursao ? (
        <NoFestaSelected />
      ) : (
        <>
          {onibus && (
            <div className="glass rounded-2xl p-3 mb-3 flex items-center gap-2 border border-neon-green/30 bg-neon-green/5">
              <Bus className="size-4 text-neon-green shrink-0" />
              <div className="text-xs">
                <span className="text-muted-foreground">Embarque do ônibus:</span>{" "}
                <span className="font-semibold">{onibus.nome}</span>
              </div>
            </div>
          )}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <Metric value={embarcados.length} label="Embarcados" tone="green" />
            <Metric value={aguardando.length} label="Pendentes" tone="yellow" />
            <Metric value={passageiros.length} label="Total" tone="purple" />
          </div>


          {!scanning ? (
            <button
              onClick={() => setScanning(true)}
              className="w-full h-14 mb-3 rounded-2xl bg-gradient-to-r from-neon-green to-neon-purple text-primary-foreground font-bold inline-flex items-center justify-center gap-2 glow-primary"
            >
              <Camera className="h-5 w-5" /> Escanear QR Code
            </button>
          ) : (
            <QrScanner onResult={handleQrResult} onClose={() => setScanning(false)} />
          )}

          <form onSubmit={buscarECheckin} className="glass rounded-2xl p-3 mb-4 flex items-center gap-2">
            <Search className="size-4 text-muted-foreground ml-2" />
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Check-in manual: nome / poltrona / QR"
              className="flex-1 bg-transparent outline-none text-sm"
            />
            <button className="h-9 px-3 rounded-xl bg-gradient-to-br from-neon-green to-neon-purple glow-primary text-primary-foreground text-xs font-bold inline-flex items-center gap-1.5">
              <UserCheck className="size-4" /> Confirmar
            </button>
          </form>

          {feedback && (
            <div className={`rounded-2xl p-3 mb-4 flex items-center gap-2 text-sm font-semibold ${feedback.ok ? "bg-neon-green/10 text-neon-green border border-neon-green/30" : "bg-red-500/10 text-red-400 border border-red-500/30"}`}>
              {feedback.ok ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
              <span>{feedback.msg}</span>
            </div>
          )}

          <section className="mb-5">
            <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Aguardando embarque</h3>
            {aguardando.length === 0 ? (
              <div className="glass rounded-2xl p-6 text-center text-xs text-muted-foreground">Todos embarcaram. 🎉</div>
            ) : (
              <div className="glass rounded-2xl divide-y divide-border/60">
                {aguardando.slice(0, 50).map((p) => (
                  <div key={p.id} className="p-3 flex items-center gap-3">
                    <XCircle className="size-5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">{p.nome}</div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        Poltrona {p.assento ?? "—"} · {p.ponto?.nome ?? "sem ponto"}{p.ponto?.horario ? ` · ${p.ponto.horario}` : ""}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {p.payment_status === "paid" ? "✓ pago" : p.payment_status === "partial_payment" ? "parcial" : "pgto pendente"}
                      </div>
                    </div>
                    <button
                      onClick={() => realizarCheckin(p.id)}
                      className="h-9 px-3 rounded-lg bg-gradient-to-r from-neon-green/30 to-neon-purple/20 text-neon-green text-[11px] font-bold inline-flex items-center gap-1 shrink-0"
                    >
                      <UserCheck className="size-3.5" /> Embarcar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Presentes no ônibus</h3>
            {embarcados.length === 0 ? (
              <div className="glass rounded-2xl p-6 text-center text-xs text-muted-foreground">Nenhum embarque ainda.</div>
            ) : (
              <div className="glass rounded-2xl divide-y divide-border/60">
                {embarcados.map((p) => (
                  <div key={p.id} className="p-3 flex items-center gap-3">
                    <CheckCircle2 className="size-5 text-neon-green shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">{p.nome}</div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        Poltrona {p.assento ?? "—"} · {p.ponto?.nome ?? "—"}
                      </div>
                    </div>
                    <span className="text-[10px] text-neon-green font-bold shrink-0">
                      {p.embarcado_em ? new Date(p.embarcado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : ""}
                    </span>
                    <button
                      onClick={() => desembarcar(p.id)}
                      className="h-8 px-2 rounded-lg border border-yellow-500/30 text-yellow-400 text-[10px] font-bold inline-flex items-center gap-1 shrink-0 hover:bg-yellow-500/10"
                      aria-label={`Remover embarque de ${p.nome}`}
                    >
                      <RotateCcw className="size-3" /> Desembarcar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {checkins.length > 0 && (
            <p className="text-[10px] text-muted-foreground text-center mt-4">
              {checkins.length} check-in(s) registrado(s) nesta sessão
            </p>
          )}
        </>
      )}
    </StaffShell>
  );
}

function Metric({ value, label, tone }: { value: number; label: string; tone: "green" | "yellow" | "purple" }) {
  const color = tone === "green" ? "text-neon-green" : tone === "yellow" ? "text-yellow-300" : "text-neon-purple";
  return (
    <div className="glass rounded-2xl p-3 text-center">
      <div className={`text-2xl font-display font-black ${color}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
    </div>
  );
}

function QrScanner({ onResult, onClose }: { onResult: (code: string) => void; onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let scanner: any;
    let cancelled = false;
    (async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;
        scanner = new Html5Qrcode("staff-qr-region");
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: 240 },
          (decoded: string) => {
            onResult(decoded);
          },
          () => {},
        );
      } catch (e: any) {
        setError(e?.message ?? "Não foi possível acessar a câmera. Verifique as permissões.");
      }
    })();
    return () => {
      cancelled = true;
      if (scanner) scanner.stop().catch(() => {});
    };
  }, [onResult]);

  return (
    <div className="mb-4 rounded-3xl overflow-hidden glass p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="font-bold text-sm">Aponte para o QR do passageiro</p>
        <button onClick={onClose} className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div id="staff-qr-region" className="rounded-2xl overflow-hidden bg-black aspect-square" />
      {error && (
        <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" /> {error}
        </p>
      )}
      <p className="text-[10px] text-muted-foreground mt-2 text-center">
        A câmera valida automaticamente. Use o check-in manual abaixo se falhar.
      </p>
    </div>
  );
}
