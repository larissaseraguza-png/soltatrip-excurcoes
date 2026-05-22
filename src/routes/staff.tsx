import { createFileRoute, Outlet } from "@tanstack/react-router";
import { RoleGuard } from "@/components/RoleGuard";

export const Route = createFileRoute("/staff")({
  component: () => (
    <RoleGuard allow="staff">
      <Outlet />
    </RoleGuard>
  ),
});
