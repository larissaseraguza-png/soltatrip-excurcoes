import { createFileRoute, Link, useParams, useSearch } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, QrCode, Camera, CheckCircle2, X, Loader2, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { OnibusFilterBadge } from "@/components/OnibusFilterBadge";

export const Route = createFileRoute("/app/excursao/$id/checkin")({
  validateSearch: (search: Record<string, unknown>) => ({
    onibus: typeof search.onibus === "string" ? search.onibus : undefined,
  }),
  component: CheckinPage,
});

function CheckinPage() {
  const { id } = useParams({ from: "/app/excursao/$id/checkin" });
  const { onibus: onibusId } = useSearch({ from: "/app/excursao/$id/checkin" });
  const qc = useQueryClient();
  const [scanning, setScanning] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [search, setSearch] = useState("");

  const { data: excursao } = useQuery({
    queryKey: ["excursao", id],
    queryFn: async () => (await supabase.from("excursoes").select("titulo").eq("id", id).single()).data,
  });

  const { data: passageiros = [], isLoading } = useQuery({
    queryKey: ["passageiros-checkin", id, onibusId ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("passageiros")
        .select("id,nome,assento,status,qr_code,onibus_id")
        .eq("excursao_id", id);
      if (onibusId) q = q.eq("onibus_id", onibusId);
      const { data } = await q.order("nome");
      return data ?? [];
    },
  });

  async function processarQr(code: string) {
    const p = passageiros.find((x) => x.qr_code === code.trim());
    if (!p) {
      setFeedback({ ok: false, msg: onibusId ? "QR não pertence a este ônibus" : "Código não reconhecido" });
      return;
    }
    await embarcar(p.id, p.nome, (p as any).onibus_id ?? null);
  }

  async function embarcar(pid: string, nome: string, paxOnibusId: string | null) {
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("checkins").insert({
      excursao_id: id,
      onibus_id: onibusId ?? paxOnibusId,
      passageiro_id: pid,
      feito_por: userData.user?.id ?? null,
    });
    if (error) { setFeedback({ ok: false, msg: error.message }); return; }
    await supabase
      .from("passageiros")
      .update({ status: "embarcado", embarcado_em: new Date().toISOString() })
      .eq("id", pid);
    setFeedback({ ok: true, msg: `${nome} embarcou!` });
    qc.invalidateQueries({ queryKey: ["passageiros-checkin", id, onibusId ?? "all"] });
    setTimeout(() => setFeedback(null), 2500);
  }

  const embarcados = passageiros.filter((p) => p.status === "embarcado").length;
  const filtered = passageiros.filter((p) => p.nome.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <Link to="/app/excursao/$id" params={{ id }} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <div className="mb-5">
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold">{excursao?.titulo ?? "Excursão"}</p>
        <h1 className="font-display text-2xl font-black">Check-in</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {embarcados} de {passageiros.length} embarcados
        </p>
      </div>

      <OnibusFilterBadge excursaoId={id} onibusId={onibusId} />

      {!scanning ? (
        <button
          onClick={() => setScanning(true)}
          className="w-full h-14 mb-4 rounded-2xl bg-gradient-to-r from-neon-pink to-neon-purple text-primary-foreground font-bold inline-flex items-center justify-center gap-2 glow-primary"
        >
          <Camera className="h-5 w-5" /> Escanear QR
        </button>
      ) : (
        <QrScanner onResult={processarQr} onClose={() => setScanning(false)} />
      )}

      {feedback && (
        <div className={`rounded-2xl p-4 mb-4 flex items-center gap-2 ${feedback.ok ? "bg-neon-green/10 text-neon-green" : "bg-red-500/10 text-red-400"}`}>
          {feedback.ok ? <CheckCircle2 className="h-5 w-5" /> : <X className="h-5 w-5" />}
          <span className="font-semibold text-sm">{feedback.msg}</span>
        </div>
      )}

      <div className="relative mb-3">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar passageiro para embarque manual"
          className="w-full h-11 pl-9 pr-3 rounded-xl bg-input border border-border text-sm"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((p: any) => (
            <li key={p.id} className="glass rounded-2xl p-3 flex items-center gap-3">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${p.status === "embarcado" ? "bg-neon-green/20 text-neon-green" : "bg-secondary"}`}>
                {p.status === "embarcado" ? <CheckCircle2 className="h-5 w-5" /> : <QrCode className="h-5 w-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{p.nome}</p>
                <p className="text-xs text-muted-foreground">{p.assento ? `Assento ${p.assento}` : "sem assento"}</p>
              </div>
              {p.status === "embarcado" ? (
                <span className="text-[10px] uppercase tracking-wider font-bold text-neon-green">ok</span>
              ) : (
                <button
                  onClick={() => embarcar(p.id, p.nome, p.onibus_id ?? null)}
                  className="h-9 px-3 rounded-lg bg-gradient-to-r from-neon-pink to-neon-purple text-primary-foreground text-xs font-bold"
                >
                  Embarcar
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function QrScanner({ onResult, onClose }: { onResult: (code: string) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let scanner: any;
    let cancelled = false;
    (async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;
        scanner = new Html5Qrcode("qr-region");
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: 240 },
          (decoded: string) => {
            onResult(decoded);
            scanner.stop().then(() => onClose());
          },
          () => {}
        );
      } catch (e: any) {
        setError(e?.message ?? "Não foi possível acessar a câmera");
      }
    })();
    return () => {
      cancelled = true;
      if (scanner) scanner.stop().catch(() => {});
    };
  }, [onResult, onClose]);

  return (
    <div className="mb-4 rounded-3xl overflow-hidden glass p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="font-bold">Aponte para o QR</p>
        <button onClick={onClose} className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div id="qr-region" ref={ref} className="rounded-2xl overflow-hidden bg-black aspect-square" />
      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
    </div>
  );
}
