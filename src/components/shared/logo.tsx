import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";

export interface LogoProps {
  compact?: boolean;
  href?: string;
  className?: string;
}

export function Logo({ compact = false, href = "/", className }: LogoProps) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary rounded-md",
        className
      )}
    >
      <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-accent-primary/40 bg-background-card shadow-forge-glow-primary transition-transform duration-200 group-hover:scale-105">
        <svg
          viewBox="0 0 28 28"
          fill="none"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <path
            d="M14 3L24 8.77V19.23L14 25L4 19.23V8.77L14 3Z"
            stroke="url(#pf-logo-grad)"
            strokeWidth="2"
          />
          <path
            d="M14 8L19.5 11.2V16.8L14 20L8.5 16.8V11.2L14 8Z"
            fill="url(#pf-logo-grad)"
            fillOpacity="0.22"
            stroke="#22D3EE"
            strokeWidth="1.4"
          />
          <circle cx="14" cy="14" r="2" fill="#F4F4F8" />
          <defs>
            <linearGradient
              id="pf-logo-grad"
              x1="4"
              y1="3"
              x2="24"
              y2="25"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#A78BFA" />
              <stop offset="1" stopColor="#22D3EE" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      {!compact && (
        <div className="flex flex-col leading-none">
          <span className="font-sans text-sm font-bold tracking-[0.14em] text-foreground">
            PIXEL<span className="text-accent-primary">FORGE</span>
          </span>
          <span className="font-mono text-[10px] tracking-widest text-foreground-muted">
            STUDIO OS
          </span>
        </div>
      )}
    </Link>
  );
}
