import { useEffect, useState, useCallback } from "react";
import { Bell, Check, CheckCheck, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type Notificacao = {
  id: string;
  user_id: string;
  excursao_id: string | null;
  tipo: string;
  titulo: string;
  mensagem: string | null;
  link: string | null;
  lida: boolean;
  lida_em: string | null;
  created_at: string;
};

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "agora";
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

const tipoTone: Record<string, string> = {
  info: "bg-neon-purple/20 text-neon-purple",
  sucesso: "bg-neon-green/20 text-neon-green",
  alerta: "bg-yellow-400/20 text-yellow-300",
  erro: "bg-destructive/20 text-destructive",
};

export function NotificationBell({ variant = "ghost" }: { variant?: "ghost" | "glass" }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const queryKey = ["notificacoes", user?.id ?? "anon"];

  const { data: notificacoes = [] } = useQuery<Notificacao[]>({
    queryKey,
    enabled: !!user?.id,
    staleTime: 30_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notificacoes")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as Notificacao[];
    },
  });

  // Realtime: escuta mudanças nas notificações do usuário
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`notif-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notificacoes",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  const naoLidas = notificacoes.filter((n) => !n.lida).length;

  const marcarLida = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notificacoes")
        .update({ lida: true, lida_em: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const marcarTodasLidas = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notificacoes")
        .update({ lida: true, lida_em: new Date().toISOString() })
        .eq("user_id", user!.id)
        .eq("lida", false);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notificacoes")
        .delete()
        .eq("id", id)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const handleClick = useCallback(
    (n: Notificacao) => {
      if (!n.lida) marcarLida.mutate(n.id);
      if (n.link) {
        setOpen(false);
        navigate({ to: n.link });
      }
    },
    [marcarLida, navigate]
  );

  if (!user) return null;

  const triggerCls =
    variant === "glass"
      ? "size-10 grid place-items-center rounded-full glass relative"
      : "relative inline-flex items-center justify-center size-9 rounded-full hover:bg-secondary transition";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button type="button" className={triggerCls} aria-label="Notificações">
          <Bell className="size-5" />
          {naoLidas > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 grid place-items-center rounded-full bg-neon-pink text-[10px] font-bold text-primary-foreground shadow-md">
              {naoLidas > 9 ? "9+" : naoLidas}
            </span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-5 py-4 border-b border-border">
          <div className="flex items-center justify-between gap-2">
            <SheetTitle className="flex items-center gap-2">
              <Bell className="size-4" /> Notificações
            </SheetTitle>
            {naoLidas > 0 && (
              <button
                onClick={() => marcarTodasLidas.mutate()}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
              >
                <CheckCheck className="size-3.5" /> Marcar todas
              </button>
            )}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {notificacoes.length === 0 ? (
            <div className="h-full grid place-items-center text-center px-6 py-16 text-muted-foreground">
              <div>
                <Bell className="size-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">Sem notificações por enquanto.</p>
                <p className="text-xs mt-1 opacity-70">
                  Você verá aqui avisos sobre suas excursões.
                </p>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {notificacoes.map((n) => (
                <li
                  key={n.id}
                  className={`px-4 py-3 transition ${
                    n.lida ? "bg-transparent" : "bg-secondary/40"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 size-2 rounded-full shrink-0 ${
                        n.lida ? "bg-transparent" : "bg-neon-pink"
                      }`}
                    />
                    <button
                      onClick={() => handleClick(n)}
                      className="flex-1 text-left min-w-0"
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <span
                          className={`text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${
                            tipoTone[n.tipo] ?? tipoTone.info
                          }`}
                        >
                          {n.tipo}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {timeAgo(n.created_at)}
                        </span>
                      </div>
                      <p className="text-sm font-semibold truncate">{n.titulo}</p>
                      {n.mensagem && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {n.mensagem}
                        </p>
                      )}
                    </button>
                    <div className="flex flex-col gap-1 shrink-0">
                      {!n.lida && (
                        <button
                          onClick={() => marcarLida.mutate(n.id)}
                          title="Marcar como lida"
                          className="size-7 grid place-items-center rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground"
                        >
                          <Check className="size-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => excluir.mutate(n.id)}
                        title="Excluir"
                        className="size-7 grid place-items-center rounded-md hover:bg-secondary text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
