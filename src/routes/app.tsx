import { createFileRoute, Outlet, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Bus, LogOut, Loader2 } from "lucide-react";

export const Route = createFileRoute("/app")({
  head: () => ({ meta: [{ name: "robots", content: "noindex" }] }),
  component: AppLayout,
});

function AppLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" />;

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="mx-auto max-w-5xl px-4 h-14 flex items-center justify-between">
          <Link to="/app" className="flex items-center gap-2 font-display font-bold">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-neon-pink to-neon-purple">
              <Bus className="h-3.5 w-3.5 text-primary-foreground" />
            </span>
            <span className="text-gradient">SoltaTrip</span>
          </Link>
          <button
            onClick={logout}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition"
          >
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 pb-24">
        <Outlet />
      </main>
    </div>
  );
}
