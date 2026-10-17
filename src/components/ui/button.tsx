import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 select-none",
  {
    variants: {
      variant: {
        primary:
          "bg-accent-primary text-[#09090F] font-semibold hover:opacity-90 shadow-forge-glow-primary",
        gradient:
          "bg-forge-gradient text-[#09090F] font-semibold hover:opacity-95 shadow-forge-glow-primary",
        secondary:
          "bg-accent-secondary/15 text-accent-secondary border border-accent-secondary/35 hover:bg-accent-secondary/25",
        outline:
          "border border-border bg-background-card/60 text-foreground hover:border-accent-primary/50 hover:bg-background-elevated/70",
        ghost:
          "text-foreground-muted hover:text-foreground hover:bg-background-elevated/60",
        destructive:
          "bg-status-error/15 text-status-error border border-status-error/35 hover:bg-status-error/25",
        glass:
          "forge-glass border border-border text-foreground hover:border-accent-primary/40",
      },
      size: {
        sm: "h-8 px-3 text-xs rounded",
        md: "h-10 px-4 py-2",
        lg: "h-11 px-6 text-base rounded-lg",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, isLoading = false, children, disabled, ...props },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin shrink-0" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export { buttonVariants };
