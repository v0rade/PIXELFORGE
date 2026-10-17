"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  FolderGit2,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/utils/format";

interface InvitationData {
  id: string;
  projectId: string;
  projectTitle?: string;
  email: string;
  role: "client" | "collaborator";
  expiresAt: string;
}

export default function InviteAcceptancePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const unwrappedParams = React.use(params);
  const token = unwrappedParams.token;
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = React.useState(true);
  const [invitation, setInvitation] = React.useState<InvitationData | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isAccepting, setIsAccepting] = React.useState(false);

  React.useEffect(() => {
    let isMounted = true;

    async function loadInvitation() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/v1/invitations/${encodeURIComponent(token)}`);
        const json = await res.json();

        if (!res.ok) {
          throw new Error(json?.error?.message || "Invalid or expired invitation.");
        }

        if (isMounted) {
          setInvitation(json.data);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(
            err instanceof Error ? err.message : "Failed to verify invitation."
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    if (token) {
      loadInvitation();
    }

    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;
    setIsAccepting(true);

    try {
      const res = await fetch("/api/v1/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const json = await res.json();

      if (res.status === 401) {
        // User is not logged in; preserve token redirect
        toast({
          title: "Authentication Required",
          description: "Please sign in or create an account to accept this project invitation.",
          variant: "warning",
        });
        router.push(`/login?next=${encodeURIComponent(`/invite/${token}`)}`);
        return;
      }

      if (!res.ok) {
        throw new Error(json?.error?.message || "Failed to accept invitation.");
      }

      toast({
        title: "Invitation Accepted",
        description: "You have joined the project workspace successfully.",
        variant: "success",
      });

      const targetProject = json.data?.projectId || invitation?.projectId;
      router.push(`/dashboard/projects/${targetProject}`);
    } catch (err: unknown) {
      toast({
        title: "Acceptance Failed",
        description: err instanceof Error ? err.message : "Could not accept invitation.",
        variant: "error",
      });
      setIsAccepting(false);
    }
  };

  return (
    <div className="relative flex min-h-[calc(100vh-8rem)] items-center justify-center py-12 px-4 sm:px-6">
      <div className="w-full max-w-lg space-y-8">
        <div className="flex flex-col items-center text-center">
          <Logo className="scale-125 mb-1" />
          <p className="mt-3 font-mono text-xs uppercase tracking-widest text-accent-secondary">
            SECURE CLIENT COLLABORATION PORTAL
          </p>
        </div>

        <Card className="p-8 backdrop-blur-md border border-border/80 bg-background-card/90 shadow-2xl">
          {loading ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-11 w-full" />
            </div>
          ) : error ? (
            <div className="space-y-6 text-center py-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-status-error/10 border border-status-error/20 text-status-error">
                <AlertCircle className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground">
                  Invitation Invalid or Expired
                </h2>
                <p className="mt-2 text-sm text-foreground-muted">
                  {error}
                </p>
                <p className="mt-1 text-xs text-foreground-muted">
                  Tokens are single-use and expire automatically for cryptographic security. Contact the studio owner for a refreshed invitation.
                </p>
              </div>
              <div className="flex flex-col gap-3 pt-2">
                <Link
                  href="/login"
                  className={buttonVariants({ variant: "outline", className: "w-full" })}
                >
                  Return to Studio Login
                </Link>
                <Link
                  href="/"
                  className={buttonVariants({ variant: "ghost", className: "w-full" })}
                >
                  Back to Public Gallery
                </Link>
              </div>
            </div>
          ) : invitation ? (
            <div className="space-y-6">
              <div className="space-y-2 border-b border-border pb-5">
                <div className="flex items-center justify-between">
                  <Badge variant="cyan">
                    {invitation.role === "client" ? "CLIENT REVIEWER" : "COLLABORATOR"}
                  </Badge>
                  <span className="font-mono text-xs text-status-warning">
                    EXPIRES {formatDate(invitation.expiresAt)}
                  </span>
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  You&apos;re Invited to Collaborate
                </h1>
                <p className="text-sm text-foreground-muted">
                  You have been granted scoped access to review project deliverables, provide annotations, and sign off on artwork.
                </p>
              </div>

              <div className="rounded-lg border border-border/70 bg-background-secondary/60 p-4 space-y-3 font-mono text-xs">
                <div className="flex items-center gap-2.5 text-foreground">
                  <FolderGit2 className="h-4 w-4 text-accent-primary shrink-0" />
                  <span className="text-foreground-muted uppercase">Project:</span>
                  <span className="font-semibold text-foreground">
                    {invitation.projectTitle || "Studio Deliverable Workspace"}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 text-foreground">
                  <Mail className="h-4 w-4 text-accent-secondary shrink-0" />
                  <span className="text-foreground-muted uppercase">Recipient:</span>
                  <span className="text-foreground">{invitation.email}</span>
                </div>
                <div className="flex items-center gap-2.5 text-status-success">
                  <ShieldCheck className="h-4 w-4 shrink-0" />
                  <span>Scoped Row-Level Security Enforced</span>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <Button
                  variant="gradient"
                  size="lg"
                  className="w-full"
                  onClick={handleAccept}
                  disabled={isAccepting}
                >
                  {isAccepting ? (
                    "Joining Workspace..."
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Accept Invitation &amp; Open Workspace
                    </>
                  )}
                </Button>

                <div className="relative my-4 flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <span className="relative bg-background-card px-3 font-mono text-[11px] uppercase tracking-wider text-foreground-muted">
                    Not signed in?
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Link
                    href={`/login?next=${encodeURIComponent(
                      `/invite/${token}`
                    )}`}
                    className={buttonVariants({ variant: "outline", className: "w-full" })}
                  >
                    <Lock className="h-3.5 w-3.5" />
                    Log In First
                  </Link>
                  <Link
                    href={`/signup?next=${encodeURIComponent(
                      `/invite/${token}`
                    )}`}
                    className={buttonVariants({ variant: "outline", className: "w-full" })}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Sign Up
                  </Link>
                </div>
              </div>

              <p className="text-center font-mono text-[11px] text-foreground-muted">
                Single-use cryptographically hashed token. No plaintext tokens are retained.
              </p>
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
