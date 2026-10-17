"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

export default function GlobalErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className="dark">
      <body className="flex min-h-screen flex-col items-center justify-center bg-[#09090F] px-4 text-center text-[#F4F4F8]">
        <div className="max-w-md rounded-lg border border-[#23263A] bg-[#151624] p-8 shadow-xl">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-[#FB7185]/40 bg-[#FB7185]/10 text-[#FB7185]">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <p className="font-mono text-xs uppercase tracking-widest text-[#FB7185]">
            CRITICAL SYSTEM FAULT // GLOBAL BOUNDARY
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">
            PIXELFORGE Recovery Shell
          </h1>
          <p className="mt-2 text-sm text-[#989AAF]">
            A root layout exception occurred. Click below to re-initialize the
            application shell.
          </p>
          {error.digest && (
            <p className="mt-3 font-mono text-xs text-[#989AAF]">
              DIGEST: {error.digest}
            </p>
          )}
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={() => reset()}
              className="inline-flex items-center gap-2 rounded-md bg-[#A78BFA] px-4 py-2 text-sm font-semibold text-[#09090F] transition hover:opacity-90"
            >
              <RotateCcw className="h-4 w-4" />
              Re-initialize Studio
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
