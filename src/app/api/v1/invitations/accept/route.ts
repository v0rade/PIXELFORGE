import { NextResponse, type NextRequest } from "next/server";
import { getServerSessionUser } from "@/lib/auth/session";
import { acceptInvitationSchema } from "@/lib/validation/collaboration";
import { acceptInvitation } from "@/lib/collaboration/service";
import {
  checkRateLimit,
  getRequestClientIdentifier,
} from "@/lib/security/rate-limit";

export async function POST(request: NextRequest) {
  const clientKey = getRequestClientIdentifier(request, "invitations:accept");
  const rateLimit = checkRateLimit(clientKey, {
    maxRequests: 10,
    windowMs: 60_000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: `Too many invitation acceptance attempts. Please wait ${rateLimit.retryAfterSeconds}s before retrying.`,
        },
      },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      }
    );
  }

  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Please sign in or create an account to accept this project invitation.",
        },
      },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const parsed = acceptInvitationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message || "Invalid invitation acceptance request.",
          },
        },
        { status: 400 }
      );
    }

    const result = await acceptInvitation(user.id, parsed.data.token);
    return NextResponse.json({ data: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to accept invitation.";
    return NextResponse.json(
      { error: { code: "ACCEPT_INVITATION_FAILED", message } },
      { status: 400 }
    );
  }
}
