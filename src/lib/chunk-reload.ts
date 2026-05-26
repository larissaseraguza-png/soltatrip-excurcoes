// Detecta erros de chunk (build novo invalidando módulos antigos cacheados
// no celular do usuário) e faz reload com cache-busting + limpeza de
// caches/Service Worker. Roda apenas no cliente.
//
// Por que: o erro vem como `unhandledrejection` fora da árvore React, então
// nenhum ErrorBoundary chega a vê-lo. Sem este handler global, o celular
// do voluntário fica preso no mesmo erro toda vez que abre o app.

const CHUNK_ERROR_RE =
  /Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError|Loading chunk \d+ failed|error loading dynamically imported module/i;

const RELOAD_KEY = "st_chunk_reload_at";
// Janela para evitar loop: só recarrega de novo se passou >30s do último.
const RELOAD_COOLDOWN_MS = 30_000;

export function isChunkError(err: unknown): boolean {
  if (!err) return false;
  const msg =
    (err as Error)?.message ??
    (typeof err === "string" ? err : "") ??
    "";
  const name = (err as Error)?.name ?? "";
  return CHUNK_ERROR_RE.test(msg) || name === "ChunkLoadError";
}

async function clearCachesAndSW() {
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister().catch(() => {})));
    }
  } catch {
    /* ignora */
  }
  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k).catch(() => {})));
    }
  } catch {
    /* ignora */
  }
}

export function forceFreshReload() {
  if (typeof window === "undefined") return;
  try {
    const now = Date.now();
    const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? "0");
    if (now - last < RELOAD_COOLDOWN_MS) return; // evita loop
    sessionStorage.setItem(RELOAD_KEY, String(now));
  } catch {
    /* storage indisponível */
  }
  // Limpa SW/caches e em seguida força reload com cache-busting.
  clearCachesAndSW().finally(() => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("_r", String(Date.now()));
      window.location.replace(url.toString());
    } catch {
      window.location.reload();
    }
  });
}

let installed = false;
export function installChunkReloadHandler() {
  if (installed) return;
  if (typeof window === "undefined") return;
  installed = true;

  window.addEventListener("unhandledrejection", (event) => {
    if (isChunkError(event.reason)) {
      event.preventDefault?.();
      // eslint-disable-next-line no-console
      console.warn("[chunk-reload] unhandledrejection — forçando reload fresco");
      forceFreshReload();
    }
  });

  window.addEventListener("error", (event) => {
    if (isChunkError(event.error ?? event.message)) {
      event.preventDefault?.();
      // eslint-disable-next-line no-console
      console.warn("[chunk-reload] error — forçando reload fresco");
      forceFreshReload();
    }
  });
}
