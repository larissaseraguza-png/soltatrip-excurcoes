import { createFileRoute, Outlet, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { RoleGuard } from "@/components/RoleGuard";
import { RoleHeader } from "@/components/RoleHeader";

export const Route = createFileRoute("/app")({
  head: () => ({ meta: [{ name: "robots", content: "noindex" }] }),
  component: AppLayout,
});

function AppLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" />;

  return (
    <RoleGuard allow="excursionista">
      <div className="min-h-screen bg-background text-foreground">
        <RoleHeader role="excursionista" label="ORGANIZADOR" />
        <main className="mx-auto max-w-5xl px-4 py-6 pb-24">
          <Outlet />
        </main>
      </div>
    </RoleGuard>
  );
}
