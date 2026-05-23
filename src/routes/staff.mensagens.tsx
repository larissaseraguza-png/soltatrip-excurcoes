import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { StaffShell } from "@/components/staff/Shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useStaffExcursao } from "@/hooks/use-staff-excursao";
import { Send, Loader2 } from "lucide-react";

export const Route = createFileRoute("/staff/mensagens")({
  component: Mensagens,
});

type Mensagem = {
  id: string;
  autor_id: string;
  autor_nome: string | null;
  conteudo: string;
  created_at: string;
};

function Mensagens() {
  const { user } = useAuth();
  const { excursao, loading } = useStaffExcursao();
  const qc = useQueryClient();
  const [txt, setTxt] = useState("");
  const [me, setMe] = useState<{ id: string; nome: string } | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: p } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
      setMe({ id: user.id, nome: p?.full_name || user.email?.split("@")[0] || "Staff" });
    })();
  }, [user]);

  const { data: mensagens = [], isLoading } = useQuery({
    queryKey: ["staff-mensagens", excursao?.id],
    enabled: !!excursao?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mensagens")
        .select("*")
        .eq("excursao_id", excursao!.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Mensagem[];
    },
  });

  useEffect(() => {
    if (!excursao?.id) return;
    const ch = supabase
      .channel(`staff-msg-${excursao.id}`)
      .on(
        // @ts-ignore
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "mensagens", filter: `excursao_id=eq.${excursao.id}` },
        () => qc.invalidateQueries({ queryKey: ["staff-mensagens", excursao.id] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [excursao?.id, qc]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!txt.trim() || !me || !excursao) return;
    const conteudo = txt.trim();
    setTxt("");
    const { error } = await supabase.from("mensagens").insert({
      excursao_id: excursao.id,
      autor_id: me.id,
      autor_nome: me.nome,
      conteudo,
    });
    if (error) toast.error(error.message);
  }

  return (
    <StaffShell title="Mensagens" subtitle={excursao?.titulo ?? "Sem excursão vinculada"}>
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : !excursao ? (
        <div className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">
          Nenhuma excursão ativa vinculada.
        </div>
      ) : (
        <div className="flex flex-col h-[calc(100vh-13rem)]">
          <div className="flex-1 overflow-y-auto glass rounded-2xl p-4 space-y-3">
            {isLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
            ) : mensagens.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-10">Sem mensagens ainda.</p>
            ) : (
              mensagens.map((m) => {
                const mine = m.autor_id === me?.id;
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                        mine
                          ? "bg-gradient-to-br from-neon-green to-neon-purple text-primary-foreground"
                          : "bg-secondary"
                      }`}
                    >
                      {!mine && (
                        <p className="text-[10px] font-bold uppercase tracking-wider opacity-70 mb-0.5">
                          {m.autor_nome ?? "?"}
                        </p>
                      )}
                      <p className="text-sm whitespace-pre-wrap break-words">{m.conteudo}</p>
                      <p className="text-[10px] opacity-60 mt-1 text-right">
                        {new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={endRef} />
          </div>

          <form onSubmit={send} className="mt-3 flex gap-2">
            <input
              value={txt}
              onChange={(e) => setTxt(e.target.value)}
              placeholder="Escreva uma mensagem para a equipe e organizador..."
              className="flex-1 h-12 px-4 rounded-2xl bg-input border border-border text-sm"
            />
            <button
              disabled={!txt.trim()}
              className="h-12 w-12 rounded-2xl bg-gradient-to-br from-neon-green to-neon-purple text-primary-foreground flex items-center justify-center disabled:opacity-50 glow-primary"
            >
              <Send className="h-5 w-5" />
            </button>
          </form>
        </div>
      )}
    </StaffShell>
  );
}
