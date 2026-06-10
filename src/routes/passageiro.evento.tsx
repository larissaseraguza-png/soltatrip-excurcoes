import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import { Shell } from "@/components/passageiro/Shell";
import { Loader2, Sparkles, Music2 } from "lucide-react";

export const Route = createFileRoute("/passageiro/evento")({
  component: EventosVitrine,
});

type Festa = {
  id: string;
  titulo: string;
  banner_url: string | null;
  cor: string | null;
};

function EventosVitrine() {
  const { data: festas = [], isLoading } = useQuery({
    queryKey: ["vitrine-festas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("excursoes")
        .select("id, titulo, banner_url, cor")
        .eq("status", "publicada")
        .order("data_evento", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Festa[];
    },
    staleTime: 30_000,
  });

  useRealtimeSync("vitrine-festas", [{ table: "excursoes" }], [["vitrine-festas"]]);

  return (
    <Shell title="Eventos" subtitle="Vitrine de festas disponíveis">
      <div className="glass rounded-2xl p-4 mb-5 flex items-start gap-3 border border-neon-pink/20">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-neon-purple to-neon-pink grid place-items-center shrink-0">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="text-xs text-muted-foreground">
          Toque em uma festa para ver excursões, ingressos, combos, camping e demais itens disponíveis.
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : festas.length === 0 ? (
        <div className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground">
          Nenhuma festa disponível no momento.
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4">
          {festas.map((f) => (
            <li key={f.id}>
              <Link
                to="/passageiro/itens/$id"
                params={{ id: f.id }}
                className="block rounded-3xl overflow-hidden border border-border/60 glass active:scale-[0.99] transition"
              >
                <div
                  className="relative w-full aspect-[16/9]"
                  style={{
                    background: f.banner_url
                      ? `url(${f.banner_url}) center/cover`
                      : `linear-gradient(135deg, ${f.cor ?? "#a855f7"}, #ec4899)`,
                  }}
                >
                  {!f.banner_url && (
                    <div className="absolute inset-0 grid place-items-center">
                      <Music2 className="h-12 w-12 opacity-50" />
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/95 via-background/60 to-transparent p-4 pt-10">
                    <h3 className="font-display font-black text-xl leading-tight truncate">
                      {f.titulo}
                    </h3>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
}
