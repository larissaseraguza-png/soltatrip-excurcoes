import { createFileRoute, Outlet } from "@tanstack/react-router";
import { RoleGuard } from "@/components/RoleGuard";

export const Route = createFileRoute("/passageiro")({
  component: () => (
    <RoleGuard allow="passageiro">
      <Outlet />
    </RoleGuard>
  ),
});
