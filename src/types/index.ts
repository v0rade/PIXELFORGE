export type UserRole = "guest" | "owner" | "client";

export type ProjectStatus =
  | "draft"
  | "in_progress"
  | "in_review"
  | "completed"
  | "archived";

export type ProjectPriority = "low" | "medium" | "high" | "urgent";

export type Visibility = "private" | "public";

export type ReviewStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "changes_requested";

export type AssetFormat =
  | "SVG"
  | "PNG"
  | "JPG"
  | "WEBP"
  | "GIF"
  | "PDF"
  | "ZIP";

export type AssetCategory =
  | "Brand Identity"
  | "UI Visual Design"
  | "Social Media Design"
  | "Digital Campaigns"
  | "Marketing Collateral"
  | "Typography"
  | "3D & Motion";

export interface DesignerProfile {
  id: string;
  displayName: string;
  username: string;
  roleTitle: string;
  location: string;
  bio: string;
  websiteUrl: string;
  availabilityStatus: string;
  creativeInterests: string[];
  skillsAndTools: {
    name: string;
    category: "Design" | "Prototyping" | "Motion & 3D" | "Production";
  }[];
  socialLinks: {
    github?: string;
    behance?: string;
    dribbble?: string;
    linkedin?: string;
    instagram?: string;
  };
}

export interface CreativeAsset {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  originalFilename: string;
  storagePath: string;
  previewUrl: string;
  mimeType: string;
  format: AssetFormat;
  fileSize: number; // in bytes
  width: number | null;
  height: number | null;
  category: AssetCategory;
  tags: string[];
  visibility: Visibility;
  downloadable: boolean;
  linkedProjectIds: string[];
  collectionIds: string[];
  createdAt: string;
  updatedAt: string;
}

export type Asset = CreativeAsset;


export interface Project {
  id: string;
  ownerId: string;
  clientId: string | null;
  clientName: string | null;
  title: string;
  slug: string;
  description: string;
  brief: string;
  designProcess: string;
  outcome?: string;
  category: AssetCategory;
  tools: string[];
  coverAssetId: string;
  coverUrl: string;
  galleryAssetIds: string[];
  status: ProjectStatus;
  priority: ProjectPriority;
  visibility: Visibility;
  featured: boolean;
  startDate: string;
  dueDate: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  pendingRevisionsCount: number;
  deliverablesCount: number;
}

export interface AssetCollection {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  visibility: Visibility;
  assetIds: string[];
  coverUrl: string;
  updatedAt: string;
}

export interface StudioClient {
  id: string;
  ownerId: string;
  name: string;
  email: string;
  company: string;
  assignedProjectIds: string[];
  reviewStatus: "awaiting_feedback" | "approved" | "active_collaboration" | "invited";
  invitationExpiresAt?: string;
  createdAt: string;
}

export interface DeliverableVersion {
  id: string;
  projectId: string;
  projectTitle: string;
  assetId: string;
  assetName: string;
  versionNumber: number;
  submittedBy: string;
  reviewStatus: ReviewStatus;
  commentSummary: string;
  submittedAt: string;
  reviewedAt: string | null;
}

export interface ActivityEvent {
  id: string;
  actorName: string;
  actorRole: UserRole;
  projectId: string | null;
  projectTitle: string | null;
  eventType:
    | "project_updated"
    | "asset_uploaded"
    | "deliverable_submitted"
    | "revision_requested"
    | "deliverable_approved"
    | "client_invited"
    | "portfolio_published";
  summary: string;
  detail: string;
  createdAt: string;
  unread: boolean;
}

export interface ActivityLogItem {
  id: string;
  actorId: string | null;
  actorName: string;
  actorRole: UserRole;
  projectId: string | null;
  projectTitle: string | null;
  eventType: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface InAppNotification {
  id: string;
  recipientId: string;
  actorId: string | null;
  actorName?: string;
  actorRole?: UserRole;
  projectId: string | null;
  projectTitle?: string;
  eventType: string;
  payload: {
    summary: string;
    detail: string;
    resourceType?: "project" | "deliverable" | "invitation" | "contact_inquiry" | "asset";
    resourceId?: string;
    actionUrl?: string;
    [key: string]: unknown;
  };
  readAt: string | null;
  createdAt: string;
}

export interface ContactInquiry {
  id: string;
  portfolioOwnerId: string;
  senderName: string;
  senderEmail: string;
  subject: string | null;
  message: string;
  status: "new" | "read" | "archived";
  createdAt: string;
}

