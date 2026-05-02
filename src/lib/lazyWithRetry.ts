import { lazy, type ComponentType } from "react";

/**
 * Wraps a dynamic import with a single retry + page reload fallback.
 * Handles the "Failed to fetch dynamically imported module" error that
 * occurs when Vercel deploys a new version and old chunk hashes become stale.
 */
export function lazyWithRetry<T extends ComponentType<unknown>>(
  importFn: () => Promise<{ default: T }>,
) {
  return lazy(() =>
    importFn().catch((error: unknown) => {
      // Only retry for chunk/module loading errors
      const message = error instanceof Error ? error.message : String(error);
      const isChunkError =
        message.includes("Failed to fetch dynamically imported module") ||
        message.includes("Loading chunk") ||
        message.includes("Loading CSS chunk") ||
        message.includes("Importing a module script failed");

      if (!isChunkError) throw error;

      // Retry once after a brief pause
      return new Promise<{ default: T }>((resolve, reject) => {
        setTimeout(() => {
          importFn()
            .then(resolve)
            .catch(() => {
              // If second attempt also fails, force reload (once) to get fresh index.html
              const reloadedKey = `chunk-reload:${window.location.pathname}`;
              if (!sessionStorage.getItem(reloadedKey)) {
                sessionStorage.setItem(reloadedKey, "1");
                window.location.reload();
              }
              reject(error);
            });
        }, 1000);
      });
    }),
  );
}
