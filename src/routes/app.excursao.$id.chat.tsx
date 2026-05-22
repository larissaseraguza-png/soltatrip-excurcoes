import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/app/excursao/$id/chat")({
  component: ChatPage,
});

type Mensagem = {
  id: string;
  autor_id: string;
  autor_nome: string | null;
  conteudo: string;
  created_at: string;
};

function ChatPage() {
  const { id } = useParams({ from: "/app/excursao/$id/chat" });
  const qc = useQueryClient();
  const [txt, setTxt] = useState("");
  const [me, setMe] = useState<{ id: string; nome: string } | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      const { data: p } = await supabase.from("profiles").select("full_name").eq("id", data.user.id).single();
      setMe({ id: data.user.id, nome: p?.full_name || data.user.email?.split("@")[0] || "Eu" });
    })();
  }, []);

  const { data: excursao } = useQuery({
    queryKey: ["excursao", id],
    queryFn: async () => (await supabase.from("excursoes").select("titulo").eq("id", id).single()).data,
  });

  const { data: mensagens = [], isLoading } = useQuery({
    queryKey: ["mensagens", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mensagens")
        .select("*")
        .eq("excursao_id", id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Mensagem[];
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel(`mensagens-${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "mensagens", filter: `excursao_id=eq.${id}` }, () => {
        qc.invalidateQueries({ queryKey: ["mensagens", id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id, qc]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!txt.trim() || !me) return;
    const conteudo = txt.trim();
    setTxt("");
    const { error } = await supabase.from("mensagens").insert({
      excursao_id: id,
      autor_id: me.id,
      autor_nome: me.nome,
      conteudo,
    });
    if (error) alert(error.message);
  }

  return (
    <div className="flex flex-col h-[calc(100vh-9rem)]">
      <Link to="/app/excursao/$id" params={{ id }} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <div className="mb-3">
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold">{excursao?.titulo ?? "Excursão"}</p>
        <h1 className="font-display text-2xl font-black">Chat da viagem</h1>
      </div>

      <div className="flex-1 overflow-y-auto glass rounded-2xl p-4 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : mensagens.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-10">Nenhuma mensagem ainda. Mande a primeira!</p>
        ) : (
          mensagens.map((m) => {
            const mine = m.autor_id === me?.id;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${mine ? "bg-gradient-to-br from-neon-pink to-neon-purple text-primary-foreground" : "bg-secondary"}`}>
                  {!mine && <p className="text-[10px] font-bold uppercase tracking-wider opacity-70 mb-0.5">{m.autor_nome ?? "?"}</p>}
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
          placeholder="Escreva uma mensagem..."
          className="flex-1 h-12 px-4 rounded-2xl bg-input border border-border text-sm"
        />
        <button
          disabled={!txt.trim()}
          className="h-12 w-12 rounded-2xl bg-gradient-to-br from-neon-pink to-neon-purple text-primary-foreground flex items-center justify-center disabled:opacity-50 glow-primary"
        >
          <Send className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
}
