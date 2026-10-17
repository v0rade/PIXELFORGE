import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import {
  loginSchema,
  signupSchema,
  updateProfileSchema,
} from "@/lib/validation/auth";
import { sanitizeRedirectPath } from "@/lib/supabase/config";
import {
  canUserMutateAsset,
  canUserMutateProject,
  canUserReadAsset,
  canUserReadProject,
  decodeLocalSession,
  encodeLocalSession,
  LOCAL_SESSION_COOKIE,
} from "@/lib/auth/session";
import { updateSessionAndProtectRoutes } from "@/lib/supabase/middleware";

describe("Phase 2 — Authentication, Redirect Security, Middleware & RBAC Unit Tests", () => {
  it("validates login, signup, and reserved username schemas accurately", () => {
    expect(
      loginSchema.safeParse({
        email: "sora@pixelforge.studio",
        password: "ValidPassword123",
      }).success
    ).toBe(true);

    expect(
      loginSchema.safeParse({
        email: "not-an-email",
        password: "short",
      }).success
    ).toBe(false);

    // Reserved usernames like 'dashboard' or 'admin' must be rejected
    const reservedSignup = signupSchema.safeParse({
      displayName: "Admin User",
      username: "dashboard",
      email: "admin@pixelforge.studio",
      password: "StrongPassword123!",
      role: "owner",
    });
    expect(reservedSignup.success).toBe(false);

    const validProfileUpdate = updateProfileSchema.safeParse({
      displayName: "Sora Vance",
      username: "sora-vance-studio",
      bio: "Visual systems designer.",
      websiteUrl: "https://pixelforge.studio",
    });
    expect(validProfileUpdate.success).toBe(true);
  });

  it("prevents Open Redirect attacks via sanitizeRedirectPath", () => {
    expect(sanitizeRedirectPath("/dashboard/projects")).toBe(
      "/dashboard/projects"
    );
    expect(sanitizeRedirectPath("https://malicious.example.com")).toBe(
      "/dashboard"
    );
    expect(sanitizeRedirectPath("//malicious.example.com")).toBe("/dashboard");
    expect(sanitizeRedirectPath("/\\malicious.example.com")).toBe("/dashboard");
    expect(sanitizeRedirectPath(null)).toBe("/dashboard");
  });

  it("enforces RBAC read and mutation rules for anonymous users, owners, unrelated users, and clients", () => {
    const ownerA = { id: "user-a", role: "owner" as const };
    const userB = { id: "user-b", role: "owner" as const };
    const clientC = { id: "user-c", role: "client" as const };

    const privateProject = {
      id: "prj-private",
      ownerId: "user-a",
      visibility: "private" as const,
      acceptedMemberUserIds: ["user-c"],
    };

    const publicProject = {
      id: "prj-public",
      ownerId: "user-a",
      visibility: "public" as const,
    };

    // Anonymous access
    expect(canUserReadProject(null, publicProject)).toBe(true);
    expect(canUserReadProject(null, privateProject)).toBe(false);
    expect(canUserMutateProject(null, publicProject)).toBe(false);

    // Unrelated user B
    expect(canUserReadProject(userB, privateProject)).toBe(false);
    expect(canUserMutateProject(userB, privateProject)).toBe(false);

    // Invited client C
    expect(canUserReadProject(clientC, privateProject)).toBe(true);
    expect(canUserMutateProject(clientC, privateProject)).toBe(false);

    // Owner A
    expect(canUserReadProject(ownerA, privateProject)).toBe(true);
    expect(canUserMutateProject(ownerA, privateProject)).toBe(true);

    const privateAsset = {
      id: "ast-private",
      ownerId: "user-a",
      visibility: "private" as const,
      authorizedProjectMemberUserIds: ["user-c"],
    };

    expect(canUserReadAsset(null, privateAsset)).toBe(false);
    expect(canUserReadAsset(userB, privateAsset)).toBe(false);
    expect(canUserReadAsset(clientC, privateAsset)).toBe(true);
    expect(canUserMutateAsset(clientC, privateAsset)).toBe(false);
    expect(canUserMutateAsset(ownerA, privateAsset)).toBe(true);
  });

  it("redirects unauthenticated visitors away from /dashboard and authenticated users away from /login", async () => {
    // 1. Unauthenticated request to /dashboard/assets -> Redirects to /login?next=%2Fdashboard%2Fassets
    const unauthReq = new NextRequest(
      "http://localhost:3000/dashboard/assets"
    );
    const unauthRes = await updateSessionAndProtectRoutes(unauthReq);
    expect(unauthRes.status).toBe(307);
    expect(unauthRes.headers.get("location")).toBe(
      "http://localhost:3000/login?next=%2Fdashboard%2Fassets"
    );

    // 2. Authenticated request to /login -> Redirects to /dashboard
    const token = encodeLocalSession({
      id: "11111111-1111-4111-8111-111111111111",
      email: "sora@pixelforge.studio",
      displayName: "Sora Vance",
      username: "sora-vance",
      role: "owner",
      emailVerified: true,
    });
    expect(decodeLocalSession(token)?.email).toBe("sora@pixelforge.studio");

    const authLoginReq = new NextRequest("http://localhost:3000/login", {
      headers: {
        cookie: `${LOCAL_SESSION_COOKIE}=${token}`,
      },
    });
    const authLoginRes = await updateSessionAndProtectRoutes(authLoginReq);
    expect(authLoginRes.status).toBe(307);
    expect(authLoginRes.headers.get("location")).toBe(
      "http://localhost:3000/dashboard"
    );
  });
});
