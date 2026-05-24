import { createFileRoute, Outlet, Navigate, Link, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, LayoutDashboard, History, BarChart3, UserCircle2, Wallet } from "lucide-react";
import { RoleGuard } from "@/components/RoleGuard";
import { RoleHeader } from "@/components/RoleHeader";

export const Route = createFileRoute("/app")({
  head: () => ({ meta: [{ name: "robots", content: "noindex" }] }),
  component: AppLayout,
});

const tabs: { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean }[] = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/app/historico", label: "Histórico", icon: History },
  { to: "/app/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/app/pagamentos-config", label: "Pagamentos", icon: Wallet },
  { to: "/app/perfil", label: "Perfil", icon: UserCircle2 },
];

function AppLayout() {
  const { user, loading } = useAuth();
  const { pathname } = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" />;

  // Esconde a subnav em páginas internas da excursão (já têm o próprio header)
  const showTabs = !pathname.startsWith("/app/excursao");

  return (
    <RoleGuard allow="excursionista">
      <div className="min-h-screen bg-background text-foreground">
        <RoleHeader role="excursionista" label="ORGANIZADOR" />
        {showTabs && (
          <nav className="sticky top-14 z-30 glass border-b border-border">
            <div className="mx-auto max-w-5xl px-2 flex gap-1 overflow-x-auto no-scrollbar">
              {tabs.map((t) => {
                const active = t.exact ? pathname === t.to : pathname.startsWith(t.to);
                const Icon = t.icon;
                return (
                  <Link
                    key={t.to}
                    to={t.to as "/app"}
                    className={`flex items-center gap-1.5 px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-semibold whitespace-nowrap border-b-2 transition ${
                      active
                        ? "border-primary text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" /> {t.label}
                  </Link>
                );
              })}
            </div>
          </nav>
        )}
        <main className="mx-auto max-w-5xl px-4 py-6 pb-24">
          <Outlet />
        </main>
      </div>
    </RoleGuard>
  );
}
