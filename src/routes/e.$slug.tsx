import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useRoleForUser } from "@/hooks/use-role";
import { isFlowLocked } from "@/config/flow-mode";
import {
  rememberExcursionistaInvite,
  linkPassageiroToExcursionista,
  clearPendingExcursionistaInvite,
} from "@/lib/excursionista-link";
import { Bus, Loader2, MapPin, Calendar, Sparkles, ArrowRight, Crown, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/e/$slug")({
  beforeLoad: () => {
    if (isFlowLocked()) throw redirect({ to: "/" });
  },
  head: () => ({
    meta: [{ title: "Excursionista — SoltaTrip" }],
  }),
  component: SlugPage,
});

type Vitrine = {
  organizer_id: string;
  full_name: string | null;
  company_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  city: string | null;
  instagram_url: string | null;
  slug: string | null;
};

type ExPub = {
  id: string;
  titulo: string;
  destino: string;
  descricao: string | null;
  data_evento: string;
  preco: number;
  banner_url: string | null;
  cor: string | null;
};

function fmtDateBR(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function SlugPage() {
  const { slug } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useRoleForUser(user, authLoading);
  const navigate = useNavigate();
  const [linking, setLinking] = useState(false);

  const { data: vitrine, isLoading: loadingV } = useQuery({
    queryKey: ["vitrine-slug", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc("get_excursionista_vitrine_by_slug", { p_slug: slug })
        .maybeSingle();
      if (error) throw error;
      return data as Vitrine | null;
    },
  });

  const orgId = vitrine?.organizer_id ?? null;

  const { data: excursoes = [], isLoading: loadingE } = useQuery({
    queryKey: ["vitrine-slug-excursoes", slug],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_excursionista_excursoes_publicas_by_slug", {
        p_slug: slug,
      });
      if (error) throw error;
      return (data ?? []) as ExPub[];
    },
  });

  useEffect(() => {
    if (!orgId || authLoading || roleLoading || linking) return;
    if (user && role === "passageiro") {
      setLinking(true);
      linkPassageiroToExcursionista(orgId)
        .then(() => {
          clearPendingExcursionistaInvite();
          toast.success("Vinculado ao organizador!");
          navigate({ to: "/passageiro", replace: true });
        })
        .catch((e) => {
          toast.error(e?.message ?? "Erro ao vincular");
          setLinking(false);
        });
    }
  }, [user, role, authLoading, roleLoading, orgId, navigate, linking]);

  function handleEntrar() {
    if (orgId) rememberExcursionistaInvite(orgId);
    navigate({ to: "/auth" });
  }

  if (loadingV) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!vitrine) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="glass rounded-3xl p-8 max-w-md text-center">
          <AlertCircle className="h-10 w-10 mx-auto text-red-400" />
          <h1 className="mt-3 font-display text-xl font-bold">Link não encontrado</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Esse link de excursionista não existe. Confira o endereço com quem te enviou.
          </p>
          <Link to="/" className="mt-5 inline-block text-xs font-semibold text-primary underline">
            Voltar ao início
          </Link>
        </div>
      </div>
    );
  }

  const name = vitrine.company_name || vitrine.full_name || "Organizador";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
      <div className="relative max-w-2xl mx-auto px-4 py-8">
        <Link to="/" className="flex items-center gap-2 font-display font-bold text-lg mb-6">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-neon-pink to-neon-purple glow-primary">
            <Bus className="h-4 w-4 text-primary-foreground" />
          </span>
          <span className="text-gradient">SoltaTrip</span>
        </Link>

        <div className="glass rounded-3xl p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 h-56 w-56 bg-gradient-to-br from-neon-pink/30 to-transparent rounded-full blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-4">
              {vitrine.avatar_url ? (
                <img
                  src={vitrine.avatar_url}
                  alt={name}
                  className="h-16 w-16 rounded-2xl object-cover border border-border"
                />
              ) : (
                <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-neon-pink to-neon-purple glow-primary">
                  <Crown className="h-7 w-7 text-primary-foreground" />
                </span>
              )}
              <div className="min-w-0">
                <div className="text-[10px] font-bold tracking-[0.18em] text-neon-pink">EXCURSIONISTA</div>
                <h1 className="font-display text-2xl font-bold leading-tight truncate">{name}</h1>
                {vitrine.city && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3" /> {vitrine.city}
                  </p>
                )}
              </div>
            </div>

            {vitrine.bio && (
              <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{vitrine.bio}</p>
            )}

            <div className="mt-6 rounded-2xl border border-neon-purple/30 bg-neon-purple/5 p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-neon-purple shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold">Reserve com este organizador</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Crie sua conta ou faça login para reservar uma vaga.
                  </p>
                </div>
              </div>
              <button
                onClick={handleEntrar}
                disabled={linking}
                className="mt-4 w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold glow-primary hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {linking ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                {user && role === "passageiro" ? "Vinculando..." : "Entrar / Criar conta"}
              </button>
            </div>
          </div>
        </div>

        <h2 className="mt-8 mb-3 font-display text-lg font-bold flex items-center gap-2">
          <Calendar className="h-4 w-4 text-neon-pink" /> Próximas excursões
        </h2>

        {loadingE ? (
          <div className="glass rounded-2xl p-6 flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : excursoes.length === 0 ? (
          <div className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground">
            Nenhuma excursão publicada no momento.
          </div>
        ) : (
          <ul className="space-y-3">
            {excursoes.map((e) => (
              <li key={e.id} className="glass rounded-2xl p-4 flex gap-3 items-center">
                {e.banner_url ? (
                  <img src={e.banner_url} alt={e.titulo} className="h-16 w-16 rounded-xl object-cover" />
                ) : (
                  <span
                    className="h-16 w-16 rounded-xl flex items-center justify-center"
                    style={{ background: e.cor ?? "#a855f7" }}
                  >
                    <Bus className="h-6 w-6 text-white" />
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{e.titulo}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                    <MapPin className="h-3 w-3" /> {e.destino}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {fmtDateBR(e.data_evento)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-neon-green">R$ {Number(e.preco).toFixed(0)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
