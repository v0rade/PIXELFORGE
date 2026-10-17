import { z } from "zod";

export const PROJECT_CATEGORIES = [
  "Brand Identity",
  "UI Visual Design",
  "Digital Campaigns",
  "Social Media Design",
  "Marketing Collateral",
  "Typography",
  "3D & Motion",
] as const;

export const PROJECT_STATUSES = [
  "draft",
  "in_progress",
  "in_review",
  "completed",
  "archived",
] as const;

export const PROJECT_PRIORITIES = ["low", "medium", "high", "urgent"] as const;

export const PROJECT_VISIBILITIES = ["private", "public"] as const;

export const projectSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2, "Slug must be at least 2 characters.")
  .max(100, "Slug cannot exceed 100 characters.")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Slug must contain only lowercase letters, numbers, and single hyphens between words."
  );

export const createProjectSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Project title must be at least 2 characters.")
    .max(120, "Project title cannot exceed 120 characters."),
  slug: projectSlugSchema.optional(),
  description: z
    .string()
    .trim()
    .max(600, "Description cannot exceed 600 characters.")
    .optional()
    .default(""),
  brief: z
    .string()
    .trim()
    .max(3000, "Brief cannot exceed 3000 characters.")
    .optional()
    .default(""),
  category: z.enum(PROJECT_CATEGORIES).default("Brand Identity"),
  clientId: z.string().uuid("Invalid client ID.").nullable().optional(),
  clientName: z.string().trim().max(100).optional(),
  coverAssetId: z.string().uuid("Invalid asset ID.").nullable().optional(),
  coverUrl: z.string().trim().optional(),
  status: z.enum(PROJECT_STATUSES).default("draft"),
  priority: z.enum(PROJECT_PRIORITIES).default("medium"),
  visibility: z.enum(PROJECT_VISIBILITIES).default("private"),
  featured: z.boolean().default(false),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be in YYYY-MM-DD format.")
    .nullable()
    .optional(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Due date must be in YYYY-MM-DD format.")
    .nullable()
    .optional(),
  tools: z.array(z.string().trim()).default(["Figma"]),
});

export const updateProjectSchema = createProjectSchema.partial().extend({
  archivedAt: z.string().nullable().optional(),
  publishedAt: z.string().nullable().optional(),
});

export const projectQuerySchema = z.object({
  status: z.enum(["all", ...PROJECT_STATUSES]).default("all"),
  category: z.enum(["all", ...PROJECT_CATEGORIES]).default("all"),
  search: z.string().trim().default(""),
  sortBy: z.enum(["date", "title", "priority", "status"]).default("date"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(12),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ProjectQueryInput = z.infer<typeof projectQuerySchema>;
