import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import {
  generateInvitationToken,
  hashInvitationToken,
  createProjectInvitation,
  verifyInvitation,
  acceptInvitation,
  revokeInvitation,
  listDeliverables,
  createDeliverableVersion,
  addRevisionComment,
  compareDeliverableVersions,
} from "@/lib/collaboration/service";
import {
  createClientSchema,
  createInvitationSchema,
  acceptInvitationSchema,
  createDeliverableVersionSchema,
  createRevisionCommentSchema,
  reviewDeliverableSchema,
} from "@/lib/validation/collaboration";

// Seeded user and project UUIDs from supabase/seed.sql
const STUDIO_OWNER_ID = "11111111-1111-4111-8111-111111111111"; // Sora Vance (owner)
const UNRELATED_USER_ID = "22222222-2222-4222-8222-222222222222"; // Kaelen Mercer (unrelated owner)
const CLIENT_USER_ID = "33333333-3333-4333-8333-333333333333"; // Dr. Elena Rostova (client member of Project 2)

const SEED_PROJECT_1_ID = "cccccccc-1111-4111-8111-111111111111"; // Public project
const SEED_PROJECT_2_ID = "cccccccc-2222-4222-8222-222222222222"; // Private project with CLIENT_USER_ID as member
const SEED_DELIVERABLE_1_ID = "dddddddd-1111-4111-8111-111111111111"; // Deliverable on Project 2

describe("Phase 5 — Client Workspace, Invitations, Deliverables, and Reviews", () => {
  let db: PGlite;

  async function queryAs<T = Record<string, unknown>>(
    role: "anon" | "authenticated",
    userId: string | null,
    sql: string,
    params: unknown[] = []
  ) {
    await db.exec("BEGIN;");
    try {
      await db.exec(`SET LOCAL ROLE ${role};`);
      await db.exec(
        `SELECT set_config('request.jwt.claim.role', '${role}', true);`
      );
      await db.exec(
        `SELECT set_config('request.jwt.claim.sub', '${userId ?? ""}', true);`
      );
      const result = await db.query<T>(sql, params);
      await db.exec("COMMIT;");
      return result;
    } catch (err) {
      await db.exec("ROLLBACK;");
      throw err;
    }
  }

  beforeAll(async () => {
    db = new PGlite();

    const migration1Path = path.join(
      process.cwd(),
      "supabase/migrations/20261016000001_initial_schema.sql"
    );
    const migration2Path = path.join(
      process.cwd(),
      "supabase/migrations/20261016000002_rls_policies.sql"
    );
    const seedPath = path.join(process.cwd(), "supabase/seed.sql");

    const sql1 = fs.readFileSync(migration1Path, "utf8");
    const sql2 = fs.readFileSync(migration2Path, "utf8");
    const seedSql = fs.readFileSync(seedPath, "utf8");

    await db.exec(sql1);
    await db.exec(sql2);
    await db.exec(seedSql);
  });

  afterAll(async () => {
    await db.close();
  });

  describe("1. Cryptographic Invitation Token Generation & Zero-Trust Hashing", () => {
    it("generates a high-entropy 64-hex character token (32 random bytes)", () => {
      const token1 = generateInvitationToken();
      const token2 = generateInvitationToken();

      expect(token1).toHaveLength(64);
      expect(token2).toHaveLength(64);
      expect(token1).not.toBe(token2);
      expect(/^[0-9a-f]{64}$/.test(token1)).toBe(true);
    });

    it("hashes invitation tokens deterministically using SHA-256", () => {
      const token = "a".repeat(64);
      const hash1 = hashInvitationToken(token);
      const hash2 = hashInvitationToken(token);

      const expected = crypto.createHash("sha256").update(token).digest("hex");
      expect(hash1).toBe(expected);
      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(token);
    });

    it("validates invitation input schemas with strict boundaries", () => {
      const valid = createInvitationSchema.safeParse({
        projectId: "proj_01",
        email: "client@acme.example",
        role: "client",
        expiresInDays: 7,
      });
      expect(valid.success).toBe(true);

      const invalidEmail = createInvitationSchema.safeParse({
        projectId: "proj_01",
        email: "not-an-email",
        role: "client",
      });
      expect(invalidEmail.success).toBe(false);

      const invalidExpiry = createInvitationSchema.safeParse({
        projectId: "proj_01",
        email: "client@acme.example",
        expiresInDays: 90, // exceeds max 30
      });
      expect(invalidExpiry.success).toBe(false);
    });
  });

  describe("2. Single-Use Expiring Invitations Lifecycle", () => {
    it("creates an invitation in the database with hashed token and expiry", async () => {
      const rawToken = generateInvitationToken();
      const tokenHash = hashInvitationToken(rawToken);
      const expiresAt = new Date(Date.now() + 7 * 86400 * 1000).toISOString();
      const invId = "eeeeeeee-1111-4111-8111-111111111111";

      await db.query(
        `INSERT INTO project_invitations (id, project_id, email, role, token_hash, invited_by, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          invId,
          SEED_PROJECT_1_ID,
          "client@horizon.example",
          "client",
          tokenHash,
          STUDIO_OWNER_ID,
          expiresAt,
        ]
      );

      // Verify plaintext token is never stored in DB
      const result = await db.query<{ token_hash: string }>(
        "SELECT token_hash FROM project_invitations WHERE id = $1",
        [invId]
      );
      expect(result.rows[0].token_hash).toBe(tokenHash);
      expect(result.rows[0].token_hash).not.toBe(rawToken);
    });

    it("service creates project invitation with rawToken returned only once", async () => {
      const result = await createProjectInvitation(STUDIO_OWNER_ID, {
        projectId: "proj_01",
        email: "reviewer@studio.example",
        clientName: "Reviewer Vance",
        company: "Vance Media",
        role: "client",
        expiresInDays: 7,
      });

      expect(result.rawToken).toHaveLength(64);
      expect(result.invitationUrl).toBe(`/invite/${result.rawToken}`);
      expect(result.invitation.email).toBe("reviewer@studio.example");
      expect(result.invitation.tokenHash).toBe(hashInvitationToken(result.rawToken));
      expect(result.invitation.acceptedAt).toBeNull();
      expect(result.invitation.revokedAt).toBeNull();

      // Verification succeeds with valid token
      const verified = await verifyInvitation(result.rawToken);
      expect(verified.valid).toBe(true);
      expect(verified.invitation?.email).toBe("reviewer@studio.example");
    });

    it("rejects verification of non-existent or malformed tokens", async () => {
      const fakeToken = "b".repeat(64);
      const verified = await verifyInvitation(fakeToken);
      expect(verified.valid).toBe(false);
      expect(verified.reason).toBeDefined();
    });

    it("revokes an invitation and blocks acceptance once revoked", async () => {
      const result = await createProjectInvitation(STUDIO_OWNER_ID, {
        projectId: "proj_02",
        email: "revoked@studio.example",
        role: "client",
        expiresInDays: 7,
      });

      const revokeSuccess = await revokeInvitation(
        STUDIO_OWNER_ID,
        result.invitation.id
      );
      expect(revokeSuccess).toBe(true);

      const verified = await verifyInvitation(result.rawToken);
      expect(verified.valid).toBe(false);
      expect(verified.reason).toContain("revoked");

      await expect(
        acceptInvitation(CLIENT_USER_ID, result.rawToken)
      ).rejects.toThrow(/revoked/i);
    });

    it("accepts an invitation idempotently and adds member to project", async () => {
      const result = await createProjectInvitation(STUDIO_OWNER_ID, {
        projectId: "proj_03",
        email: "collab@studio.example",
        role: "collaborator",
        expiresInDays: 7,
      });

      // First acceptance
      const acceptResult1 = await acceptInvitation(
        CLIENT_USER_ID,
        result.rawToken
      );
      expect(acceptResult1.success).toBe(true);
      expect(acceptResult1.role).toBe("collaborator");

      // Second acceptance by same user is idempotent
      const acceptResult2 = await acceptInvitation(
        CLIENT_USER_ID,
        result.rawToken
      );
      expect(acceptResult2.success).toBe(true);
      expect(acceptResult2.role).toBe("collaborator");
    });
  });

  describe("3. Deliverables, Version History & Version Comparison", () => {
    it("creates sequential deliverable versions with notes and status", async () => {
      const v1 = await createDeliverableVersion(STUDIO_OWNER_ID, {
        projectId: "proj_flow_01",
        assetId: "ass_01",
        versionNotes: "Initial optical grid with Display P3 tokens.",
        reviewStatus: "submitted",
      });

      expect(v1.versionNumber).toBeGreaterThanOrEqual(1);
      expect(v1.reviewStatus).toBe("submitted");
      expect(v1.commentSummary).toContain("Initial optical grid");

      const v2 = await createDeliverableVersion(STUDIO_OWNER_ID, {
        projectId: "proj_flow_01",
        assetId: "ass_02",
        versionNotes: "Expanded bleed zones and corner radii adjustments.",
        reviewStatus: "submitted",
      });

      expect(v2.versionNumber).toBe(v1.versionNumber + 1);
    });

    it("retrieves deliverable versions for a given project", async () => {
      const deliverables = await listDeliverables(STUDIO_OWNER_ID, "proj_flow_01");
      expect(Array.isArray(deliverables)).toBe(true);
      expect(deliverables.length).toBeGreaterThanOrEqual(2);
      expect(deliverables[0].projectId).toBe("proj_flow_01");
    });

    it("compares two deliverable iterations and computes metadata delta", async () => {
      const deliverables = await listDeliverables(STUDIO_OWNER_ID, "proj_flow_01");
      expect(deliverables.length).toBeGreaterThanOrEqual(2);

      const vA = deliverables[deliverables.length - 1];
      const vB = deliverables[0];

      const comp = await compareDeliverableVersions(
        STUDIO_OWNER_ID,
        vA.id,
        vB.id
      );

      expect(comp.versionA.id).toBe(vA.id);
      expect(comp.versionB.id).toBe(vB.id);
      expect(typeof comp.comparison.versionJump).toBe("number");
      expect(typeof comp.comparison.fileSizeDelta).toBe("number");
      expect(typeof comp.comparison.statusDifference).toBe("boolean");
    });
  });

  describe("4. Review Workflow & Independent Sign-Off Rule", () => {
    let testDeliverableId: string;
    const authorId = "usr_author_test";
    const reviewerId = "usr_reviewer_test";

    beforeAll(async () => {
      const del = await createDeliverableVersion(authorId, {
        projectId: "proj_review_test",
        assetId: "ass_test",
        versionNotes: "Deliverable submitted for review.",
        reviewStatus: "submitted",
      });
      testDeliverableId = del.id;
    });

    it("allows posting regular annotations and comments on deliverables", async () => {
      const comment = await addRevisionComment(reviewerId, testDeliverableId, {
        body: "Check horizontal baseline alignment at 16px breakpoint.",
        commentType: "comment",
      });

      expect(comment.id).toBeDefined();
      expect(comment.body).toContain("baseline alignment");
      expect(comment.commentType).toBe("comment");
    });

    it("transitions deliverable to 'changes_requested' when revisions are requested", async () => {
      const comment = await addRevisionComment(reviewerId, testDeliverableId, {
        body: "Corner radius must be consistent with 8px design token.",
        commentType: "revision_request",
      });

      expect(comment.commentType).toBe("revision_request");

      const deliverables = await listDeliverables(authorId, "proj_review_test");
      const updated = deliverables.find((d) => d.id === testDeliverableId);
      expect(updated?.reviewStatus).toBe("changes_requested");
    });

    it("enforces independent approval: submitter CANNOT approve their own deliverable", async () => {
      // Submitter is authorId: attempting approval must be rejected
      await expect(
        addRevisionComment(authorId, testDeliverableId, {
          body: "I approve my own work.",
          commentType: "approval_note",
        })
      ).rejects.toThrow(/cannot approve your own/i);
    });

    it("allows independent reviewer to approve deliverable and marks status 'approved'", async () => {
      // Reviewer is reviewerId !== authorId
      const comment = await addRevisionComment(reviewerId, testDeliverableId, {
        body: "Approved without reservations. Production ready.",
        commentType: "approval_note",
      });

      expect(comment.commentType).toBe("approval_note");

      const deliverables = await listDeliverables(authorId, "proj_review_test");
      const updated = deliverables.find((d) => d.id === testDeliverableId);
      expect(updated?.reviewStatus).toBe("approved");
    });
  });

  describe("5. PostgreSQL Row-Level Security for Collaboration & Scoped Client Access", () => {
    it("allows project owner to view deliverable versions in PostgreSQL", async () => {
      const result = await queryAs(
        "authenticated",
        STUDIO_OWNER_ID,
        "SELECT * FROM deliverable_versions WHERE project_id = $1",
        [SEED_PROJECT_2_ID]
      );

      expect(result.rows.length).toBeGreaterThanOrEqual(1);
    });

    it("allows authorized project members to view deliverables of their project", async () => {
      // CLIENT_USER_ID is an accepted member of SEED_PROJECT_2_ID in seed.sql
      const result = await queryAs(
        "authenticated",
        CLIENT_USER_ID,
        "SELECT * FROM deliverable_versions WHERE project_id = $1",
        [SEED_PROJECT_2_ID]
      );

      expect(result.rows.length).toBeGreaterThanOrEqual(1);
      expect(result.rows[0].id).toBe(SEED_DELIVERABLE_1_ID);
    });

    it("prevents unassigned users from viewing private deliverables of another project", async () => {
      // UNRELATED_USER_ID is not a member of SEED_PROJECT_2_ID
      const result = await queryAs(
        "authenticated",
        UNRELATED_USER_ID,
        "SELECT * FROM deliverable_versions WHERE project_id = $1",
        [SEED_PROJECT_2_ID]
      );

      // RLS policy scopes select to project owners or authorized members
      expect(result.rows.length).toBe(0);
    });

    it("prevents anonymous visitors from accessing deliverable versions", async () => {
      await expect(
        queryAs(
          "anon",
          null,
          "SELECT * FROM deliverable_versions WHERE project_id = $1",
          [SEED_PROJECT_2_ID]
        )
      ).rejects.toThrow(/permission denied/i);
    });

    it("allows clients to post comments to deliverables of projects they are members of", async () => {
      const insertResult = await queryAs(
        "authenticated",
        CLIENT_USER_ID,
        `INSERT INTO revision_comments (deliverable_version_id, author_id, body, comment_type)
         VALUES ($1, $2, $3, $4)
         RETURNING id, body`,
        [SEED_DELIVERABLE_1_ID, CLIENT_USER_ID, "Verified typography scale.", "comment"]
      );

      expect(insertResult.rows.length).toBe(1);
      expect(insertResult.rows[0].body).toBe("Verified typography scale.");
    });

    it("prevents unassigned users from posting comments to private project deliverables", async () => {
      await expect(
        queryAs(
          "authenticated",
          UNRELATED_USER_ID,
          `INSERT INTO revision_comments (deliverable_version_id, author_id, body, comment_type)
           VALUES ($1, $2, $3, $4)`,
          [SEED_DELIVERABLE_1_ID, UNRELATED_USER_ID, "Unauthorized comment.", "comment"]
        )
      ).rejects.toThrow(/violates row-level security policy/i);
    });
  });
});
