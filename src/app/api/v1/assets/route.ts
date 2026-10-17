import { NextResponse, type NextRequest } from "next/server";
import { getServerSessionUser } from "@/lib/auth/session";
import {
  ALLOWED_MIME_TYPES,
  assetQuerySchema,
  createAssetSchema,
  MAX_ASSET_FILE_SIZE,
} from "@/lib/validation/assets";
import { createAsset, listAssets } from "@/lib/assets/service";
import type { AssetCategory, Visibility } from "@/types";

export async function GET(request: NextRequest) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required." } },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const parsedQuery = assetQuerySchema.safeParse({
    search: searchParams.get("search") || "",
    category: searchParams.get("category") || "all",
    format: searchParams.get("format") || "all",
    tag: searchParams.get("tag") || "all",
    projectId: searchParams.get("projectId") || "all",
    collectionId: searchParams.get("collectionId") || "all",
    visibility: searchParams.get("visibility") || "all",
    sortBy: searchParams.get("sortBy") || "date",
    sortOrder: searchParams.get("sortOrder") || "desc",
    page: searchParams.get("page") || "1",
    limit: searchParams.get("limit") || "24",
  });

  if (!parsedQuery.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: parsedQuery.error.issues[0]?.message || "Invalid asset query parameters.",
        },
      },
      { status: 400 }
    );
  }

  try {
    const result = await listAssets(user.id, parsedQuery.data);
    return NextResponse.json({ data: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to retrieve assets.";
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

  const contentType = request.headers.get("content-type") || "";

  try {
    // 1. Multipart Form Data (Real file upload)
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      const title = (formData.get("title") as string) || "";
      const description = (formData.get("description") as string) || "";
      const category = (formData.get("category") as AssetCategory) || "Brand Identity";
      const visibility = (formData.get("visibility") as Visibility) || "private";
      const tagsRaw = (formData.get("tags") as string) || "";
      const linkedProjectIdsRaw = (formData.get("linkedProjectIds") as string) || "";
      const collectionIdsRaw = (formData.get("collectionIds") as string) || "";

      if (!file) {
        return NextResponse.json(
          { error: { code: "FILE_REQUIRED", message: "A valid file is required for upload." } },
          { status: 400 }
        );
      }

      // Validate MIME type
      if (!ALLOWED_MIME_TYPES[file.type]) {
        return NextResponse.json(
          {
            error: {
              code: "UNSUPPORTED_MIME_TYPE",
              message: `MIME type "${file.type}" is not supported. Allowed: JPG, PNG, WebP, GIF, SVG, PDF, ZIP.`,
            },
          },
          { status: 400 }
        );
      }

      // Validate size
      if (file.size <= 0 || file.size > MAX_ASSET_FILE_SIZE) {
        return NextResponse.json(
          {
            error: {
              code: "FILE_TOO_LARGE",
              message: `File size exceeds the 50 MB limit.`,
            },
          },
          { status: 400 }
        );
      }

      const tags = tagsRaw
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);

      const linkedProjectIds = linkedProjectIdsRaw
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);

      const collectionIds = collectionIdsRaw
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const parsedPayload = createAssetSchema.parse({
        name: title.trim() || file.name.replace(/\.[^/.]+$/, ""),
        description,
        originalFilename: file.name,
        mimeType: file.type,
        fileSize: file.size,
        category,
        visibility,
        tags,
        linkedProjectIds,
        collectionIds,
      });

      const created = await createAsset(user.id, parsedPayload, buffer);
      return NextResponse.json({ data: { asset: created } }, { status: 201 });
    }

    // 2. JSON Payload (Metadata-only or pre-validated asset registration)
    const body = await request.json();
    const parsed = createAssetSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message || "Invalid asset payload.",
          },
        },
        { status: 400 }
      );
    }

    const created = await createAsset(user.id, parsed.data);
    return NextResponse.json({ data: { asset: created } }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create asset.";
    return NextResponse.json(
      { error: { code: "CREATE_ASSET_FAILED", message } },
      { status: 400 }
    );
  }
}
