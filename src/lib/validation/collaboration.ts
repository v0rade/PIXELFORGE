import { z } from "zod";

// Clients Schemas
export const createClientSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Client name is required.")
    .max(100, "Client name cannot exceed 100 characters."),
  email: z
    .string()
    .trim()
    .email("A valid email address is required."),
  company: z.string().trim().max(100).optional().default(""),
  notes: z.string().trim().max(1000).optional().default(""),
  assignedProjectIds: z.array(z.string()).default([]),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;

// Invitation Schemas
export const createInvitationSchema = z.object({
  projectId: z.string().min(1, "Project ID is required."),
  email: z
    .string()
    .trim()
    .email("A valid email address is required."),
  role: z.enum(["client", "collaborator"]).default("client"),
  clientName: z.string().trim().optional(),
  company: z.string().trim().optional(),
  expiresInDays: z.number().int().min(1).max(30).default(7),
});

export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;

export const acceptInvitationSchema = z.object({
  token: z
    .string()
    .trim()
    .min(32, "Invalid invitation token format."),
});

export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;

// Deliverable Versions Schemas
export const createDeliverableVersionSchema = z.object({
  projectId: z.string().min(1, "Project ID is required."),
  assetId: z.string().min(1, "Asset ID is required."),
  versionNotes: z.string().trim().max(1000).optional().default(""),
  reviewStatus: z
    .enum(["draft", "submitted", "approved", "changes_requested"])
    .default("submitted"),
});

export type CreateDeliverableVersionInput = z.infer<
  typeof createDeliverableVersionSchema
>;

// Revision Comments & Review Actions
export const createRevisionCommentSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Comment body cannot be empty.")
    .max(2000, "Comment cannot exceed 2000 characters."),
  commentType: z
    .enum(["comment", "revision_request", "approval_note"])
    .default("comment"),
});

export type CreateRevisionCommentInput = z.infer<
  typeof createRevisionCommentSchema
>;

export const reviewDeliverableSchema = z.object({
  decision: z.enum(["approved", "changes_requested"]),
  note: z.string().trim().min(1, "A review note or feedback explanation is required."),
});

export type ReviewDeliverableInput = z.infer<typeof reviewDeliverableSchema>;
