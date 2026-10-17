import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { loginSchema } from "@/lib/validation/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getSupabasePublicConfig,
  sanitizeRedirectPath,
} from "@/lib/supabase/config";
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
    const clientKey = getRequestClientIdentifier(request, "auth:login");
    const rateLimit = checkRateLimit(clientKey, {
      maxRequests: 10,
      windowMs: 60_000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: `Too many sign-in attempts. Please wait ${rateLimit.retryAfterSeconds}s before retrying.`,
          },
        },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
        }
      );
    }

    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message:
              parsed.error.issues[0]?.message ??
              "The submitted login credentials are invalid.",
          },
        },
        { status: 400 }
      );
    }

    const { email, password, next } = parsed.data;
    const redirectTo = sanitizeRedirectPath(next, "/dashboard");
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

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.user) {
        return NextResponse.json(
          {
            error: {
              code: "INVALID_CREDENTIALS",
              message: "Invalid email address or password.",
            },
          },
          { status: 401 }
        );
      }

      return NextResponse.json({
        data: {
          user: {
            id: data.user.id,
            email: data.user.email,
          },
          redirectTo,
        },
      });
    }

    // Local development session when Supabase URL/Key are not yet configured
    const isClientAccount = email.toLowerCase().includes("client");
    const sessionUser: AuthenticatedSessionUser = {
      id: isClientAccount
        ? "33333333-3333-4333-8333-333333333333"
        : "11111111-1111-4111-8111-111111111111",
      email: email.toLowerCase(),
      displayName:
        email.toLowerCase() === "sora@pixelforge.studio"
          ? "Sora Vance"
          : email.split("@")[0],
      username:
        email.toLowerCase() === "sora@pixelforge.studio"
          ? "sora-vance"
          : slugify(email.split("@")[0]) || "studio-user",
      role: isClientAccount ? "client" : "owner",
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

    return NextResponse.json({
      data: {
        user: sessionUser,
        redirectTo,
      },
    });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_REQUEST",
          message: "Unable to process sign-in request.",
        },
      },
      { status: 400 }
    );
  }
}
