import { NextResponse, type NextRequest } from "next/server";
import { getServerSessionUser } from "@/lib/auth/session";
import {
  createProjectSchema,
  projectQuerySchema,
} from "@/lib/validation/projects";
import { createProject, listProjects } from "@/lib/projects/service";

export async function GET(request: NextRequest) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required to access projects.",
        },
      },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const parsedQuery = projectQuerySchema.safeParse({
    status: searchParams.get("status") || "all",
    category: searchParams.get("category") || "all",
    search: searchParams.get("search") || "",
    sortBy: searchParams.get("sortBy") || "date",
    sortOrder: searchParams.get("sortOrder") || "desc",
    page: searchParams.get("page") || "1",
    limit: searchParams.get("limit") || "12",
  });

  if (!parsedQuery.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message:
            parsedQuery.error.issues[0]?.message || "Invalid query parameters.",
        },
      },
      { status: 400 }
    );
  }

  try {
    const result = await listProjects(user.id, parsedQuery.data);
    return NextResponse.json({ data: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to retrieve projects.";
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message,
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required to create a project.",
        },
      },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const parsed = createProjectSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message:
              parsed.error.issues[0]?.message ||
              "The submitted project data is invalid.",
          },
        },
        { status: 400 }
      );
    }

    const created = await createProject(user.id, parsed.data);
    return NextResponse.json({ data: { project: created } }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create project.";
    return NextResponse.json(
      {
        error: {
          code: "CREATE_PROJECT_FAILED",
          message,
        },
      },
      { status: 400 }
    );
  }
}
