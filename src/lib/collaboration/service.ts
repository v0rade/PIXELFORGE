import crypto from "crypto";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createNotification } from "@/lib/notifications/service";
import type {
  DeliverableVersion,
  StudioClient,
} from "@/types";
import {
  DEMO_CLIENTS,
  DEMO_DELIVERABLES,
  DEMO_PROJECTS,
} from "@/lib/demo/data";
import type {
  CreateClientInput,
  CreateDeliverableVersionInput,
  CreateInvitationInput,
  CreateRevisionCommentInput,
} from "@/lib/validation/collaboration";

export interface ProjectInvitationItem {
  id: string;
  projectId: string;
  projectTitle?: string;
  email: string;
  role: "client" | "collaborator";
  tokenHash: string;
  invitedBy: string;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export interface RevisionCommentItem {
  id: string;
  deliverableVersionId: string;
  authorId: string;
  authorName?: string;
  authorRole?: string;
  body: string;
  commentType: "comment" | "revision_request" | "approval_note";
  createdAt: string;
  updatedAt: string | null;
}

export interface DetailedDeliverable extends DeliverableVersion {
  comments?: RevisionCommentItem[];
  assetDetails?: {
    name: string;
    format: string;
    fileSize: number;
    previewUrl: string;
    width: number | null;
    height: number | null;
  };
}

// In-Memory Fallback Stores for Local Dev
let localClientsStore: StudioClient[] = [...DEMO_CLIENTS];
let localInvitationsStore: ProjectInvitationItem[] = [];
let localDeliverablesStore: DeliverableVersion[] = [...DEMO_DELIVERABLES];
let localCommentsStore: RevisionCommentItem[] = [
  {
    id: "com_01",
    deliverableVersionId: "del_01",
    authorId: "usr_owner_01",
    authorName: "Sora Vance",
    authorRole: "owner",
    body: "Initial telemetry layout with variable typography tokens.",
    commentType: "comment",
    createdAt: "2026-10-15T09:00:00Z",
    updatedAt: null,
  },
  {
    id: "com_02",
    deliverableVersionId: "del_02",
    authorId: "cli_04",
    authorName: "Kenji Takahashi",
    authorRole: "client",
    body: "Please adjust crease tolerance by +1.5mm on interior tray flap.",
    commentType: "revision_request",
    createdAt: "2026-10-15T18:05:00Z",
    updatedAt: null,
  },
  {
    id: "com_03",
    deliverableVersionId: "del_03",
    authorId: "cli_01",
    authorName: "Dr. Elena Rostova",
    authorRole: "client",
    body: "Approved without reservation. Color tokens match Display P3 optical specs.",
    commentType: "approval_note",
    createdAt: "2026-10-05T10:20:00Z",
    updatedAt: null,
  },
];

// ============================================================================
// CRYPTOGRAPHIC TOKEN UTILITIES
// ============================================================================

export function generateInvitationToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashInvitationToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// ============================================================================
// CLIENTS & MEMBERS
// ============================================================================

export async function listClients(ownerId: string): Promise<StudioClient[]> {
  const { isConfigured } = getSupabasePublicConfig();

  if (isConfigured) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase
        .from("clients")
        .select("*, projects(id)")
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(`Failed to list clients: ${error.message}`);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data || []).map((c: any) => ({
        id: c.id,
        ownerId: c.owner_id,
        name: c.name,
        email: c.email || "",
        company: c.company || "Client Partner",
        assignedProjectIds: Array.isArray(c.projects)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ? c.projects.map((p: any) => p.id)
          : [],
        reviewStatus: "active_collaboration",
        createdAt: c.created_at,
      }));
    }
  }

  return localClientsStore.filter(
    (c) => c.ownerId === ownerId || c.ownerId === "usr_owner_01"
  );
}

export async function createClient(
  ownerId: string,
  input: CreateClientInput
): Promise<StudioClient> {
  const { isConfigured } = getSupabasePublicConfig();
  const now = new Date().toISOString();

  if (isConfigured) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase
        .from("clients")
        .insert({
          owner_id: ownerId,
          name: input.name,
          email: input.email,
          company: input.company || null,
          notes: input.notes || null,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create client: ${error.message}`);
      }

      return {
        id: data.id,
        ownerId: data.owner_id,
        name: data.name,
        email: data.email || "",
        company: data.company || "",
        assignedProjectIds: input.assignedProjectIds || [],
        reviewStatus: "invited",
        createdAt: data.created_at,
      };
    }
  }

  const newClient: StudioClient = {
    id: `cli_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    ownerId,
    name: input.name,
    email: input.email,
    company: input.company || "Client Partner",
    assignedProjectIds: input.assignedProjectIds || [],
    reviewStatus: "invited",
    createdAt: now,
  };

  localClientsStore = [newClient, ...localClientsStore];
  return newClient;
}

export async function deleteClient(
  ownerId: string,
  clientId: string
): Promise<boolean> {
  const { isConfigured } = getSupabasePublicConfig();

  if (isConfigured) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase
        .from("clients")
        .delete()
        .eq("id", clientId);

      if (error) {
        throw new Error(`Failed to delete client: ${error.message}`);
      }
      return true;
    }
  }

  const existing = localClientsStore.find((c) => c.id === clientId);
  if (!existing) return false;
  if (existing.ownerId !== ownerId && existing.ownerId !== "usr_owner_01") {
    throw new Error("Unauthorized: you do not own this client record.");
  }

  localClientsStore = localClientsStore.filter((c) => c.id !== clientId);
  return true;
}

// ============================================================================
// SINGLE-USE CRYPTOGRAPHIC INVITATIONS
// ============================================================================

export async function createProjectInvitation(
  invitedByUserId: string,
  input: CreateInvitationInput
): Promise<{
  invitation: ProjectInvitationItem;
  rawToken: string;
  invitationUrl: string;
}> {
  const rawToken = generateInvitationToken();
  const tokenHash = hashInvitationToken(rawToken);
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + input.expiresInDays * 24 * 60 * 60 * 1000
  ).toISOString();

  const { isConfigured } = getSupabasePublicConfig();

  if (isConfigured) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase
        .from("project_invitations")
        .insert({
          project_id: input.projectId,
          email: input.email.toLowerCase(),
          role: input.role,
          token_hash: tokenHash,
          invited_by: invitedByUserId,
          expires_at: expiresAt,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to issue project invitation: ${error.message}`);
      }

      // Also create activity log
      await supabase.from("activity_logs").insert({
        actor_id: invitedByUserId,
        project_id: input.projectId,
        event_type: "invitation_issued",
        metadata: {
          email: input.email.toLowerCase(),
          role: input.role,
        },
      });

      const inv: ProjectInvitationItem = {
        id: data.id,
        projectId: data.project_id,
        email: data.email,
        role: data.role,
        tokenHash: data.token_hash,
        invitedBy: data.invited_by,
        expiresAt: data.expires_at,
        acceptedAt: data.accepted_at,
        revokedAt: data.revoked_at,
        createdAt: data.created_at,
      };

      return {
        invitation: inv,
        rawToken,
        invitationUrl: `/invite/${rawToken}`,
      };
    }
  }

  // Local fallback
  const newInv: ProjectInvitationItem = {
    id: `inv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    projectId: input.projectId,
    projectTitle: DEMO_PROJECTS.find((p) => p.id === input.projectId)?.title,
    email: input.email.toLowerCase(),
    role: input.role,
    tokenHash,
    invitedBy: invitedByUserId,
    expiresAt,
    acceptedAt: null,
    revokedAt: null,
    createdAt: now.toISOString(),
  };

  localInvitationsStore = [newInv, ...localInvitationsStore];

  // Also create a client record if not already present
  const clientExists = localClientsStore.find(
    (c) => c.email.toLowerCase() === input.email.toLowerCase()
  );
  if (!clientExists) {
    localClientsStore.push({
      id: `cli_${Date.now()}`,
      ownerId: invitedByUserId,
      name: input.clientName || input.email.split("@")[0],
      email: input.email,
      company: input.company || "Invited Client",
      assignedProjectIds: [input.projectId],
      reviewStatus: "invited",
      invitationExpiresAt: expiresAt,
      createdAt: now.toISOString(),
    });
  }

  return {
    invitation: newInv,
    rawToken,
    invitationUrl: `/invite/${rawToken}`,
  };
}

export async function listInvitations(ownerId: string): Promise<ProjectInvitationItem[]> {
  const { isConfigured } = getSupabasePublicConfig();

  if (isConfigured) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase
        .from("project_invitations")
        .select("*, projects(title)")
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(`Failed to list invitations: ${error.message}`);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data || []).map((inv: any) => ({
        id: inv.id,
        projectId: inv.project_id,
        projectTitle: inv.projects?.title,
        email: inv.email,
        role: inv.role,
        tokenHash: inv.token_hash,
        invitedBy: inv.invited_by,
        expiresAt: inv.expires_at,
        acceptedAt: inv.accepted_at,
        revokedAt: inv.revoked_at,
        createdAt: inv.created_at,
      }));
    }
  }

  return localInvitationsStore.filter(
    (inv) => inv.invitedBy === ownerId || inv.invitedBy === "usr_owner_01"
  );
}

export async function verifyInvitation(
  rawToken: string
): Promise<{ valid: boolean; invitation?: ProjectInvitationItem; reason?: string }> {
  const tokenHash = hashInvitationToken(rawToken);
  const now = new Date();

  const { isConfigured } = getSupabasePublicConfig();

  if (isConfigured) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase
        .from("project_invitations")
        .select("*, projects(title)")
        .eq("token_hash", tokenHash)
        .maybeSingle();

      if (error || !data) {
        return { valid: false, reason: "Invitation not found or invalid token." };
      }

      if (data.revoked_at) {
        return { valid: false, reason: "This invitation was revoked by the studio owner." };
      }

      if (new Date(data.expires_at) < now) {
        return { valid: false, reason: "This invitation has expired." };
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const row: any = data;
      return {
        valid: true,
        invitation: {
          id: row.id,
          projectId: row.project_id,
          projectTitle: row.projects?.title,
          email: row.email,
          role: row.role,
          tokenHash: row.token_hash,
          invitedBy: row.invited_by,
          expiresAt: row.expires_at,
          acceptedAt: row.accepted_at,
          revokedAt: row.revoked_at,
          createdAt: row.created_at,
        },
      };
    }
  }

  // Local fallback
  const found = localInvitationsStore.find((inv) => inv.tokenHash === tokenHash);
  if (!found) {
    return { valid: false, reason: "Invitation token not found." };
  }

  if (found.revokedAt) {
    return { valid: false, reason: "This invitation has been revoked." };
  }

  if (new Date(found.expiresAt) < now) {
    return { valid: false, reason: "This invitation has expired." };
  }

  return { valid: true, invitation: found };
}

export async function revokeInvitation(
  userId: string,
  invitationId: string
): Promise<boolean> {
  const now = new Date().toISOString();
  const { isConfigured } = getSupabasePublicConfig();

  if (isConfigured) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase
        .from("project_invitations")
        .update({ revoked_at: now })
        .eq("id", invitationId);

      if (!error) {
        await supabase.from("activity_logs").insert({
          actor_id: userId,
          event_type: "invitation_revoked",
          metadata: { invitationId },
        });
        return true;
      }
      return false;
    }
  }

  const inv = localInvitationsStore.find((i) => i.id === invitationId);
  if (inv) {
    inv.revokedAt = now;
    return true;
  }
  return false;
}


export async function acceptInvitation(
  userId: string,
  rawToken: string
): Promise<{ success: boolean; projectId: string; role: string }> {
  const verification = await verifyInvitation(rawToken);
  if (!verification.valid || !verification.invitation) {
    throw new Error(verification.reason || "Invalid invitation token.");
  }

  const inv = verification.invitation;
  const now = new Date().toISOString();
  const tokenHash = hashInvitationToken(rawToken);

  const { isConfigured } = getSupabasePublicConfig();

  if (isConfigured) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      // 1. Check if already accepted (Idempotency)
      if (inv.acceptedAt) {
        // Check if user is already member
        const { data: member } = await supabase
          .from("project_members")
          .select("*")
          .eq("project_id", inv.projectId)
          .eq("user_id", userId)
          .maybeSingle();

        if (member) {
          return { success: true, projectId: inv.projectId, role: member.role };
        }
        throw new Error("This single-use invitation has already been accepted.");
      }

      // 2. Insert into project_members
      const { error: memberError } = await supabase
        .from("project_members")
        .insert({
          project_id: inv.projectId,
          user_id: userId,
          role: inv.role,
          invited_by: inv.invitedBy,
          accepted_at: now,
        });

      if (memberError && !memberError.message.includes("duplicate")) {
        throw new Error(`Failed to join project: ${memberError.message}`);
      }

      // 3. Mark invitation as accepted (single-use)
      await supabase
        .from("project_invitations")
        .update({ accepted_at: now })
        .eq("token_hash", tokenHash);

      // 4. Log activity
      await supabase.from("activity_logs").insert({
        actor_id: userId,
        project_id: inv.projectId,
        event_type: "member_joined",
        metadata: { role: inv.role },
      });

      // 5. Notify the inviter
      await createNotification({
        recipientId: inv.invitedBy,
        actorId: userId,
        projectId: inv.projectId,
        eventType: "member_joined",
        payload: {
          summary: `${inv.email} joined project workspace`,
          detail: `Accepted single-use invitation as ${inv.role}.`,
          resourceType: "project",
          resourceId: inv.projectId,
          actionUrl: `/dashboard/projects/${inv.projectId}`,
        },
      });

      return { success: true, projectId: inv.projectId, role: inv.role };
    }
  }

  // Local fallback idempotency check
  if (inv.acceptedAt) {
    return { success: true, projectId: inv.projectId, role: inv.role };
  }

  inv.acceptedAt = now;

  // Add project to client record
  const client = localClientsStore.find(
    (c) => c.email.toLowerCase() === inv.email.toLowerCase()
  );
  if (client && !client.assignedProjectIds.includes(inv.projectId)) {
    client.assignedProjectIds.push(inv.projectId);
    client.reviewStatus = "active_collaboration";
  }

  await createNotification({
    recipientId: inv.invitedBy,
    actorId: userId,
    projectId: inv.projectId,
    eventType: "member_joined",
    payload: {
      summary: `${inv.email} joined project workspace`,
      detail: `Accepted single-use invitation as ${inv.role}.`,
      resourceType: "project",
      resourceId: inv.projectId,
      actionUrl: `/dashboard/projects/${inv.projectId}`,
    },
  });

  return { success: true, projectId: inv.projectId, role: inv.role };
}

// ============================================================================
// DELIVERABLES & VERSIONS
// ============================================================================

export async function listDeliverables(
  userId: string,
  projectId: string
): Promise<DetailedDeliverable[]> {
  const { isConfigured } = getSupabasePublicConfig();

  if (isConfigured) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase
        .from("deliverable_versions")
        .select(
          `*,
           assets(name, mime_type, file_size, storage_path, width, height),
           projects(title),
           revision_comments(id, body, comment_type, created_at, author_id, profiles(display_name, role))`
        )
        .eq("project_id", projectId)
        .order("version_number", { ascending: false });

      if (error) {
        throw new Error(`Failed to list deliverables: ${error.message}`);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data || []).map((row: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const comments: RevisionCommentItem[] = (row.revision_comments || []).map((c: any) => ({
          id: c.id,
          deliverableVersionId: row.id,
          authorId: c.author_id,
          authorName: c.profiles?.display_name || "Studio Member",
          authorRole: c.profiles?.role || "client",
          body: c.body,
          commentType: c.comment_type,
          createdAt: c.created_at,
          updatedAt: c.updated_at,
        }));

        return {
          id: row.id,
          projectId: row.project_id,
          projectTitle: row.projects?.title || "Studio Project",
          assetId: row.asset_id,
          assetName: row.assets?.name || "Deliverable Master",
          versionNumber: row.version_number,
          submittedBy: row.submitted_by,
          reviewStatus: row.review_status,
          commentSummary: comments[0]?.body || "Deliverable version submitted for client review.",
          submittedAt: row.submitted_at || row.created_at,
          reviewedAt: row.reviewed_at,
          comments,
          assetDetails: row.assets ? {
            name: row.assets.name,
            format: row.assets.mime_type.split("/")[1]?.toUpperCase() || "SVG",
            fileSize: Number(row.assets.file_size),
            previewUrl: "/placeholders/asset-brand-system.svg",
            width: row.assets.width,
            height: row.assets.height,
          } : undefined,
        };
      });
    }
  }

  // Local fallback
  const deliverables = localDeliverablesStore.filter(
    (d) => d.projectId === projectId
  );

  return deliverables.map((del) => {
    const comments = localCommentsStore.filter(
      (c) => c.deliverableVersionId === del.id
    );
    return {
      ...del,
      comments,
      assetDetails: {
        name: del.assetName,
        format: "SVG",
        fileSize: 840_000,
        previewUrl: "/placeholders/asset-brand-system.svg",
        width: 1920,
        height: 1080,
      },
    };
  });
}

export async function createDeliverableVersion(
  userId: string,
  input: CreateDeliverableVersionInput
): Promise<DetailedDeliverable> {
  const now = new Date().toISOString();
  const { isConfigured } = getSupabasePublicConfig();

  if (isConfigured) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      // Find current max version
      const { data: existingVersions } = await supabase
        .from("deliverable_versions")
        .select("version_number")
        .eq("project_id", input.projectId)
        .order("version_number", { ascending: false })
        .limit(1);

      const nextVersion = (existingVersions?.[0]?.version_number || 0) + 1;

      // 1. Insert deliverable version
      const { data, error } = await supabase
        .from("deliverable_versions")
        .insert({
          project_id: input.projectId,
          asset_id: input.assetId,
          version_number: nextVersion,
          submitted_by: userId,
          review_status: input.reviewStatus,
          submitted_at: now,
        })
        .select("*, assets(name), projects(title)")
        .single();

      if (error) {
        throw new Error(`Failed to create deliverable version: ${error.message}`);
      }

      // 2. Link asset as deliverable in project_assets
      await supabase
        .from("project_assets")
        .insert({
          project_id: input.projectId,
          asset_id: input.assetId,
          role: "deliverable",
        });

      // 3. Add initial comment if notes provided
      if (input.versionNotes) {
        await supabase.from("revision_comments").insert({
          deliverable_version_id: data.id,
          author_id: userId,
          body: input.versionNotes,
          comment_type: "comment",
        });
      }

      // 5. Activity Log
      await supabase.from("activity_logs").insert({
        actor_id: userId,
        project_id: input.projectId,
        event_type: "deliverable_submitted",
        metadata: {
          deliverableId: data.id,
          versionNumber: nextVersion,
        },
      });

      // 6. Notify project owner if submitter is collaborator/client
      const { data: projectRow } = await supabase
        .from("projects")
        .select("owner_id, title")
        .eq("id", input.projectId)
        .maybeSingle();

      if (projectRow && projectRow.owner_id && projectRow.owner_id !== userId) {
        await createNotification({
          recipientId: projectRow.owner_id,
          actorId: userId,
          projectId: input.projectId,
          eventType: "deliverable_submitted",
          payload: {
            summary: `New deliverable version v${nextVersion} submitted`,
            detail: `Project: ${projectRow.title || "Project"}. Status: ${input.reviewStatus}`,
            resourceType: "deliverable",
            resourceId: data.id,
            actionUrl: `/dashboard/projects/${input.projectId}`,
          },
        });
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const row: any = data;
      return {
        id: row.id,
        projectId: row.project_id,
        projectTitle: row.projects?.title || "Studio Project",
        assetId: row.asset_id,
        assetName: row.assets?.name || "Deliverable Master",
        versionNumber: row.version_number,
        submittedBy: row.submitted_by,
        reviewStatus: row.review_status,
        commentSummary: input.versionNotes || `Version ${nextVersion} submitted.`,
        submittedAt: row.submitted_at || now,
        reviewedAt: null,
      };
    }
  }

  // Local fallback
  const existingVersions = localDeliverablesStore.filter(
    (d) => d.projectId === input.projectId
  );
  const nextVersion = existingVersions.length + 1;

  const newDeliverable: DetailedDeliverable = {
    id: `del_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    projectId: input.projectId,
    projectTitle: DEMO_PROJECTS.find((p) => p.id === input.projectId)?.title || "Project Deliverable",
    assetId: input.assetId,
    assetName: `Artwork Master v${nextVersion}`,
    versionNumber: nextVersion,
    submittedBy: userId,
    reviewStatus: input.reviewStatus,
    commentSummary: input.versionNotes || `Version ${nextVersion} submitted.`,
    submittedAt: now,
    reviewedAt: null,
  };

  localDeliverablesStore = [newDeliverable, ...localDeliverablesStore];

  if (input.versionNotes) {
    localCommentsStore.push({
      id: `com_${Date.now()}`,
      deliverableVersionId: newDeliverable.id,
      authorId: userId,
      authorName: "Sora Vance",
      authorRole: "owner",
      body: input.versionNotes,
      commentType: "comment",
      createdAt: now,
      updatedAt: null,
    });
  }

  if (userId !== "usr_owner_01") {
    await createNotification({
      recipientId: "usr_owner_01",
      actorId: userId,
      projectId: input.projectId,
      eventType: "deliverable_submitted",
      payload: {
        summary: `New deliverable version v${nextVersion} submitted`,
        detail: `Project: ${newDeliverable.projectTitle}. Status: ${input.reviewStatus}`,
        resourceType: "deliverable",
        resourceId: newDeliverable.id,
        actionUrl: `/dashboard/projects/${input.projectId}`,
      },
    });
  }

  return newDeliverable;
}

// ============================================================================
// REVISION COMMENTS & APPROVAL WORKFLOW
// ============================================================================

export async function addRevisionComment(
  userId: string,
  deliverableVersionId: string,
  input: CreateRevisionCommentInput
): Promise<RevisionCommentItem> {
  const now = new Date().toISOString();
  const { isConfigured } = getSupabasePublicConfig();

  if (isConfigured) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      // 1. Fetch deliverable to verify submitter vs reviewer
      const { data: deliverable, error: delError } = await supabase
        .from("deliverable_versions")
        .select("id, project_id, submitted_by, review_status")
        .eq("id", deliverableVersionId)
        .single();

      if (delError || !deliverable) {
        throw new Error("Deliverable version not found.");
      }

      // Check self-approval guard: if approving, submitter cannot approve own work
      if (input.commentType === "approval_note" && deliverable.submitted_by === userId) {
        throw new Error("Independent sign-off required: you cannot approve your own deliverable.");
      }

      // 2. Insert comment
      const { data, error } = await supabase
        .from("revision_comments")
        .insert({
          deliverable_version_id: deliverableVersionId,
          author_id: userId,
          body: input.body,
          comment_type: input.commentType,
        })
        .select("*, profiles(display_name, role)")
        .single();

      if (error) {
        throw new Error(`Failed to post revision comment: ${error.message}`);
      }

      // 3. Update deliverable review status if comment reflects a review decision
      if (input.commentType === "approval_note") {
        await supabase
          .from("deliverable_versions")
          .update({
            review_status: "approved",
            reviewed_at: now,
          })
          .eq("id", deliverableVersionId);

        await supabase.from("activity_logs").insert({
          actor_id: userId,
          project_id: deliverable.project_id,
          event_type: "deliverable_approved",
          metadata: { deliverableVersionId },
        });

        if (deliverable.submitted_by && deliverable.submitted_by !== userId) {
          await createNotification({
            recipientId: deliverable.submitted_by,
            actorId: userId,
            projectId: deliverable.project_id,
            eventType: "review_decision",
            payload: {
              summary: "Deliverable approved by reviewer",
              detail: `Your deliverable version was approved. Note: "${input.body.slice(0, 80)}"`,
              resourceType: "deliverable",
              resourceId: deliverableVersionId,
              actionUrl: `/dashboard/projects/${deliverable.project_id}`,
            },
          });
        }
      } else if (input.commentType === "revision_request") {
        await supabase
          .from("deliverable_versions")
          .update({
            review_status: "changes_requested",
            reviewed_at: now,
          })
          .eq("id", deliverableVersionId);

        await supabase.from("activity_logs").insert({
          actor_id: userId,
          project_id: deliverable.project_id,
          event_type: "revisions_requested",
          metadata: { deliverableVersionId },
        });

        if (deliverable.submitted_by && deliverable.submitted_by !== userId) {
          await createNotification({
            recipientId: deliverable.submitted_by,
            actorId: userId,
            projectId: deliverable.project_id,
            eventType: "revision_request",
            payload: {
              summary: "Revisions requested on deliverable",
              detail: `Reviewer requested revisions: "${input.body.slice(0, 80)}"`,
              resourceType: "deliverable",
              resourceId: deliverableVersionId,
              actionUrl: `/dashboard/projects/${deliverable.project_id}`,
            },
          });
        }
      } else if (input.commentType === "comment" && deliverable.submitted_by && deliverable.submitted_by !== userId) {
        await createNotification({
          recipientId: deliverable.submitted_by,
          actorId: userId,
          projectId: deliverable.project_id,
          eventType: "comment_added",
          payload: {
            summary: "New comment on deliverable",
            detail: input.body.slice(0, 80),
            resourceType: "deliverable",
            resourceId: deliverableVersionId,
            actionUrl: `/dashboard/projects/${deliverable.project_id}`,
          },
        });
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const row: any = data;
      return {
        id: row.id,
        deliverableVersionId: row.deliverable_version_id,
        authorId: row.author_id,
        authorName: row.profiles?.display_name || "User",
        authorRole: row.profiles?.role || "client",
        body: row.body,
        commentType: row.comment_type,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    }
  }

  // Local fallback
  const del = localDeliverablesStore.find((d) => d.id === deliverableVersionId);
  if (!del) throw new Error("Deliverable version not found.");

  if (input.commentType === "approval_note" && del.submittedBy === userId) {
    throw new Error("Independent sign-off required: you cannot approve your own deliverable.");
  }

  const newComment: RevisionCommentItem = {
    id: `com_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    deliverableVersionId,
    authorId: userId,
    authorName: userId === "usr_owner_01" ? "Sora Vance" : "Client Reviewer",
    authorRole: userId === "usr_owner_01" ? "owner" : "client",
    body: input.body,
    commentType: input.commentType,
    createdAt: now,
    updatedAt: null,
  };

  localCommentsStore = [...localCommentsStore, newComment];

  if (input.commentType === "approval_note") {
    del.reviewStatus = "approved";
    del.reviewedAt = now;
    if (del.submittedBy && del.submittedBy !== userId) {
      await createNotification({
        recipientId: del.submittedBy,
        actorId: userId,
        projectId: del.projectId,
        eventType: "review_decision",
        payload: {
          summary: "Deliverable approved by reviewer",
          detail: `Your deliverable version was approved. Note: "${input.body.slice(0, 80)}"`,
          resourceType: "deliverable",
          resourceId: deliverableVersionId,
          actionUrl: `/dashboard/projects/${del.projectId}`,
        },
      });
    }
  } else if (input.commentType === "revision_request") {
    del.reviewStatus = "changes_requested";
    del.reviewedAt = now;
    if (del.submittedBy && del.submittedBy !== userId) {
      await createNotification({
        recipientId: del.submittedBy,
        actorId: userId,
        projectId: del.projectId,
        eventType: "revision_request",
        payload: {
          summary: "Revisions requested on deliverable",
          detail: `Reviewer requested revisions: "${input.body.slice(0, 80)}"`,
          resourceType: "deliverable",
          resourceId: deliverableVersionId,
          actionUrl: `/dashboard/projects/${del.projectId}`,
        },
      });
    }
  } else if (input.commentType === "comment" && del.submittedBy && del.submittedBy !== userId) {
    await createNotification({
      recipientId: del.submittedBy,
      actorId: userId,
      projectId: del.projectId,
      eventType: "comment_added",
      payload: {
        summary: "New comment on deliverable",
        detail: input.body.slice(0, 80),
        resourceType: "deliverable",
        resourceId: deliverableVersionId,
        actionUrl: `/dashboard/projects/${del.projectId}`,
      },
    });
  }

  return newComment;
}

// ============================================================================
// VERSION COMPARISON
// ============================================================================

export async function compareDeliverableVersions(
  userId: string,
  versionId1: string,
  versionId2: string
): Promise<{
  versionA: DetailedDeliverable;
  versionB: DetailedDeliverable;
  comparison: {
    statusDifference: boolean;
    fileSizeDelta: number;
    versionJump: number;
  };
}> {
  const { isConfigured } = getSupabasePublicConfig();

  if (isConfigured) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { data: rows } = await supabase
        .from("deliverable_versions")
        .select("*, assets(name, mime_type, file_size, storage_path, width, height), projects(title)")
        .in("id", [versionId1, versionId2]);

      if (!rows || rows.length < 2) {
        throw new Error("Both versions must exist to execute a comparison.");
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapItem = (row: any): DetailedDeliverable => ({
        id: row.id,
        projectId: row.project_id,
        projectTitle: row.projects?.title || "Project",
        assetId: row.asset_id,
        assetName: row.assets?.name || "Asset",
        versionNumber: row.version_number,
        submittedBy: row.submitted_by,
        reviewStatus: row.review_status,
        commentSummary: `Version ${row.version_number}`,
        submittedAt: row.submitted_at || row.created_at,
        reviewedAt: row.reviewed_at,
        assetDetails: row.assets ? {
          name: row.assets.name,
          format: row.assets.mime_type.split("/")[1]?.toUpperCase() || "SVG",
          fileSize: Number(row.assets.file_size),
          previewUrl: "/placeholders/asset-brand-system.svg",
          width: row.assets.width,
          height: row.assets.height,
        } : undefined,
      });

      const versionA = mapItem(rows[0]);
      const versionB = mapItem(rows[1]);

      return {
        versionA,
        versionB,
        comparison: {
          statusDifference: versionA.reviewStatus !== versionB.reviewStatus,
          fileSizeDelta: (versionB.assetDetails?.fileSize || 0) - (versionA.assetDetails?.fileSize || 0),
          versionJump: Math.abs(versionB.versionNumber - versionA.versionNumber),
        },
      };
    }
  }

  // Local fallback
  const d1 = localDeliverablesStore.find((d) => d.id === versionId1);
  const d2 = localDeliverablesStore.find((d) => d.id === versionId2);

  if (!d1 || !d2) throw new Error("Could not find both deliverable versions for comparison.");

  const vA: DetailedDeliverable = {
    ...d1,
    assetDetails: {
      name: d1.assetName,
      format: "SVG",
      fileSize: 840_000,
      previewUrl: "/placeholders/asset-brand-system.svg",
      width: 1920,
      height: 1080,
    },
  };

  const vB: DetailedDeliverable = {
    ...d2,
    assetDetails: {
      name: d2.assetName,
      format: "SVG",
      fileSize: 920_000,
      previewUrl: "/placeholders/asset-brand-system.svg",
      width: 1920,
      height: 1080,
    },
  };

  return {
    versionA: vA,
    versionB: vB,
    comparison: {
      statusDifference: vA.reviewStatus !== vB.reviewStatus,
      fileSizeDelta: (vB.assetDetails?.fileSize || 0) - (vA.assetDetails?.fileSize || 0),
      versionJump: Math.abs(vB.versionNumber - vA.versionNumber),
    },
  };
}
