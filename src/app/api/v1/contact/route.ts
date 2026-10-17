import { NextResponse, type NextRequest } from "next/server";
import { getServerSessionUser } from "@/lib/auth/session";
import { contactInquirySchema } from "@/lib/validation/contact";
import {
  submitContactInquiry,
  listContactInquiries,
} from "@/lib/contact/service";
import {
  checkRateLimit,
  getRequestClientIdentifier,
} from "@/lib/security/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const clientKey = getRequestClientIdentifier(request, "contact:inquiry");
    const rateLimit = checkRateLimit(clientKey, {
      maxRequests: 5,
      windowMs: 5 * 60_000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: `Too many inquiries submitted. Please wait ${rateLimit.retryAfterSeconds}s before trying again.`,
          },
        },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
        }
      );
    }

    const body = await request.json();
    const parsed = contactInquirySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message:
              parsed.error.issues[0]?.message ||
              "Invalid contact inquiry form data.",
          },
        },
        { status: 400 }
      );
    }

    const result = await submitContactInquiry(parsed.data);
    return NextResponse.json(
      {
        data: {
          success: true,
          message: "Your inquiry has been recorded and delivered to the studio.",
          inquiryId: result.inquiryId,
        },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : "Failed to submit project inquiry. Please try again.";
    return NextResponse.json(
      { error: { code: "CONTACT_SUBMISSION_FAILED", message } },
      { status: 400 }
    );
  }
}

export async function GET() {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required." } },
      { status: 401 }
    );
  }

  try {
    const inquiries = await listContactInquiries(user.id);
    return NextResponse.json({ data: { inquiries } });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to load inquiries.";
    return NextResponse.json(
      { error: { code: "FETCH_INQUIRIES_FAILED", message } },
      { status: 500 }
    );
  }
}
