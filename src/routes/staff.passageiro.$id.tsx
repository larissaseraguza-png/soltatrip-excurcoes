import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { StaffShell, Pill } from "@/components/staff/Shell";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import { ArrowLeft, Loader2, Phone, Mail, MapPin, Armchair, Wallet, QrCode, Lock } from "lucide-react";

export const Route = createFileRoute("/staff/passageiro/$id")({
  component: PassageiroDetalhe,
});

type Pax = {
  id: string;
  excursao_id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  documento: string | null;
  assento: string | null;
  seat_id: string | null;
  ponto_embarque_id: string | null;
  status: string;
  payment_status: string;
  total_price: number;
  amount_paid: number;
  qr_code: string;
  embarcado_em: string | null;
};

function PassageiroDetalhe() {
  const { id } = Route.useParams();

  const { data: pax, isLoading } = useQuery({
    queryKey: ["staff-pax-detalhe", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("passageiros")
        .select(
          "id,excursao_id,nome,telefone,email,documento,assento,seat_id,ponto_embarque_id,status,payment_status,total_price,amount_paid,qr_code,embarcado_em",
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as Pax | null;
    },
  });

  const { data: ponto } = useQuery({
    queryKey: ["staff-pax-ponto", pax?.ponto_embarque_id],
    enabled: !!pax?.ponto_embarque_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("pontos_embarque")
        .select("nome,horario,endereco")
        .eq("id", pax!.ponto_embarque_id!)
        .maybeSingle();
      return data;
    },
  });

  const { data: pagamentos = [] } = useQuery({
    queryKey: ["staff-pax-pgto", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pagamentos")
        .select("id,valor,metodo,status,created_at")
        .eq("passageiro_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  useRealtimeSync(
    `staff-pax-${id}`,
    [
      { table: "passageiros", filter: `id=eq.${id}` },
      { table: "pagamentos", filter: `passageiro_id=eq.${id}` },
    ],
    [
      ["staff-pax-detalhe", id],
      ["staff-pax-pgto", id],
    ],
  );

  const brl = useMemo(
    () => (v: number) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
    [],
  );

  return (
    <StaffShell title="Passageiro" subtitle={pax?.nome ?? ""} back="/staff/passageiros">
      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : !pax ? (
        <div className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">
          Passageiro não encontrado.
          <div className="mt-4">
            <Link to="/staff/passageiros" className="text-xs text-neon-green inline-flex items-center gap-1">
              <ArrowLeft className="size-3" /> voltar
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="glass rounded-3xl p-5 mb-5 text-center">
            <div className="size-20 mx-auto rounded-full bg-gradient-to-br from-neon-purple to-neon-pink grid place-items-center font-display font-black text-2xl text-primary-foreground glow-primary mb-3">
              {pax.nome.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
            </div>
            <h2 className="text-xl font-display font-bold">{pax.nome}</h2>
            <p className="text-[11px] text-muted-foreground mb-3">{pax.documento ?? "Sem documento informado"}</p>
            <div className="flex justify-center gap-2 flex-wrap">
              <Pill tone={pax.embarcado_em ? "green" : "yellow"}>
                {pax.embarcado_em ? "embarcado" : "aguardando"}
              </Pill>
              <Pill
                tone={
                  pax.payment_status === "paid"
                    ? "green"
                    : pax.payment_status === "partial_payment"
                      ? "yellow"
                      : pax.payment_status === "cancelled"
                        ? "red"
                        : "muted"
                }
              >
                {pax.payment_status === "paid"
                  ? "pago"
                  : pax.payment_status === "partial_payment"
                    ? "parcial"
                    : pax.payment_status === "cancelled"
                      ? "cancelado"
                      : "pendente"}
              </Pill>
            </div>
          </div>

          <div className="glass rounded-2xl p-3 mb-4 flex items-center gap-2 border border-yellow-400/30 bg-yellow-400/5">
            <Lock className="size-4 text-yellow-300 shrink-0" />
            <div className="text-[11px] text-yellow-200">
              Edição de poltrona, embarque e pagamentos é exclusiva do organizador.
            </div>
          </div>

          <Section title="Contato">
            <Row icon={Phone} label="Telefone" value={pax.telefone ?? "—"} />
            <Row icon={Mail} label="Email" value={pax.email ?? "—"} />
          </Section>

          <Section title="Viagem">
            <Row icon={Armchair} label="Poltrona" value={pax.assento ?? "—"} />
            <Row
              icon={MapPin}
              label="Embarque"
              value={ponto ? `${ponto.nome}${ponto.horario ? ` · ${ponto.horario}` : ""}` : "—"}
            />
            <Row icon={QrCode} label="QR Code" value={pax.qr_code} />
          </Section>

          <Section title="Financeiro">
            <Row label="Total" value={brl(pax.total_price)} />
            <Row label="Pago" value={brl(pax.amount_paid)} />
            <Row label="Saldo" value={brl(Math.max(0, Number(pax.total_price) - Number(pax.amount_paid)))} />
          </Section>

          <Section title="Pagamentos">
            {pagamentos.length === 0 ? (
              <div className="p-3 text-xs text-muted-foreground">Nenhum pagamento registrado.</div>
            ) : (
              pagamentos.map((p: any) => (
                <div key={p.id} className="p-3 flex items-center gap-3">
                  <Wallet className="size-4 text-neon-green" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">
                      {p.metodo.toUpperCase()} · {brl(Number(p.valor))}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {new Date(p.created_at).toLocaleString("pt-BR")}
                    </div>
                  </div>
                  <Pill
                    tone={p.status === "confirmado" ? "green" : p.status === "pendente" ? "yellow" : "red"}
                  >
                    {p.status}
                  </Pill>
                </div>
              ))
            )}
          </Section>
        </>
      )}
    </StaffShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-2">{title}</h3>
      <div className="glass rounded-2xl divide-y divide-border/60">{children}</div>
    </section>
  );
}

function Row({ icon: Icon, label, value }: { icon?: React.ElementType; label: string; value: string }) {
  return (
    <div className="p-3 flex items-center gap-3">
      {Icon && <Icon className="size-4 text-neon-green" />}
      <div className="text-xs text-muted-foreground flex-1">{label}</div>
      <div className="text-sm font-semibold text-right break-all">{value}</div>
    </div>
  );
}
