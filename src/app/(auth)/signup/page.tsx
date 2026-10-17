"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, UserPlus } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { signupSchema } from "@/lib/validation/auth";

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [displayName, setDisplayName] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [role, setRole] = React.useState<"owner" | "client">("owner");
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>(
    {}
  );
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setServerError(null);

    const parsed = signupSchema.safeParse({
      displayName,
      username: username.trim() ? username.trim().toLowerCase() : undefined,
      email,
      password,
      role,
    });

    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "");
        if (key && !nextErrors[key]) {
          nextErrors[key] = issue.message;
        }
      }
      setFieldErrors(nextErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/v1/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      const payload = await response.json();

      if (!response.ok) {
        setServerError(
          payload?.error?.message || "Unable to complete registration."
        );
        return;
      }

      toast({
        title: payload?.data?.requiresEmailVerification
          ? "Verify your email address"
          : "Studio account initialized",
        description: payload?.data?.requiresEmailVerification
          ? "Check your inbox for the verification link."
          : `Profile initialized for ${displayName}.`,
        variant: "success",
      });

      router.push(payload?.data?.redirectTo || "/dashboard");
      router.refresh();
    } catch {
      setServerError(
        "Network error while creating your account. Please try again."
      );
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
        <Badge variant="cyan">CREATE STUDIO ACCOUNT</Badge>
        <h1 className="mt-4 text-2xl font-bold text-foreground">
          Initialize Your Studio
        </h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Create a designer profile or register as a client collaborator.
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

        <form onSubmit={handleSignup} noValidate className="mt-6 space-y-4">
          <div>
            <Label htmlFor="displayName">Display Name *</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Sora Vance"
              error={fieldErrors.displayName}
              required
            />
          </div>

          <div>
            <Label htmlFor="username">Public Username Slug (Optional)</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="sora-vance"
              error={fieldErrors.username}
            />
          </div>

          <div>
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="designer@studio.com"
              error={fieldErrors.email}
              required
            />
          </div>

          <div>
            <Label htmlFor="role">Workspace Role</Label>
            <Select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as "owner" | "client")}
            >
              <option value="owner">Owner / Designer</option>
              <option value="client">Client Collaborator</option>
            </Select>
          </div>

          <div>
            <Label htmlFor="password">Password (min 8 chars) *</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a strong password"
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
            <UserPlus className="h-4 w-4" />
            Create Studio Account
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>

        <div className="mt-6 border-t border-border pt-4 text-center text-xs text-foreground-muted">
          Already have an account?{" "}
          <Link href="/login" className="text-accent-primary hover:underline">
            Sign in
          </Link>
        </div>
      </Card>
    </div>
  );
}
