import { NextResponse, type NextRequest } from "next/server";
import { forgotPasswordSchema } from "@/lib/validation/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import {
  checkRateLimit,
  getRequestClientIdentifier,
} from "@/lib/security/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const clientKey = getRequestClientIdentifier(
      request,
      "auth:forgot-password"
    );
    const rateLimit = checkRateLimit(clientKey, {
      maxRequests: 5,
      windowMs: 60_000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: `Too many password reset requests. Please wait ${rateLimit.retryAfterSeconds}s before retrying.`,
          },
        },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
        }
      );
    }

    const body = await request.json();
    const parsed = forgotPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message:
              parsed.error.issues[0]?.message ??
              "Please provide a valid email address.",
          },
        },
        { status: 400 }
      );
    }

    const { email } = parsed.data;
    const { isConfigured } = getSupabasePublicConfig();

    if (isConfigured) {
      const supabase = await createSupabaseServerClient();
      if (supabase) {
        const appUrl =
          process.env.NEXT_PUBLIC_APP_URL?.trim() || request.nextUrl.origin;
        await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${appUrl}/auth/callback?next=/dashboard/settings`,
        });
      }
    }

    // Always return a generic success response to prevent account enumeration
    return NextResponse.json({
      data: {
        message:
          "If an account exists for that email address, password recovery instructions have been dispatched.",
      },
    });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_REQUEST",
          message: "Unable to process password reset request.",
        },
      },
      { status: 400 }
    );
  }
}
