import { NextResponse, type NextRequest } from "next/server";
import { getServerSessionUser } from "@/lib/auth/session";
import { createInvitationSchema } from "@/lib/validation/collaboration";
import {
  createProjectInvitation,
  listInvitations,
  revokeInvitation,
} from "@/lib/collaboration/service";

export async function GET() {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required." } },
      { status: 401 }
    );
  }

  try {
    const invitations = await listInvitations(user.id);
    return NextResponse.json({ data: { invitations } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to list invitations.";
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required." } },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const parsed = createInvitationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message || "Invalid invitation payload.",
          },
        },
        { status: 400 }
      );
    }

    const result = await createProjectInvitation(user.id, parsed.data);
    return NextResponse.json({ data: result }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to issue invitation.";
    return NextResponse.json(
      { error: { code: "CREATE_INVITATION_FAILED", message } },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required." } },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const invitationId = searchParams.get("id");

  if (!invitationId) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Invitation ID is required." } },
      { status: 400 }
    );
  }

  try {
    const success = await revokeInvitation(user.id, invitationId);
    if (!success) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Invitation not found or already revoked." } },
        { status: 404 }
      );
    }
    return NextResponse.json({ data: { success: true } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to revoke invitation.";
    return NextResponse.json(
      { error: { code: "REVOCATION_FAILED", message } },
      { status: 400 }
    );
  }
}

