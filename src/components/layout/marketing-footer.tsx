import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, Globe, Layers, ShieldCheck, Terminal } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { DEMO_DESIGNER_PROFILE } from "@/lib/demo/data";

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-background-secondary">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
          <div className="md:col-span-5 space-y-4">
            <Logo />
            <p className="max-w-sm text-sm text-foreground-muted leading-relaxed">
              Craft Ideas. Forge Visuals. A modern creative workspace where
              designers organize visual assets, manage projects, collaborate
              with clients, and publish high-craft portfolios.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1 font-mono text-xs text-foreground-muted">
              <span className="inline-flex items-center gap-1.5 rounded border border-border bg-background-card px-2.5 py-1">
                <span className="h-2 w-2 rounded-full bg-status-success" />
                SYSTEM READY · V1.0 PHASE-1
              </span>
              <span className="inline-flex items-center gap-1.5 rounded border border-border bg-background-card px-2.5 py-1">
                <ShieldCheck className="h-3.5 w-3.5 text-accent-secondary" />
                RLS + SIGNED STORAGE SPEC
              </span>
            </div>
          </div>

          <div className="md:col-span-2 space-y-3">
            <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-foreground">
              Public Showcase
            </h3>
            <ul className="space-y-2.5 text-sm text-foreground-muted">
              <li>
                <Link
                  href="/portfolio"
                  className="hover:text-accent-primary transition-colors"
                >
                  Work &amp; Case Studies
                </Link>
              </li>
              <li>
                <Link
                  href="/#services"
                  className="hover:text-accent-primary transition-colors"
                >
                  Creative Services
                </Link>
              </li>
              <li>
                <Link
                  href="/#process"
                  className="hover:text-accent-primary transition-colors"
                >
                  Studio Process
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="hover:text-accent-primary transition-colors"
                >
                  Designer Profile
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="hover:text-accent-primary transition-colors"
                >
                  Project Inquiry
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-3 space-y-3">
            <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-foreground">
              Studio Workspace
            </h3>
            <ul className="space-y-2.5 text-sm text-foreground-muted">
              <li>
                <Link
                  href="/dashboard"
                  className="hover:text-accent-primary transition-colors"
                >
                  Dashboard Overview
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard/assets"
                  className="hover:text-accent-primary transition-colors"
                >
                  Creative Asset Library
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard/projects"
                  className="hover:text-accent-primary transition-colors"
                >
                  Projects &amp; Revisions
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard/collections"
                  className="hover:text-accent-primary transition-colors"
                >
                  Curated Collections
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard/clients"
                  className="hover:text-accent-primary transition-colors"
                >
                  Client Collaboration Portal
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-2 space-y-3">
            <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-foreground">
              Connect
            </h3>
            <ul className="space-y-2.5 text-sm text-foreground-muted">
              {Object.entries(DEMO_DESIGNER_PROFILE.socialLinks).map(
                ([platform, url]) => (
                  <li key={platform}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 capitalize hover:text-accent-secondary transition-colors"
                    >
                      {platform}
                      <ArrowUpRight className="h-3 w-3" />
                    </a>
                  </li>
                )
              )}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 text-xs text-foreground-muted sm:flex-row">
          <p>
            © {new Date().getFullYear()} PIXELFORGE Creative Asset Studio. All
            rights reserved.
          </p>
          <div className="flex items-center gap-5 font-mono">
            <span className="inline-flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-accent-primary" />
              DESIGN TOKENS: ACTIVE
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Terminal className="h-3.5 w-3.5 text-accent-secondary" />
              STRICT TS
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-status-success" />
              UTC SYNC
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
