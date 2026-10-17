"use client";

import * as React from "react";
import { HardDrive, Lock, Moon, ShieldAlert, Sun } from "lucide-react";
import { useTheme } from "@/components/layout/theme-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";

export default function WorkspaceSettingsPage() {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="border-b border-border pb-6">
        <Badge variant="primary">WORKSPACE // STUDIO SETTINGS</Badge>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Studio Configuration &amp; Policies
        </h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Manage visual theme preferences, upload security constraints, and
          account data retention policies.
        </p>
      </div>

      {/* Theme Appearance */}
      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-bold text-foreground">
          Interface Appearance
        </h2>
        <p className="text-xs text-foreground-muted">
          PIXELFORGE uses a dark-first color system (#09090F) calibrated for
          minimal visual fatigue when inspecting artwork, with optional light
          theme persistence.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            variant={theme === "dark" ? "primary" : "outline"}
            onClick={() => setTheme("dark")}
          >
            <Moon className="h-4 w-4" />
            Dark Studio Mode (Default)
          </Button>
          <Button
            type="button"
            variant={theme === "light" ? "primary" : "outline"}
            onClick={() => setTheme("light")}
          >
            <Sun className="h-4 w-4" />
            Light Editorial Mode
          </Button>
        </div>
      </Card>

      {/* Storage & Security Policy */}
      <Card className="p-6 space-y-3">
        <div className="flex items-center gap-2 text-accent-secondary">
          <HardDrive className="h-4 w-4" />
          <h2 className="text-lg font-bold text-foreground">
            Private Storage &amp; Upload Security Policy
          </h2>
        </div>
        <ul className="space-y-2 text-xs text-foreground-muted leading-relaxed">
          <li>
            • <strong className="text-foreground">Private Bucket:</strong> All
            uploads target the private{" "}
            <code className="font-mono text-accent-primary">
              creative-assets
            </code>{" "}
            Supabase Storage bucket with Row Level Security enforced.
          </li>
          <li>
            • <strong className="text-foreground">Allowed Formats:</strong>{" "}
            Allowlisted to JPEG/JPG, PNG, WebP, GIF, sanitized SVG, PDF, and
            non-extracted ZIP archives (max 50 MB).
          </li>
          <li>
            • <strong className="text-foreground">Signed URLs:</strong> Private
            assets generate short-lived signed URLs only after server-side
            ownership or project membership verification.
          </li>
        </ul>
      </Card>

      {/* Data Retention & Account Deletion Policy */}
      <Card className="border-status-error/30 p-6 space-y-4">
        <div className="flex items-center gap-2 text-status-error">
          <ShieldAlert className="h-4 w-4" />
          <h2 className="text-lg font-bold text-foreground">
            Data Retention &amp; Account Deletion Policy
          </h2>
        </div>
        <p className="text-xs text-foreground-muted leading-relaxed">
          Soft-deleted assets and archived projects are retained for 30 days to
          prevent accidental data loss during active client engagements. Upon
          permanent account deletion, all owned PostgreSQL metadata rows,
          project invitations, and associated objects inside{" "}
          <code className="font-mono">creative-assets</code> are purged.
        </p>
        <div>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() =>
              toast({
                title: "Account deletion requires re-authentication",
                description:
                  "Destructive account purge is protected by server-side session verification in Phase 2.",
                variant: "warning",
              })
            }
          >
            <Lock className="h-3.5 w-3.5" />
            Request Permanent Studio Purge
          </Button>
        </div>
      </Card>
    </div>
  );
}
