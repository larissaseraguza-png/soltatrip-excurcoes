import { createFileRoute, Outlet } from "@tanstack/react-router";
import { RoleGuard } from "@/components/RoleGuard";
import { RoleHeader } from "@/components/RoleHeader";

export const Route = createFileRoute("/passageiro")({
  head: () => ({ meta: [{ name: "robots", content: "noindex" }] }),
  component: () => (
    <RoleGuard allow="passageiro">
      <div className="min-h-screen bg-background text-foreground">
        <RoleHeader role="passageiro" label="VIAGEM" />
        <main className="mx-auto max-w-5xl px-4 py-6 pb-24">
          <Outlet />
        </main>
      </div>
    </RoleGuard>
  ),
});
