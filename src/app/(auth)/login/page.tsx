"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, ArrowRight, CheckCircle2, Lock, Sparkles } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { loginSchema } from "@/lib/validation/auth";
import { sanitizeRedirectPath } from "@/lib/supabase/config";

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const nextPath = sanitizeRedirectPath(searchParams.get("next"), "/dashboard");
  const verificationStatus = searchParams.get("verified");
  const callbackError = searchParams.get("error");

  const [email, setEmail] = React.useState("sora@pixelforge.studio");
  const [password, setPassword] = React.useState("ForgeStudio2026!");
  const [fieldErrors, setFieldErrors] = React.useState<{
    email?: string;
    password?: string;
  }>({});
  const [serverError, setServerError] = React.useState<string | null>(
    callbackError
      ? "Email verification link expired or could not be validated. Please sign in or request a new link."
      : null
  );
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setServerError(null);

    const parsed = loginSchema.safeParse({ email, password, next: nextPath });
    if (!parsed.success) {
      const nextErrors: { email?: string; password?: string } = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (key === "email" && !nextErrors.email) {
          nextErrors.email = issue.message;
        }
        if (key === "password" && !nextErrors.password) {
          nextErrors.password = issue.message;
        }
      }
      setFieldErrors(nextErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      const payload = await response.json();

      if (!response.ok) {
        setServerError(
          payload?.error?.message || "Invalid email address or password."
        );
        return;
      }

      toast({
        title: "Authenticated with PIXELFORGE",
        description: `Welcome back, ${payload?.data?.user?.email ?? email}.`,
        variant: "success",
      });

      const destination = sanitizeRedirectPath(
        payload?.data?.redirectTo ?? nextPath,
        "/dashboard"
      );
      router.push(destination);
      router.refresh();
    } catch {
      setServerError(
        "Network error while contacting authentication server. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md border-border-strong p-6 sm:p-8 shadow-forge-card">
      <div className="flex items-center justify-between">
        <Badge variant="primary">STUDIO AUTHENTICATION</Badge>
        <span className="font-mono text-[11px] text-foreground-muted">
          SSR SESSION
        </span>
      </div>

      <h1 className="mt-4 text-2xl font-bold text-foreground">
        Sign In to PIXELFORGE
      </h1>
      <p className="mt-1 text-sm text-foreground-muted">
        Access your creative asset library, projects, and client review
        workflows.
      </p>

      {verificationStatus === "pending" && (
        <div
          role="status"
          className="mt-4 flex items-start gap-2.5 rounded-md border border-status-success/40 bg-status-success/10 p-3 text-xs text-status-success"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            Account registered. Please check your email inbox to verify your
            address before signing in.
          </span>
        </div>
      )}

      {serverError && (
        <div
          role="alert"
          className="mt-4 flex items-start gap-2.5 rounded-md border border-status-error/40 bg-status-error/10 p-3 text-xs text-status-error"
        >
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{serverError}</span>
        </div>
      )}

      <form onSubmit={handleSignIn} noValidate className="mt-6 space-y-4">
        <div>
          <Label htmlFor="email">Studio Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={fieldErrors.email}
            required
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot-password"
              className="text-xs text-accent-secondary hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldErrors.password}
            required
          />
        </div>

        <Button
          type="submit"
          variant="gradient"
          className="w-full"
          isLoading={isSubmitting}
        >
          <Sparkles className="h-4 w-4" />
          Sign In to Studio
          <ArrowRight className="h-4 w-4" />
        </Button>
      </form>

      <div className="mt-6 flex items-center justify-between border-t border-border pt-4 text-xs text-foreground-muted">
        <span className="inline-flex items-center gap-1.5">
          <Lock className="h-3.5 w-3.5 text-accent-primary" />
          Protected by RLS + SSR Cookies
        </span>
        <Link href="/signup" className="text-accent-primary hover:underline">
          Create account →
        </Link>
      </div>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12 forge-grid-bg">
      <div className="mb-8">
        <Logo />
      </div>
      <React.Suspense
        fallback={<Skeleton className="h-96 w-full max-w-md rounded-lg" />}
      >
        <LoginFormContent />
      </React.Suspense>
    </div>
  );
}
