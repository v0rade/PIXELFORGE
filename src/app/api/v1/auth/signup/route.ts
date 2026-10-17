import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { signupSchema } from "@/lib/validation/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import {
  encodeLocalSession,
  LOCAL_SESSION_COOKIE,
  type AuthenticatedSessionUser,
} from "@/lib/auth/session";
import { slugify } from "@/lib/utils/format";
import {
  checkRateLimit,
  getRequestClientIdentifier,
} from "@/lib/security/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const clientKey = getRequestClientIdentifier(request, "auth:signup");
    const rateLimit = checkRateLimit(clientKey, {
      maxRequests: 5,
      windowMs: 60_000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: `Too many registration attempts. Please wait ${rateLimit.retryAfterSeconds}s before retrying.`,
          },
        },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
        }
      );
    }

    const body = await request.json();
    const parsed = signupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message:
              parsed.error.issues[0]?.message ??
              "The submitted registration data is invalid.",
          },
        },
        { status: 400 }
      );
    }

    const { displayName, email, password, username, role } = parsed.data;
    const resolvedUsername =
      username ||
      slugify(displayName) ||
      slugify(email.split("@")[0]) ||
      "studio-creator";

    const { isConfigured } = getSupabasePublicConfig();

    if (isConfigured) {
      const supabase = await createSupabaseServerClient();
      if (!supabase) {
        return NextResponse.json(
          {
            error: {
              code: "AUTH_CONFIGURATION_ERROR",
              message: "Authentication service is currently unavailable.",
            },
          },
          { status: 503 }
        );
      }

      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL?.trim() || request.nextUrl.origin;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${appUrl}/auth/callback`,
          data: {
            display_name: displayName,
            username: resolvedUsername,
            role,
          },
        },
      });

      if (error || !data.user) {
        return NextResponse.json(
          {
            error: {
              code: "SIGNUP_FAILED",
              message:
                error?.message || "Unable to complete account registration.",
            },
          },
          { status: 400 }
        );
      }

      // Ensure profile row exists if session is immediately active
      if (data.session) {
        await supabase.from("profiles").upsert(
          {
            id: data.user.id,
            display_name: displayName,
            username: `${resolvedUsername.slice(0, 28)}-${data.user.id.slice(0, 6)}`,
            role,
          },
          { onConflict: "id" }
        );
      }

      return NextResponse.json(
        {
          data: {
            user: {
              id: data.user.id,
              email: data.user.email,
              displayName,
              username: resolvedUsername,
              role,
            },
            requiresEmailVerification: !data.session,
            redirectTo: data.session ? "/dashboard" : "/login?verified=pending",
          },
        },
        { status: 201 }
      );
    }

    // Local development registration & profile initialization
    const sessionUser: AuthenticatedSessionUser = {
      id: "11111111-1111-4111-8111-111111111111",
      email: email.toLowerCase(),
      displayName,
      username: resolvedUsername,
      role,
      emailVerified: true,
    };

    const cookieStore = await cookies();
    cookieStore.set(LOCAL_SESSION_COOKIE, encodeLocalSession(sessionUser), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return NextResponse.json(
      {
        data: {
          user: sessionUser,
          requiresEmailVerification: false,
          redirectTo: "/dashboard",
        },
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_REQUEST",
          message: "Unable to process registration request.",
        },
      },
      { status: 400 }
    );
  }
}
