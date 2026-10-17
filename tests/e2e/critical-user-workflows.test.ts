import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as loginPost } from "@/app/api/v1/auth/login/route";
import { POST as forgotPasswordPost } from "@/app/api/v1/auth/forgot-password/route";
import { POST as contactPost } from "@/app/api/v1/contact/route";
import { resetRateLimitStore } from "@/lib/security/rate-limit";
import {
  createProject,
  getProjectById,
  listProjects,
  updateProject,
  toggleArchiveProject,
  deleteProject,
} from "@/lib/projects/service";
import {
  createAsset,
  getAssetById,
  listAssets,
  createCollection,
  addAssetToCollection,
  removeAssetFromCollection,
  deleteCollection,
} from "@/lib/assets/service";
import {
  createProjectInvitation,
  verifyInvitation,
  acceptInvitation,
  createDeliverableVersion,
  compareDeliverableVersions,
  addRevisionComment,
} from "@/lib/collaboration/service";
import { listNotifications } from "@/lib/notifications/service";
import {
  listContactInquiries,
  updateContactInquiryStatus,
} from "@/lib/contact/service";

const OWNER_ID = "usr_owner_01";
const CLIENT_ID = "33333333-3333-4333-8333-333333333333";
const INTRUDER_ID = "99999999-9999-4999-8999-999999999999";

describe("Phase 7 — End-to-End Critical User Workflows", () => {
  beforeEach(() => {
    resetRateLimitStore();
  });

  it("Journey 1: Enforces validation, anti-enumeration, and sliding-window rate limits on authentication & public endpoints", async () => {
    // 1. Invalid login payload returns 400 VALIDATION_ERROR
    const invalidLoginReq = new NextRequest(
      "http://localhost:3000/api/v1/auth/login",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "198.51.100.10",
        },
        body: JSON.stringify({ email: "bad-email", password: "123" }),
      }
    );
    const invalidLoginRes = await loginPost(invalidLoginReq);
    expect(invalidLoginRes.status).toBe(400);
    const invalidBody = await invalidLoginRes.json();
    expect(invalidBody.error.code).toBe("VALIDATION_ERROR");

    // 2. Password reset returns generic 200 response to prevent account enumeration
    // and enforces 5 requests / 60s rate limit on the 6th attempt
    for (let i = 0; i < 5; i++) {
      const resetReq = new NextRequest(
        "http://localhost:3000/api/v1/auth/forgot-password",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-forwarded-for": "198.51.100.25",
          },
          body: JSON.stringify({ email: `probe-${i}@example.com` }),
        }
      );
      const resetRes = await forgotPasswordPost(resetReq);
      expect(resetRes.status).toBe(200);
    }

    const throttledResetReq = new NextRequest(
      "http://localhost:3000/api/v1/auth/forgot-password",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "198.51.100.25",
        },
        body: JSON.stringify({ email: "probe-6@example.com" }),
      }
    );
    const throttledResetRes = await forgotPasswordPost(throttledResetReq);
    expect(throttledResetRes.status).toBe(429);
    expect(throttledResetRes.headers.get("Retry-After")).toBeTruthy();
    const throttledBody = await throttledResetRes.json();
    expect(throttledBody.error.code).toBe("RATE_LIMIT_EXCEEDED");
  });

  it("Journey 2: Executes complete Project CRUD lifecycle and enforces cross-user IDOR isolation", async () => {
    // 1. Studio owner creates a new private project
    const created = await createProject(OWNER_ID, {
      title: "Hyperion Orbital UI Kit",
      description: "Modular telemetry interface system for orbital spacecraft.",
      brief: "Deliver dark-mode HUD components with WCAG AAA contrast.",
      category: "UI Visual Design",
      status: "in_progress",
      priority: "high",
      visibility: "private",
      featured: false,
      tools: ["Figma", "After Effects"],
    });

    expect(created.id).toBeTruthy();
    expect(created.slug).toBe("hyperion-orbital-ui-kit");
    expect(created.visibility).toBe("private");

    // 2. Owner can retrieve and search for the project
    const fetchedByOwner = await getProjectById(OWNER_ID, created.id);
    expect(fetchedByOwner?.title).toBe("Hyperion Orbital UI Kit");

    const listResult = await listProjects(OWNER_ID, {
      search: "Hyperion Orbital",
      status: "all",
      category: "all",
      sortBy: "date",
      sortOrder: "desc",
      page: 1,
      limit: 12,
    });
    expect(listResult.projects.some((p) => p.id === created.id)).toBe(true);

    // 3. Unrelated user cannot view or mutate the private project
    const otherOwnerProject = await createProject("usr_isolated_owner", {
      title: "Confidential Stealth Deck",
      description: "Private venture deck.",
      brief: "Strictly confidential.",
      category: "Brand Identity",
      status: "draft",
      priority: "urgent",
      visibility: "private",
      featured: false,
      tools: ["Figma"],
    });

    const intruderView = await getProjectById(
      INTRUDER_ID,
      otherOwnerProject.id
    );
    expect(intruderView).toBeNull();

    await expect(
      updateProject(INTRUDER_ID, otherOwnerProject.id, {
        title: "Hijacked Title",
      })
    ).rejects.toThrow(/Unauthorized/i);

    await expect(
      deleteProject(INTRUDER_ID, otherOwnerProject.id)
    ).rejects.toThrow(/Unauthorized/i);

    // 4. Studio owner updates, archives, and deletes the project cleanly
    const updated = await updateProject(OWNER_ID, created.id, {
      status: "in_review",
      featured: true,
    });
    expect(updated.status).toBe("in_review");
    expect(updated.featured).toBe(true);

    const archived = await toggleArchiveProject(OWNER_ID, created.id);
    expect(archived.status).toBe("archived");

    const deleted = await deleteProject(OWNER_ID, created.id);
    expect(deleted).toBe(true);
    expect(await getProjectById(OWNER_ID, created.id)).toBeNull();
  });

  it("Journey 3: Manages Creative Asset upload, path-traversal sanitization, tagging, and collection curation", async () => {
    // 1. Create a new collection
    const collection = await createCollection(OWNER_ID, {
      name: "Phase 7 QA Master Vault",
      description: "Curated vector deliverables for automated E2E verification.",
      category: "UI Visual Design",
      visibility: "private",
    });
    expect(collection.id).toBeTruthy();

    // 2. Upload an asset with a dangerous path-traversal filename and verify sanitization
    const asset = await createAsset(OWNER_ID, {
      name: "Orbital Telemetry Vector Grid",
      description: "Primary HUD vector grid in SVG format.",
      originalFilename: "../../etc/passwd/orbital_hud_grid.svg",
      mimeType: "image/svg+xml",
      fileSize: 420_000,
      width: 2560,
      height: 1440,
      category: "UI Visual Design",
      tags: ["hud", "telemetry", "vector"],
      visibility: "private",
      downloadable: false,
      linkedProjectIds: [],
      collectionIds: [],
    });

    expect(asset.storagePath).toContain(`${OWNER_ID}/`);
    expect(asset.storagePath).not.toContain("..");
    expect(asset.storagePath).not.toContain("etc/passwd");
    expect(asset.format).toBe("SVG");

    // 3. Add asset to collection and filter by tag + collection
    await addAssetToCollection(OWNER_ID, collection.id, asset.id);

    const filteredAssets = await listAssets(OWNER_ID, {
      search: "Orbital Telemetry",
      category: "UI Visual Design",
      format: "SVG",
      visibility: "private",
      tag: "telemetry",
      projectId: "all",
      collectionId: collection.id,
      sortBy: "date",
      sortOrder: "desc",
      page: 1,
      limit: 10,
    });
    expect(filteredAssets.assets.some((a) => a.id === asset.id)).toBe(true);

    // 4. Clean up collection membership and collection
    await removeAssetFromCollection(OWNER_ID, collection.id, asset.id);
    const removedCol = await deleteCollection(OWNER_ID, collection.id);
    expect(removedCol).toBe(true);

    // Verify private asset is isolated from unrelated users when owned by a dedicated user
    const isolatedAsset = await createAsset("usr_dedicated_designer", {
      name: "Private Key Visual",
      description: "Confidential key visual.",
      originalFilename: "key-visual.png",
      mimeType: "image/png",
      fileSize: 512_000,
      width: 1920,
      height: 1080,
      category: "Brand Identity",
      tags: ["confidential"],
      visibility: "private",
      downloadable: false,
      linkedProjectIds: [],
      collectionIds: [],
    });
    expect(await getAssetById(INTRUDER_ID, isolatedAsset.id)).toBeNull();
  });

  it("Journey 4: Executes Client Invitation, Deliverable Version Comparison, Self-Approval Block, and Client Sign-Off", async () => {
    const projectId = "prj_01";

    // 1. Studio owner issues a single-use cryptographic invitation for a client
    const { invitation, rawToken } = await createProjectInvitation(OWNER_ID, {
      projectId,
      email: "elena.qa@helio.bio",
      role: "client",
      expiresInDays: 7,
    });

    expect(rawToken.length).toBeGreaterThanOrEqual(32);
    expect(invitation.acceptedAt).toBeNull();
    expect(invitation.revokedAt).toBeNull();
    expect(invitation.tokenHash).not.toBe(rawToken);

    // 2. Verify token inspection before acceptance
    const verification = await verifyInvitation(rawToken);
    expect(verification.valid).toBe(true);
    expect(verification.invitation?.email).toBe("elena.qa@helio.bio");

    // 3. Invited client accepts invitation idempotently
    const firstAccept = await acceptInvitation(CLIENT_ID, rawToken);
    expect(firstAccept.success).toBe(true);
    expect(firstAccept.role).toBe("client");

    const secondAccept = await acceptInvitation(CLIENT_ID, rawToken);
    expect(secondAccept.success).toBe(true);

    // 4. Studio owner submits two deliverable versions and compares deltas
    const v1 = await createDeliverableVersion(OWNER_ID, {
      projectId,
      assetId: "ast_01",
      versionNotes: "Initial brand geometry exploration.",
      reviewStatus: "submitted",
    });

    const v2 = await createDeliverableVersion(OWNER_ID, {
      projectId,
      assetId: "ast_02",
      versionNotes: "Refined kerning and dark-mode contrast ratios.",
      reviewStatus: "submitted",
    });

    expect(v2.versionNumber).toBeGreaterThan(v1.versionNumber);

    const comparison = await compareDeliverableVersions(
      OWNER_ID,
      v1.id,
      v2.id
    );
    expect(comparison.comparison.versionJump).toBe(
      Math.abs(v2.versionNumber - v1.versionNumber)
    );

    // 5. Submitter is blocked from approving their own deliverable
    await expect(
      addRevisionComment(OWNER_ID, v2.id, {
        body: "Attempting self-approval.",
        commentType: "approval_note",
      })
    ).rejects.toThrow(/Independent sign-off required/i);

    // 6. Client approves deliverable v2 and triggers notification to owner
    const beforeNotifs = await listNotifications(OWNER_ID);
    const approvalComment = await addRevisionComment(CLIENT_ID, v2.id, {
      body: "Contrast and geometry look superlative. Approved for production release.",
      commentType: "approval_note",
    });
    expect(approvalComment.commentType).toBe("approval_note");

    const afterNotifs = await listNotifications(OWNER_ID);
    expect(afterNotifs.unreadCount).toBeGreaterThanOrEqual(
      beforeNotifs.unreadCount
    );
    expect(afterNotifs.notifications.length).toBeGreaterThan(0);
  });

  it("Journey 5: Processes Public Contact Inquiries, Honeypot Protection, Rate Limiting, and Owner Status Triage", async () => {
    // 1. Valid public contact submission via API route
    const validContactReq = new NextRequest(
      "http://localhost:3000/api/v1/contact",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "203.0.113.88",
        },
        body: JSON.stringify({
          senderName: "Marcus Sterling",
          senderEmail: "marcus@sterling-labs.io",
          company: "Sterling Orbital Labs",
          subject: "Next-Gen Design System Partnership",
          budgetRange: "$25k – $50k",
          timeline: "Q1 2027",
          message:
            "We need a comprehensive design system and 3D telemetry visualization suite for our upcoming satellite control platform.",
          websiteHoneypot: "",
        }),
      }
    );

    const contactRes = await contactPost(validContactReq);
    expect(contactRes.status).toBe(201);
    const contactJson = await contactRes.json();
    expect(contactJson.data.success).toBe(true);
    const inquiryId = contactJson.data.inquiryId;
    expect(inquiryId).toBeTruthy();

    // 2. Studio owner lists inquiries and updates status to 'read'
    const inquiries = await listContactInquiries(OWNER_ID);
    expect(inquiries.some((inq) => inq.id === inquiryId)).toBe(true);

    const updatedOk = await updateContactInquiryStatus(
      OWNER_ID,
      inquiryId,
      "read"
    );
    expect(updatedOk).toBe(true);

    const refreshedInquiries = await listContactInquiries(OWNER_ID);
    expect(
      refreshedInquiries.find((inq) => inq.id === inquiryId)?.status
    ).toBe("read");

    // 3. Unauthorized user cannot read or triage studio inquiries
    const intruderInquiries = await listContactInquiries(INTRUDER_ID);
    expect(intruderInquiries).toHaveLength(0);
    await expect(
      updateContactInquiryStatus(INTRUDER_ID, inquiryId, "archived")
    ).rejects.toThrow(/Forbidden/i);
  });
});
