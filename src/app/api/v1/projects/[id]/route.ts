import { NextResponse, type NextRequest } from "next/server";
import { getServerSessionUser } from "@/lib/auth/session";
import { updateProjectSchema } from "@/lib/validation/projects";
import {
  deleteProject,
  getProjectById,
  updateProject,
} from "@/lib/projects/service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required.",
        },
      },
      { status: 401 }
    );
  }

  const { id } = await params;
  const project = await getProjectById(user.id, id);

  if (!project) {
    return NextResponse.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "Project not found or you are not authorized to view it.",
        },
      },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: { project } });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required.",
        },
      },
      { status: 401 }
    );
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const parsed = updateProjectSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message:
              parsed.error.issues[0]?.message ||
              "Invalid project update payload.",
          },
        },
        { status: 400 }
      );
    }

    const updated = await updateProject(user.id, id, parsed.data);
    return NextResponse.json({ data: { project: updated } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update project.";
    const isUnauthorized = message.toLowerCase().includes("unauthorized");
    return NextResponse.json(
      {
        error: {
          code: isUnauthorized ? "FORBIDDEN" : "UPDATE_FAILED",
          message,
        },
      },
      { status: isUnauthorized ? 403 : 400 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required.",
        },
      },
      { status: 401 }
    );
  }

  const { id } = await params;

  try {
    const success = await deleteProject(user.id, id);
    if (!success) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Project not found.",
          },
        },
        { status: 404 }
      );
    }
    return NextResponse.json({ data: { success: true } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete project.";
    const isUnauthorized = message.toLowerCase().includes("unauthorized");
    return NextResponse.json(
      {
        error: {
          code: isUnauthorized ? "FORBIDDEN" : "DELETE_FAILED",
          message,
        },
      },
      { status: isUnauthorized ? 403 : 400 }
    );
  }
}
