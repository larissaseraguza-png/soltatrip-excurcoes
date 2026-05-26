import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Mantém dados em cache para evitar flicker ao navegar entre páginas.
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        // Em redes móveis instáveis, o default de 3 retries com backoff
        // exponencial pode travar a UI por 30s+. Mantemos 1 retry rápido.
        retry: 1,
        retryDelay: 1500,
        networkMode: "offlineFirst",
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 30_000,
  });

  return router;
};
