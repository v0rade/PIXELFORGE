"use client";

import * as React from "react";
import { CheckCircle2, Mail, Send, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import {
  contactInquirySchema,
  type ContactInquiryInput,
} from "@/lib/validation/contact";

export default function ContactPage() {
  const { toast } = useToast();
  const renderedAtRef = React.useRef<number>(0);

  React.useEffect(() => {
    renderedAtRef.current = Date.now();
  }, []);

  const [values, setValues] = React.useState<{
    senderName: string;
    senderEmail: string;
    subject: string;
    message: string;
    website_hp: string;
  }>({
    senderName: "",
    senderEmail: "",
    subject: "Brand Identity",
    message: "",
    website_hp: "",
  });

  const [errors, setErrors] = React.useState<
    Partial<Record<keyof ContactInquiryInput, string>>
  >({});
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setServerError(null);

    const payload: ContactInquiryInput = {
      senderName: values.senderName,
      senderEmail: values.senderEmail,
      subject: values.subject,
      message: values.message,
      website_hp: values.website_hp,
      renderedAt: renderedAtRef.current,
    };

    const parsed = contactInquirySchema.safeParse(payload);
    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof ContactInquiryInput, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof ContactInquiryInput;
        if (key && !fieldErrors[key]) {
          fieldErrors[key] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/v1/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(
          json?.error?.message || "Failed to submit project inquiry."
        );
      }

      setSubmitted(true);
      toast({
        title: "Project inquiry received",
        description:
          "Your creative brief has been recorded in the studio queue.",
        variant: "success",
      });
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Error submitting inquiry.";
      setServerError(msg);
      toast({
        title: "Submission Error",
        description: msg,
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="mb-10">
        <p className="font-mono text-xs uppercase tracking-widest text-accent-primary">
          PROJECT INQUIRY // COMMISSION PORTAL
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl">
          Initiate a Creative Brief
        </h1>
        <p className="mt-3 max-w-2xl text-sm sm:text-base text-foreground-muted leading-relaxed">
          Share your project scope, target deliverables, and desired schedule.
          Validated inquiries create an in-app notification for the studio
          owner.
        </p>
      </div>

      {submitted ? (
        <Card className="border-status-success/40 bg-status-success/5 p-8 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-status-success/15 text-status-success">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-foreground">
            Inquiry Received by PIXELFORGE Studio
          </h2>
          <p className="mx-auto max-w-md text-sm text-foreground-muted">
            Thank you,{" "}
            <span className="text-foreground font-medium">
              {values.senderName}
            </span>
            . Your brief regarding{" "}
            <span className="text-accent-secondary font-mono">
              {values.subject}
            </span>{" "}
            has been securely stored.
          </p>
          <div className="pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setSubmitted(false);
                renderedAtRef.current = Date.now();
                setValues({
                  senderName: "",
                  senderEmail: "",
                  subject: "Brand Identity",
                  message: "",
                  website_hp: "",
                });
              }}
            >
              Submit Another Inquiry
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="p-6 sm:p-8">
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {serverError && (
              <div className="rounded-md border border-status-error/30 bg-status-error/10 p-3 text-xs text-status-error">
                {serverError}
              </div>
            )}

            {/* Anti-Spam Honeypot field (hidden from legitimate users) */}
            <div
              style={{ display: "none" }}
              aria-hidden="true"
              tabIndex={-1}
              className="hidden"
            >
              <label htmlFor="website_hp">Leave this field blank</label>
              <input
                id="website_hp"
                type="text"
                name="website_hp"
                tabIndex={-1}
                autoComplete="off"
                value={values.website_hp}
                onChange={(e) =>
                  setValues((v) => ({ ...v, website_hp: e.target.value }))
                }
              />
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <Label htmlFor="senderName">Your Name *</Label>
                <Input
                  id="senderName"
                  value={values.senderName}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, senderName: e.target.value }))
                  }
                  placeholder="Elena Rostova"
                  error={errors.senderName}
                />
              </div>

              <div>
                <Label htmlFor="senderEmail">Email Address *</Label>
                <Input
                  id="senderEmail"
                  type="email"
                  value={values.senderEmail}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, senderEmail: e.target.value }))
                  }
                  placeholder="elena@organization.org"
                  error={errors.senderEmail}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="subject">Primary Service Discipline *</Label>
              <Select
                id="subject"
                value={values.subject}
                onChange={(e) =>
                  setValues((v) => ({ ...v, subject: e.target.value }))
                }
                error={errors.subject}
              >
                <option value="Brand Identity">Brand Identity</option>
                <option value="UI Visual Design">UI Visual Design</option>
                <option value="Digital Campaigns">Digital Campaigns</option>
                <option value="Social Media Design">Social Media Design</option>
                <option value="Marketing Collateral">
                  Marketing Collateral
                </option>
              </Select>
            </div>

            <div>
              <Label htmlFor="message">
                Project Brief, Deliverables &amp; Timeline *
              </Label>
              <Textarea
                id="message"
                rows={5}
                value={values.message}
                onChange={(e) =>
                  setValues((v) => ({ ...v, message: e.target.value }))
                }
                placeholder="Describe your visual goals, required formats (SVG, Figma UI kit, print dielines), and target launch window..."
                error={errors.message}
              />
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t border-border pt-5">
              <div className="flex items-center gap-2 text-xs text-foreground-muted font-mono">
                <ShieldCheck className="h-4 w-4 text-accent-secondary shrink-0" />
                <span>SERVER VALIDATION · BOT HONEYPOT PROTECTION</span>
              </div>
              <Button type="submit" variant="gradient" isLoading={isSubmitting}>
                <Send className="h-4 w-4" />
                Send Project Inquiry
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="mt-8 flex items-center justify-between rounded-lg border border-border bg-background-secondary px-5 py-4 text-xs text-foreground-muted">
        <span className="inline-flex items-center gap-2">
          <Mail className="h-4 w-4 text-accent-primary" />
          Already have a client invitation token?
        </span>
        <a
          href="/dashboard/clients"
          className="font-mono text-accent-secondary hover:underline"
        >
          Access Client Collaboration Portal →
        </a>
      </div>
    </div>
  );
}
