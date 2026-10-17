import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: "var(--bg-main)",
          secondary: "var(--bg-secondary)",
          card: "var(--bg-card)",
          elevated: "var(--bg-elevated)",
        },
        foreground: {
          DEFAULT: "var(--text-main)",
          muted: "var(--text-muted)",
        },
        accent: {
          primary: "var(--accent-primary)",
          secondary: "var(--accent-secondary)",
        },
        status: {
          success: "var(--status-success)",
          warning: "var(--status-warning)",
          error: "var(--status-error)",
        },
        border: {
          DEFAULT: "var(--border-subtle)",
          strong: "var(--border-strong)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
      },
      backgroundImage: {
        "forge-gradient":
          "linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)",
        "forge-glow":
          "radial-gradient(circle at 50% 0%, rgba(167, 139, 250, 0.16), rgba(34, 211, 238, 0.06) 45%, transparent 75%)",
        "grid-pattern":
          "linear-gradient(to right, var(--grid-line) 1px, transparent 1px), linear-gradient(to bottom, var(--grid-line) 1px, transparent 1px)",
      },
      boxShadow: {
        "forge-sm": "0 1px 2px 0 rgba(0, 0, 0, 0.35)",
        "forge-card":
          "0 8px 30px -6px rgba(0, 0, 0, 0.45), 0 0 0 1px var(--border-subtle)",
        "forge-glow-primary": "0 0 24px -4px rgba(167, 139, 250, 0.35)",
        "forge-glow-cyan": "0 0 24px -4px rgba(34, 211, 238, 0.3)",
      },
      borderRadius: {
        lg: "0.625rem",
        md: "0.5rem",
        sm: "0.375rem",
      },
    },
  },
  plugins: [],
};

export default config;
