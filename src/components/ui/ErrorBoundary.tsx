import { useRouteError } from "react-router-dom";
import { Wordmark } from "@/components/brand/Wordmark";
import { Button } from "@/components/ui/Button";

/**
 * Clean Error Boundary UI for route errors and stale chunk deployments.
 * Replaces React Router's default developer error overlay with a brand-consistent UI.
 */
export function RouteErrorBoundary() {
  const error = useRouteError();
  const message = error instanceof Error ? error.message : "Something went wrong.";

  // Only a failed chunk fetch means a new build landed under a running
  // tab. Every other error is a fault, and telling someone the app was
  // updated when it in fact crashed sends them to reload forever.
  const stale =
    message.includes("Failed to fetch dynamically imported module") ||
    message.includes("Importing a module script failed");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-base)] px-6 py-12 text-center">
      <div className="w-full max-w-[180px]">
        <Wordmark className="block h-auto w-full" strokeWidth={6} />
      </div>
      <h2 className="mt-8 text-[length:var(--text-title)] font-medium text-[var(--color-ivory)]">
        {stale ? "App updated" : "Something went wrong"}
      </h2>
      <p className="mt-3 max-w-sm text-[length:var(--text-body)] text-[var(--color-ash)]">
        {stale
          ? "A newer version of RePulse is available. Reload to pick it up."
          : "This screen could not be opened. Reloading usually clears it."}
      </p>
      <p className="mt-2 text-[length:var(--text-meta)] text-[var(--color-ash-dim)] font-mono text-xs max-w-xs truncate">
        {message}
      </p>
      <div className="mt-8 w-full max-w-xs">
        <Button
          type="button"
          size="lg"
          register="system"
          onClick={() => {
            sessionStorage.removeItem("chunk_retry");
            window.location.reload();
          }}
        >
          Reload
        </Button>
      </div>
    </div>
  );
}
