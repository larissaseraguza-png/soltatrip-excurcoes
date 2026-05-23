import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/excursionista/")({
  head: () => ({ meta: [{ name: "robots", content: "noindex" }] }),
  component: () => <Navigate to="/app" replace />,
});
