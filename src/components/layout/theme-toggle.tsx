"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/layout/theme-provider";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      className="border border-border bg-background-card/60"
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4 text-accent-secondary" />
      ) : (
        <Moon className="h-4 w-4 text-accent-primary" />
      )}
    </Button>
  );
}
