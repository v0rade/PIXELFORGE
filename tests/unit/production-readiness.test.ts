import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { GET as healthGet } from "@/app/api/v1/health/route";
import { logger, redactSensitiveFields } from "@/lib/logger";

describe("Phase 8 — Production Readiness, Health Check, Structured Logging & Environment Hygiene", () => {
  it("returns safe operational status from GET /api/v1/health with no-store cache headers and zero leaked secrets", async () => {
    const response = await healthGet();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store, max-age=0");

    const payload = await response.json();
    expect(payload.data.status).toBe("ok");
    expect(payload.data.service).toBe("pixelforge-creative-asset-studio");
    expect(payload.data.version).toBe("1.0.0");
    expect(payload.data.capabilities).toEqual({
      databaseMode: "local_studio",
      storageMode: "local_studio",
      transactionalEmail: "unconfigured",
    });

    const serialized = JSON.stringify(payload);
    expect(serialized).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(serialized).not.toContain("RESEND_API_KEY");
  });

  it("redacts sensitive credentials, tokens, hashes, and service keys in structured production logs", () => {
    const rawContext = {
      userId: "usr_owner_01",
      action: "invitation_issued",
      password: "SuperSecretPassword123!",
      rawToken: "abcdef0123456789abcdef0123456789",
      nested: {
        supabaseServiceRoleKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.secret",
        authorizationHeader: "Bearer secret-jwt",
        safeField: "Brand Identity",
      },
    };

    const sanitized = redactSensitiveFields(rawContext) as Record<
      string,
      unknown
    >;
    expect(sanitized.userId).toBe("usr_owner_01");
    expect(sanitized.action).toBe("invitation_issued");
    expect(sanitized.password).toBe("[REDACTED]");
    expect(sanitized.rawToken).toBe("[REDACTED]");

    const nested = sanitized.nested as Record<string, unknown>;
    expect(nested.supabaseServiceRoleKey).toBe("[REDACTED]");
    expect(nested.authorizationHeader).toBe("[REDACTED]");
    expect(nested.safeField).toBe("Brand Identity");

    const entry = logger.info("audit_verification", rawContext);
    expect(entry.level).toBe("info");
    expect(entry.event).toBe("audit_verification");
    expect(JSON.stringify(entry)).not.toContain("SuperSecretPassword123!");
    expect(JSON.stringify(entry)).not.toContain("secret-jwt");
  });

  it("validates .env.example template completeness and ensures no live secrets are committed", () => {
    const rootDir = process.cwd();
    const envExamplePath = path.join(rootDir, ".env.example");
    expect(fs.existsSync(envExamplePath)).toBe(true);

    const envExampleContent = fs.readFileSync(envExamplePath, "utf8");
    expect(envExampleContent).toContain("NEXT_PUBLIC_APP_URL=");
    expect(envExampleContent).toContain("NEXT_PUBLIC_SUPABASE_URL=");
    expect(envExampleContent).toContain("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=");
    expect(envExampleContent).toContain("SUPABASE_SERVICE_ROLE_KEY=");
    expect(envExampleContent).toContain("RESEND_API_KEY=");

    // Ensure secret keys in .env.example have empty placeholder values
    expect(envExampleContent).toMatch(/^SUPABASE_SERVICE_ROLE_KEY=\s*$/m);
    expect(envExampleContent).toMatch(/^RESEND_API_KEY=\s*$/m);

    // Ensure .gitignore blocks .env files while allowing .env.example
    const gitignoreContent = fs.readFileSync(
      path.join(rootDir, ".gitignore"),
      "utf8"
    );
    expect(gitignoreContent).toContain(".env");
    expect(gitignoreContent).toContain("!.env.example");

    // Ensure vercel.json exists and is valid JSON
    const vercelConfigPath = path.join(rootDir, "vercel.json");
    expect(fs.existsSync(vercelConfigPath)).toBe(true);
    const vercelConfig = JSON.parse(fs.readFileSync(vercelConfigPath, "utf8"));
    expect(vercelConfig.framework).toBe("nextjs");
  });
});
