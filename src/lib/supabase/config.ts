/**
 * Supabase Environment Configuration Helper
 * Never exposes SUPABASE_SERVICE_ROLE_KEY to browser code.
 */

export function getSupabasePublicConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    "";

  const isConfigured = Boolean(
    url &&
      publishableKey &&
      url.startsWith("http") &&
      !url.includes("your-project")
  );

  return {
    url,
    publishableKey,
    isConfigured,
  };
}

/**
 * Validates and sanitizes internal redirect paths to prevent Open Redirect vulnerabilities.
 */
export function sanitizeRedirectPath(
  nextPath: string | null | undefined,
  fallback = "/dashboard"
): string {
  if (!nextPath || typeof nextPath !== "string") {
    return fallback;
  }
  const trimmed = nextPath.trim();
  // Must start with a single slash and not '//' or '/\' or contain protocol schemes
  if (
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    trimmed.startsWith("/\\") ||
    trimmed.includes("://")
  ) {
    return fallback;
  }
  return trimmed;
}
