import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center forge-grid-bg">
      <div className="rounded-lg border border-border bg-background-card p-8 sm:p-12 max-w-md shadow-forge-card">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-accent-primary/40 bg-accent-primary/10 text-accent-primary">
          <Compass className="h-6 w-6" />
        </div>
        <p className="font-mono text-xs uppercase tracking-widest text-accent-secondary">
          ERROR 404 // COORDINATE NOT FOUND
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
          Resource Outside Studio Grid
        </h1>
        <p className="mt-2 text-sm text-foreground-muted leading-relaxed">
          The requested page, project case study, or private asset coordinate
          could not be located or requires explicit workspace authorization.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/">
            <Button variant="primary">
              <ArrowLeft className="h-4 w-4" />
              Return to Landing Page
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline">Open Studio Workspace</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
