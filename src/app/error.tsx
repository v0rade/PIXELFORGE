"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log only non-sensitive error metadata
    console.error(
      JSON.stringify({
        level: "error",
        event: "app_render_exception",
        digest: error.digest ?? "unassigned",
        timestamp: new Date().toISOString(),
      })
    );
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center forge-grid-bg">
      <div className="max-w-md rounded-lg border border-border bg-background-card p-8 sm:p-10 shadow-forge-card">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-status-error/40 bg-status-error/10 text-status-error">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <p className="font-mono text-xs uppercase tracking-widest text-status-error">
          RUNTIME EXCEPTION // SAFE RECOVERY MODE
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
          Workspace Render Interrupted
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-foreground-muted">
          An unexpected fault occurred while rendering this view. No workspace
          assets or project records were harmed.
        </p>
        {error.digest && (
          <p className="mt-3 rounded border border-border bg-background-elevated px-3 py-1.5 font-mono text-xs text-foreground-muted">
            TRACE DIGEST: {error.digest}
          </p>
        )}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button variant="primary" onClick={() => reset()}>
            <RotateCcw className="h-4 w-4" />
            Retry Render
          </Button>
          <Link href="/">
            <Button variant="outline">
              <Home className="h-4 w-4" />
              Return to Studio Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
