"use client";

import * as React from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, CheckCircle2, KeyRound } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { forgotPasswordSchema } from "@/lib/validation/auth";

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [email, setEmail] = React.useState("");
  const [fieldError, setFieldError] = React.useState<string | undefined>();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [sentMessage, setSentMessage] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError(undefined);
    setServerError(null);
    setSentMessage(null);

    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/v1/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const payload = await response.json();

      if (!response.ok) {
        setServerError(
          payload?.error?.message || "Unable to request password reset."
        );
        return;
      }

      const msg =
        payload?.data?.message ||
        "If an account exists for that email address, recovery instructions have been sent.";
      setSentMessage(msg);
      toast({
        title: "Recovery link dispatched",
        description: msg,
        variant: "success",
      });
    } catch {
      setServerError("Network error while requesting password reset.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12 forge-grid-bg">
      <div className="mb-8">
        <Logo />
      </div>

      <Card className="w-full max-w-md border-border-strong p-6 sm:p-8 shadow-forge-card">
        <h1 className="text-2xl font-bold text-foreground">Reset Password</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Enter your studio email address to receive a password reset link.
        </p>

        {serverError && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2.5 rounded-md border border-status-error/40 bg-status-error/10 p-3 text-xs text-status-error"
          >
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{serverError}</span>
          </div>
        )}

        {sentMessage && (
          <div
            role="status"
            className="mt-4 flex items-start gap-2.5 rounded-md border border-status-success/40 bg-status-success/10 p-3 text-xs text-status-success"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{sentMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
          <div>
            <Label htmlFor="resetEmail">Email Address</Label>
            <Input
              id="resetEmail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="sora@pixelforge.studio"
              error={fieldError}
              required
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            isLoading={isSubmitting}
          >
            <KeyRound className="h-4 w-4" />
            Send Recovery Link
          </Button>
        </form>

        <div className="mt-6 border-t border-border pt-4">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs text-foreground-muted hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Sign In
          </Link>
        </div>
      </Card>
    </div>
  );
}
