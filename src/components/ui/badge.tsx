import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors border",
  {
    variants: {
      variant: {
        default:
          "bg-background-elevated text-foreground border-border",
        primary:
          "bg-accent-primary/15 text-accent-primary border-accent-primary/30",
        cyan:
          "bg-accent-secondary/15 text-accent-secondary border-accent-secondary/30",
        success:
          "bg-status-success/15 text-status-success border-status-success/30",
        warning:
          "bg-status-warning/15 text-status-warning border-status-warning/30",
        error:
          "bg-status-error/15 text-status-error border-status-error/30",
        outline:
          "bg-transparent text-foreground-muted border-border",
        mono:
          "rounded bg-background-secondary px-2 py-0.5 font-mono text-[11px] uppercase tracking-wider text-foreground-muted border-border",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
