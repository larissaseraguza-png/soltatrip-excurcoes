import { createFileRoute, Outlet } from "@tanstack/react-router";
import { RoleGuard } from "@/components/RoleGuard";

export const Route = createFileRoute("/excursionista")({
  component: () => (
    <RoleGuard allow="excursionista">
      <Outlet />
    </RoleGuard>
  ),
});
