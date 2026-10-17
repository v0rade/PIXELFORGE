import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  getSupabasePublicConfig,
  sanitizeRedirectPath,
} from "@/lib/supabase/config";
import {
  decodeLocalSession,
  LOCAL_SESSION_COOKIE,
} from "@/lib/auth/session";

const PROTECTED_PREFIXES = ["/dashboard"];
const AUTH_PAGES = new Set(["/login", "/signup", "/forgot-password"]);

export async function updateSessionAndProtectRoutes(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const { url, publishableKey, isConfigured } = getSupabasePublicConfig();
  let isAuthenticated = false;

  if (isConfigured) {
    const supabase = createServerClient(url, publishableKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options: CookieOptions;
          }[]
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();
    isAuthenticated = Boolean(user);
  } else {
    const localCookie = request.cookies.get(LOCAL_SESSION_COOKIE)?.value;
    isAuthenticated = Boolean(decodeLocalSession(localCookie));
  }

  const { pathname } = request.nextUrl;
  const isProtectedRoute = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  const isAuthPage = AUTH_PAGES.has(pathname);

  if (isProtectedRoute && !isAuthenticated) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", sanitizeRedirectPath(pathname));
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPage && isAuthenticated) {
    const requestedNext = request.nextUrl.searchParams.get("next");
    const targetPath = sanitizeRedirectPath(requestedNext, "/dashboard");
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = targetPath;
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
