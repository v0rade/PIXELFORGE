import { NextResponse, type NextRequest } from "next/server";
import { getServerSessionUser } from "@/lib/auth/session";
import { createDeliverableVersionSchema } from "@/lib/validation/collaboration";
import {
  listDeliverables,
  createDeliverableVersion,
} from "@/lib/collaboration/service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required." } },
      { status: 401 }
    );
  }

  const { id: projectId } = await params;

  try {
    const deliverables = await listDeliverables(user.id, projectId);
    return NextResponse.json({ data: { deliverables } });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to load deliverables.";
    return NextResponse.json(
      { error: { code: "FETCH_DELIVERABLES_FAILED", message } },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required." } },
      { status: 401 }
    );
  }

  const { id: projectId } = await params;

  try {
    const body = await request.json();
    const parsed = createDeliverableVersionSchema.safeParse({
      ...body,
      projectId,
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message:
              parsed.error.issues[0]?.message ||
              "Invalid deliverable submission data.",
          },
        },
        { status: 400 }
      );
    }

    const deliverable = await createDeliverableVersion(user.id, parsed.data);
    return NextResponse.json({ data: deliverable }, { status: 201 });
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : "Failed to create deliverable version.";
    return NextResponse.json(
      { error: { code: "CREATE_DELIVERABLE_FAILED", message } },
      { status: 400 }
    );
  }
}
