import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

export const LOCAL_SESSION_COOKIE = "pf_session";

export interface AuthenticatedSessionUser {
  id: string;
  email: string;
  displayName: string;
  username: string;
  role: "owner" | "client";
  emailVerified: boolean;
}

/**
 * Encodes a local development session payload into a Base64URL cookie value.
 * Used only when NEXT_PUBLIC_SUPABASE_URL is not configured in local dev/testing.
 */
export function encodeLocalSession(user: AuthenticatedSessionUser): string {
  return Buffer.from(JSON.stringify(user), "utf8").toString("base64url");
}

export function decodeLocalSession(
  raw: string | undefined
): AuthenticatedSessionUser | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(raw, "base64url").toString("utf8")
    ) as Partial<AuthenticatedSessionUser>;
    if (
      !parsed ||
      typeof parsed.id !== "string" ||
      typeof parsed.email !== "string" ||
      (parsed.role !== "owner" && parsed.role !== "client")
    ) {
      return null;
    }
    return {
      id: parsed.id,
      email: parsed.email,
      displayName: parsed.displayName || parsed.email.split("@")[0],
      username: parsed.username || "studio-user",
      role: parsed.role,
      emailVerified: Boolean(parsed.emailVerified ?? true),
    };
  } catch {
    return null;
  }
}

/**
 * Resolves the currently authenticated user on the server.
 * Never trusts client-provided headers or query parameters for user identity.
 */
export async function getServerSessionUser(): Promise<AuthenticatedSessionUser | null> {
  const { isConfigured } = getSupabasePublicConfig();

  if (isConfigured) {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return null;

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user || !user.email) {
      return null;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, username, role")
      .eq("id", user.id)
      .maybeSingle();

    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    const resolvedRole =
      profile?.role === "client" || meta.role === "client" ? "client" : "owner";

    return {
      id: user.id,
      email: user.email,
      displayName:
        profile?.display_name ||
        (typeof meta.display_name === "string"
          ? meta.display_name
          : user.email.split("@")[0]),
      username:
        profile?.username ||
        (typeof meta.username === "string"
          ? meta.username
          : `user-${user.id.slice(0, 6)}`),
      role: resolvedRole,
      emailVerified: Boolean(user.email_confirmed_at),
    };
  }

  // Fallback for local development when external Supabase credentials are not set
  const cookieStore = await cookies();
  const rawSession = cookieStore.get(LOCAL_SESSION_COOKIE)?.value;
  return decodeLocalSession(rawSession);
}

/**
 * Pure RBAC authorization helpers (used in API Route Handlers and tested in Vitest)
 */
export interface ResourceProject {
  id: string;
  ownerId: string;
  visibility: "private" | "public";
  archivedAt?: string | null;
  acceptedMemberUserIds?: string[];
}

export interface ResourceAsset {
  id: string;
  ownerId: string;
  visibility: "private" | "public";
  deletedAt?: string | null;
  authorizedProjectMemberUserIds?: string[];
}

export function canUserReadProject(
  user: Pick<AuthenticatedSessionUser, "id" | "role"> | null,
  project: ResourceProject
): boolean {
  if (project.visibility === "public" && !project.archivedAt) {
    return true;
  }
  if (!user) return false;
  if (project.ownerId === user.id) return true;
  if (project.acceptedMemberUserIds?.includes(user.id)) return true;
  return false;
}

export function canUserMutateProject(
  user: Pick<AuthenticatedSessionUser, "id" | "role"> | null,
  project: ResourceProject
): boolean {
  if (!user) return false;
  return user.role === "owner" && project.ownerId === user.id;
}

export function canUserReadAsset(
  user: Pick<AuthenticatedSessionUser, "id" | "role"> | null,
  asset: ResourceAsset
): boolean {
  if (asset.deletedAt) return false;
  if (asset.visibility === "public") return true;
  if (!user) return false;
  if (asset.ownerId === user.id) return true;
  if (asset.authorizedProjectMemberUserIds?.includes(user.id)) return true;
  return false;
}

export function canUserMutateAsset(
  user: Pick<AuthenticatedSessionUser, "id" | "role"> | null,
  asset: ResourceAsset
): boolean {
  if (!user || asset.deletedAt) return false;
  return user.role === "owner" && asset.ownerId === user.id;
}
