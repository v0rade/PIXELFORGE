import { z } from "zod";
import type { AssetCategory, AssetFormat, Visibility } from "@/types";

export const ALLOWED_ASSET_CATEGORIES: AssetCategory[] = [
  "Brand Identity",
  "UI Visual Design",
  "Social Media Design",
  "Digital Campaigns",
  "Marketing Collateral",
  "Typography",
  "3D & Motion",
];

export const ALLOWED_ASSET_FORMATS: AssetFormat[] = [
  "SVG",
  "PNG",
  "WEBP",
  "JPG",
  "GIF",
  "PDF",
  "ZIP",
];

export const ALLOWED_MIME_TYPES: Record<string, AssetFormat> = {
  "image/jpeg": "JPG",
  "image/png": "PNG",
  "image/webp": "WEBP",
  "image/gif": "GIF",
  "image/svg+xml": "SVG",
  "application/pdf": "PDF",
  "application/zip": "ZIP",
  "application/x-zip-compressed": "ZIP",
};

export const EXTENSION_TO_FORMAT: Record<string, AssetFormat> = {
  jpg: "JPG",
  jpeg: "JPG",
  png: "PNG",
  webp: "WEBP",
  gif: "GIF",
  svg: "SVG",
  pdf: "PDF",
  zip: "ZIP",
};

export const MAX_ASSET_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

/**
 * Sanitizes a filename to prevent path traversal, reserved names, and dangerous characters.
 */
export function sanitizeFilename(raw: string): string {
  // Strip null bytes and path separators
  let clean = raw.replace(/\0/g, "").replace(/[/\\?%*:|"<>]/g, "-");
  // Replace sequences of dots with a dash to eliminate traversal (..)
  clean = clean.replace(/\.{2,}/g, "-");
  // Remove leading/trailing dots or dashes
  clean = clean.replace(/^[-.]+|[-.]+$/g, "");
  // Replace multiple dashes or spaces with single dash
  clean = clean.replace(/[-\s]+/g, "-").trim();
  // Ensure it's not empty
  if (!clean || clean === "-") {
    clean = `asset-${Date.now()}`;
  }
  return clean.slice(0, 120);
}

/**
 * Generates a collision-resistant, non-traversable storage path for Supabase storage.
 * e.g. creative-assets/{ownerId}/2026/10/{uuid}-{sanitizedFilename}
 */
export function generateStoragePath(ownerId: string, filename: string): string {
  const sanitizedOwnerId = ownerId.replace(/[^a-zA-Z0-9_-]/g, "");
  const sanitizedName = sanitizeFilename(filename);
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const randomSuffix = Math.random().toString(36).substring(2, 10);
  const timestamp = Date.now();

  return `creative-assets/${sanitizedOwnerId}/${year}/${month}/${timestamp}-${randomSuffix}-${sanitizedName}`;
}

export const createAssetSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Asset name is required.")
    .max(120, "Asset name cannot exceed 120 characters."),
  description: z.string().trim().max(1000).optional().default(""),
  originalFilename: z.string().trim().min(1, "Filename is required."),
  mimeType: z
    .string()
    .refine((mime) => Boolean(ALLOWED_MIME_TYPES[mime]), {
      message: "Unsupported MIME type. Allowed formats: JPG, PNG, WebP, GIF, SVG, PDF, ZIP.",
    }),
  fileSize: z
    .number()
    .int()
    .positive("File size must be greater than 0.")
    .max(MAX_ASSET_FILE_SIZE, "File exceeds maximum allowed size of 50 MB."),
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
  category: z.enum(ALLOWED_ASSET_CATEGORIES as [AssetCategory, ...AssetCategory[]]),
  visibility: z.enum(["private", "public"] as [Visibility, Visibility]).default("private"),
  downloadable: z.boolean().default(false),
  tags: z.array(z.string().trim().toLowerCase()).default([]),
  linkedProjectIds: z.array(z.string()).default([]),
  collectionIds: z.array(z.string()).default([]),
});

export type CreateAssetInput = z.infer<typeof createAssetSchema>;

export const updateAssetSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(1000).optional(),
  category: z.enum(ALLOWED_ASSET_CATEGORIES as [AssetCategory, ...AssetCategory[]]).optional(),
  visibility: z.enum(["private", "public"] as [Visibility, Visibility]).optional(),
  downloadable: z.boolean().optional(),
  tags: z.array(z.string().trim().toLowerCase()).optional(),
  linkedProjectIds: z.array(z.string()).optional(),
  collectionIds: z.array(z.string()).optional(),
});

export type UpdateAssetInput = z.infer<typeof updateAssetSchema>;

export const assetQuerySchema = z.object({
  search: z.string().optional().default(""),
  category: z.string().optional().default("all"),
  format: z.string().optional().default("all"),
  tag: z.string().optional().default("all"),
  projectId: z.string().optional().default("all"),
  collectionId: z.string().optional().default("all"),
  visibility: z.string().optional().default("all"),
  sortBy: z.enum(["date", "title", "size"]).default("date"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(24),
});

export type AssetQueryInput = z.infer<typeof assetQuerySchema>;

export const bulkAssetActionSchema = z.object({
  assetIds: z.array(z.string().min(1)).min(1, "At least one asset must be selected."),
  action: z.enum([
    "set_public",
    "set_private",
    "delete",
    "add_to_collection",
    "remove_from_collection",
    "add_tag",
    "link_project",
  ]),
  targetId: z.string().optional(),
  tag: z.string().optional(),
});

export type BulkAssetActionInput = z.infer<typeof bulkAssetActionSchema>;

// Tags Schemas
export const createTagSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Tag name is required.")
    .max(50, "Tag name cannot exceed 50 characters."),
});

export type CreateTagInput = z.infer<typeof createTagSchema>;

// Collections Schemas
export const createCollectionSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Collection name is required.")
    .max(100, "Collection name cannot exceed 100 characters."),
  description: z.string().trim().max(1000).optional().default(""),
  category: z.enum(ALLOWED_ASSET_CATEGORIES as [AssetCategory, ...AssetCategory[]]).default("Brand Identity"),
  visibility: z.enum(["private", "public"] as [Visibility, Visibility]).default("private"),
  coverUrl: z.string().optional(),
});

export type CreateCollectionInput = z.infer<typeof createCollectionSchema>;

export const updateCollectionSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(1000).optional(),
  category: z.enum(ALLOWED_ASSET_CATEGORIES as [AssetCategory, ...AssetCategory[]]).optional(),
  visibility: z.enum(["private", "public"] as [Visibility, Visibility]).optional(),
  coverUrl: z.string().optional(),
});

export type UpdateCollectionInput = z.infer<typeof updateCollectionSchema>;

export const collectionAssetSchema = z.object({
  assetId: z.string().min(1, "Asset ID is required."),
});
