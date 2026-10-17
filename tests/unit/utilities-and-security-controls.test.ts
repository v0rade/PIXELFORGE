import fs from "node:fs";
import path from "node:path";
import { describe, it, expect, beforeEach } from "vitest";
import {
  formatFileSize,
  formatDate,
  formatTechnicalTimestamp,
  slugify,
} from "@/lib/utils/format";
import {
  checkRateLimit,
  getRequestClientIdentifier,
  resetRateLimitStore,
} from "@/lib/security/rate-limit";
import { SECURITY_HEADERS } from "@/lib/security/headers";

function collectSourceFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(fullPath));
    } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
      files.push(fullPath);
    }
  }
  return files;
}

describe("Phase 7 — Utilities, Rate Limiting, Security Headers & Secret Isolation Unit Tests", () => {
  beforeEach(() => {
    resetRateLimitStore();
  });

  it("formats file sizes, dates, technical timestamps, and URL-safe slugs accurately across edge cases", () => {
    // formatFileSize
    expect(formatFileSize(-500)).toBe("0 B");
    expect(formatFileSize(Number.NaN)).toBe("0 B");
    expect(formatFileSize(Number.POSITIVE_INFINITY)).toBe("0 B");
    expect(formatFileSize(0)).toBe("0 B");
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(1536)).toBe("1.5 KB");
    expect(formatFileSize(15 * 1024)).toBe("15 KB");
    expect(formatFileSize(4.8 * 1024 * 1024)).toBe("4.8 MB");
    expect(formatFileSize(2.5 * 1024 * 1024 * 1024)).toBe("2.5 GB");

    // formatDate & formatTechnicalTimestamp
    expect(formatDate("invalid-date")).toBe("invalid-date");
    expect(formatTechnicalTimestamp("invalid-date")).toBe("invalid-date");
    expect(formatDate("2026-10-14T14:30:00.000Z")).toContain("2026");
    expect(formatTechnicalTimestamp("2026-10-14T14:30:00.000Z")).toBe(
      "2026.10.14 · 14:30 UTC"
    );

    // slugify
    expect(slugify("  Aether OS // Brand Identity 2026!  ")).toBe(
      "aether-os-brand-identity-2026"
    );
    expect(slugify("---Multiple___Separators---")).toBe("multiple-separators");
    expect(slugify("!!!")).toBe("");
  });

  it("enforces sliding-window rate limiting and extracts client identifiers safely", () => {
    const key = "test:endpoint:198.51.100.42";
    const first = checkRateLimit(key, { maxRequests: 3, windowMs: 10_000 }, 1000);
    expect(first.allowed).toBe(true);
    expect(first.remaining).toBe(2);

    const second = checkRateLimit(
      key,
      { maxRequests: 3, windowMs: 10_000 },
      2000
    );
    expect(second.allowed).toBe(true);
    expect(second.remaining).toBe(1);

    const third = checkRateLimit(key, { maxRequests: 3, windowMs: 10_000 }, 3000);
    expect(third.allowed).toBe(true);
    expect(third.remaining).toBe(0);

    // 4th request inside the 10-second window must be rejected
    const fourth = checkRateLimit(
      key,
      { maxRequests: 3, windowMs: 10_000 },
      4000
    );
    expect(fourth.allowed).toBe(false);
    expect(fourth.remaining).toBe(0);
    expect(fourth.retryAfterSeconds).toBe(7);

    //Request after window expires is allowed again
    const afterWindow = checkRateLimit(
      key,
      { maxRequests: 3, windowMs: 10_000 },
      11_500
    );
    expect(afterWindow.allowed).toBe(true);
    expect(afterWindow.remaining).toBe(2);

    // Client identifier extraction from proxy headers
    const reqForwarded = new Request("http://localhost:3000/api/v1/auth/login", {
      headers: { "x-forwarded-for": "203.0.113.195, 70.41.3.18" },
    });
    expect(getRequestClientIdentifier(reqForwarded, "auth:login")).toBe(
      "auth:login:203.0.113.195"
    );

    const reqRealIp = new Request("http://localhost:3000/api/v1/auth/login", {
      headers: { "x-real-ip": "192.0.2.44" },
    });
    expect(getRequestClientIdentifier(reqRealIp, "auth:login")).toBe(
      "auth:login:192.0.2.44"
    );

    const reqNoIp = new Request("http://localhost:3000/api/v1/auth/login");
    expect(getRequestClientIdentifier(reqNoIp, "auth:login")).toBe(
      "auth:login:127.0.0.1"
    );
  });

  it("defines hardened HTTP security headers including CSP, HSTS, X-Frame-Options, and nosniff", () => {
    const headerMap = new Map(
      SECURITY_HEADERS.map((item) => [item.key, item.value])
    );

    expect(headerMap.get("X-Frame-Options")).toBe("DENY");
    expect(headerMap.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headerMap.get("Referrer-Policy")).toBe(
      "strict-origin-when-cross-origin"
    );
    expect(headerMap.get("Strict-Transport-Security")).toContain(
      "max-age=63072000"
    );
    expect(headerMap.get("Permissions-Policy")).toContain("camera=()");

    const csp = headerMap.get("Content-Security-Policy") ?? "";
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
  });

  it("ensures no client component ('use client') references SUPABASE_SERVICE_ROLE_KEY or server secrets", () => {
    const srcDir = path.resolve(process.cwd(), "src");
    const allFiles = collectSourceFiles(srcDir);
    const clientFiles = allFiles.filter((filePath) => {
      const content = fs.readFileSync(filePath, "utf8");
      return (
        content.includes('"use client"') || content.includes("'use client'")
      );
    });

    expect(clientFiles.length).toBeGreaterThan(0);

    for (const filePath of clientFiles) {
      const content = fs.readFileSync(filePath, "utf8");
      expect(content).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
      expect(content).not.toContain("createSupabaseServiceClient");
      expect(content).not.toContain("process.env.DATABASE_URL");
    }
  });
});
