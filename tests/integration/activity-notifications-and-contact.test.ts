import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import fs from "fs";
import path from "path";
import {
  sanitizeActivityMetadata,
  recordActivityLog,
  listActivityLogs,
} from "@/lib/activity/service";
import {
  createNotification,
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  isEmailProviderConfigured,
  dispatchEmailIfConfigured,
} from "@/lib/notifications/service";
import {
  contactInquirySchema,
  updateInquiryStatusSchema,
} from "@/lib/validation/contact";
import {
  submitContactInquiry,
  listContactInquiries,
  updateContactInquiryStatus,
} from "@/lib/contact/service";

// Seeded test UUIDs from supabase/seed.sql
const STUDIO_OWNER_ID = "11111111-1111-4111-8111-111111111111"; // Sora Vance (owner)
const UNRELATED_USER_ID = "22222222-2222-4222-8222-222222222222"; // Kaelen Mercer (owner of separate workspace)
const CLIENT_USER_ID = "33333333-3333-4333-8333-333333333333"; // Dr. Elena Rostova (client member of Project 2)
const SEED_PROJECT_2_ID = "cccccccc-2222-4222-8222-222222222222"; // Private project with CLIENT_USER_ID

describe("Phase 6 — Activity Logs, Notifications, Contact Forms, and UX Polish", () => {
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

  // ==========================================================================
  // 1. IMMUTABLE ACTIVITY LOGS & AUDIT TRAIL
  // ==========================================================================
  describe("1. Activity Logs & Immutable Audit Trail", () => {
    it("allows authenticated actors to insert activity logs with sanitized metadata", async () => {
      const res = await queryAs(
        "authenticated",
        STUDIO_OWNER_ID,
        `INSERT INTO public.activity_logs (actor_id, project_id, event_type, metadata)
         VALUES ($1, $2, 'asset_uploaded', '{"filename": "brand-sheet.svg", "fileSize": 1024000}'::jsonb)
         RETURNING id, event_type;`,
        [STUDIO_OWNER_ID, SEED_PROJECT_2_ID]
      );

      expect(res.rows).toHaveLength(1);
      expect(res.rows[0].event_type).toBe("asset_uploaded");
    });

    it("prevents ordinary users from UPDATING activity logs (immutable audit requirement)", async () => {
      // First insert an activity log
      const insertRes = await queryAs(
        "authenticated",
        STUDIO_OWNER_ID,
        `INSERT INTO public.activity_logs (actor_id, event_type, metadata)
         VALUES ($1, 'project_created', '{"title": "Initial"}'::jsonb)
         RETURNING id;`,
        [STUDIO_OWNER_ID]
      );
      const logId = insertRes.rows[0].id;

      // Attempting to UPDATE the audit record must yield 0 updated rows due to absence of UPDATE policy
      const updateRes = await queryAs(
        "authenticated",
        STUDIO_OWNER_ID,
        `UPDATE public.activity_logs
         SET metadata = '{"tampered": true}'::jsonb
         WHERE id = $1;`,
        [logId]
      );

      expect(updateRes.affectedRows ?? updateRes.rows.length).toBe(0);

      // Verify original metadata was NOT modified
      const selectRes = await queryAs(
        "authenticated",
        STUDIO_OWNER_ID,
        `SELECT metadata FROM public.activity_logs WHERE id = $1;`,
        [logId]
      );
      expect(selectRes.rows[0].metadata).toEqual({ title: "Initial" });
    });

    it("prevents ordinary users from DELETING activity logs", async () => {
      const insertRes = await queryAs(
        "authenticated",
        STUDIO_OWNER_ID,
        `INSERT INTO public.activity_logs (actor_id, event_type)
         VALUES ($1, 'member_joined')
         RETURNING id;`,
        [STUDIO_OWNER_ID]
      );
      const logId = insertRes.rows[0].id;

      // Attempting to DELETE must yield 0 affected rows
      const deleteRes = await queryAs(
        "authenticated",
        STUDIO_OWNER_ID,
        `DELETE FROM public.activity_logs WHERE id = $1;`,
        [logId]
      );

      expect(deleteRes.affectedRows ?? deleteRes.rows.length).toBe(0);

      // Verify the log row still exists
      const verifyRes = await queryAs(
        "authenticated",
        STUDIO_OWNER_ID,
        `SELECT id FROM public.activity_logs WHERE id = $1;`,
        [logId]
      );
      expect(verifyRes.rows).toHaveLength(1);
    });

    it("rejects anonymous reads or inserts into activity_logs", async () => {
      // Anonymous select must fail with permission denied (anon has no SELECT grant on activity_logs)
      await expect(
        queryAs("anon", null, `SELECT * FROM public.activity_logs;`)
      ).rejects.toThrow(/permission denied/i);

      // Anonymous insert must fail RLS with check violation or permission denied
      await expect(
        queryAs(
          "anon",
          null,
          `INSERT INTO public.activity_logs (actor_id, event_type)
           VALUES ('00000000-0000-0000-0000-000000000000', 'login');`
        )
      ).rejects.toThrow();
    });

    it("sanitizes metadata by stripping passwords, tokens, API keys, and credential hashes", () => {
      const rawMetadata = {
        projectId: "proj_123",
        version: "v2.0",
        rawToken: "inv_secret_token_12345",
        passwordHash: "$2b$12$e80yJ..fake",
        api_key: "pf_live_abcde",
        client_secret: "super-secret-key",
        authToken: "bearer 987654",
        nestedCredentials: {
          token: "nested-secret",
        },
        legitimateData: "Design system refresh",
      };

      const sanitized = sanitizeActivityMetadata(rawMetadata);

      expect(sanitized).toBeDefined();
      expect(sanitized?.projectId).toBe("proj_123");
      expect(sanitized?.version).toBe("v2.0");
      expect(sanitized?.legitimateData).toBe("Design system refresh");

      // Verify all sensitive keys were strictly stripped
      expect(sanitized?.rawToken).toBeUndefined();
      expect(sanitized?.passwordHash).toBeUndefined();
      expect(sanitized?.api_key).toBeUndefined();
      expect(sanitized?.client_secret).toBeUndefined();
      expect(sanitized?.authToken).toBeUndefined();
      expect(sanitized?.nestedCredentials).toBeUndefined();
    });

    it("handles null, empty, or undefined metadata gracefully", () => {
      expect(sanitizeActivityMetadata(undefined)).toBeUndefined();
      expect(sanitizeActivityMetadata({})).toBeUndefined();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(sanitizeActivityMetadata(null as any)).toBeUndefined();
    });

    it("records and lists activity logs in local fallback store", async () => {
      const actorId = "usr_test_actor";
      const projectId = "proj_test_99";

      await recordActivityLog({
        actorId,
        projectId,
        eventType: "deliverable_submitted",
        metadata: {
          deliverableId: "del_88",
          versionNumber: 2,
        },
      });

      const logs = await listActivityLogs(actorId, { projectId });
      expect(logs.length).toBeGreaterThanOrEqual(1);
      const found = logs.find((l) => l.eventType === "deliverable_submitted");
      expect(found).toBeDefined();
      expect(found?.metadata?.versionNumber).toBe(2);
    });
  });

  // ==========================================================================
  // 2. IN-APP NOTIFICATIONS & RECIPIENT PRIVACY
  // ==========================================================================
  describe("2. In-App Notifications & Scoped Delivery", () => {
    it("enforces recipient-scoped visibility in PostgreSQL RLS", async () => {
      // 1. Client user inserts notification for STUDIO_OWNER_ID
      await queryAs(
        "authenticated",
        CLIENT_USER_ID,
        `INSERT INTO public.notifications (recipient_id, actor_id, event_type, payload)
         VALUES ($1, $2, 'member_joined', '{"summary": "Elena joined Project 2"}'::jsonb);`,
        [STUDIO_OWNER_ID, CLIENT_USER_ID]
      );

      // 2. STUDIO_OWNER_ID can select their notification
      const ownerRes = await queryAs(
        "authenticated",
        STUDIO_OWNER_ID,
        `SELECT * FROM public.notifications WHERE recipient_id = $1;`,
        [STUDIO_OWNER_ID]
      );
      expect(ownerRes.rows.length).toBeGreaterThanOrEqual(1);

      // 3. UNRELATED_USER_ID cannot see the owner's notification
      const unrelatedRes = await queryAs(
        "authenticated",
        UNRELATED_USER_ID,
        `SELECT * FROM public.notifications WHERE recipient_id = $1;`,
        [STUDIO_OWNER_ID]
      );
      expect(unrelatedRes.rows).toHaveLength(0);
    });

    it("enforces database trigger: only read_at may be updated on notifications", async () => {
      // 1. Client user inserts notification for STUDIO_OWNER_ID
      await queryAs(
        "authenticated",
        CLIENT_USER_ID,
        `INSERT INTO public.notifications (recipient_id, actor_id, event_type, payload)
         VALUES ($1, $2, 'review_decision', '{"summary": "Deliverable approved"}'::jsonb);`,
        [STUDIO_OWNER_ID, CLIENT_USER_ID]
      );

      // 2. STUDIO_OWNER_ID retrieves their notification id
      const notifRes = await queryAs(
        "authenticated",
        STUDIO_OWNER_ID,
        `SELECT id FROM public.notifications WHERE recipient_id = $1 ORDER BY created_at DESC LIMIT 1;`,
        [STUDIO_OWNER_ID]
      );
      expect(notifRes.rows.length).toBeGreaterThanOrEqual(1);
      const notifId = notifRes.rows[0].id;

      // Updating read_at is legitimate and must succeed
      await expect(
        queryAs(
          "authenticated",
          STUDIO_OWNER_ID,
          `UPDATE public.notifications
           SET read_at = timezone('utc', now())
           WHERE id = $1;`,
          [notifId]
        )
      ).resolves.not.toThrow();

      // Attempting to tamper with payload or event_type must trigger exception
      await expect(
        queryAs(
          "authenticated",
          STUDIO_OWNER_ID,
          `UPDATE public.notifications
           SET payload = '{"tampered": true}'::jsonb
           WHERE id = $1;`,
          [notifId]
        )
      ).rejects.toThrow(/Only read_at may be updated/);
    });

    it("creates, reads, and marks notifications as read in fallback store", async () => {
      const testRecipient = `usr_recip_${Date.now()}`;

      // Create notification
      const notif = await createNotification({
        recipientId: testRecipient,
        actorId: "usr_client_02",
        eventType: "review_decision",
        payload: {
          summary: "Hero composition approved",
          detail: "Sign-off complete by client reviewer.",
          actionUrl: "/dashboard/projects/p1",
        },
      });

      expect(notif.id).toBeDefined();
      expect(notif.recipientId).toBe(testRecipient);
      expect(notif.readAt).toBeNull();

      // Check listing
      const list = await listNotifications(testRecipient);
      expect(list.unreadCount).toBeGreaterThanOrEqual(1);
      expect(list.notifications.some((n) => n.id === notif.id)).toBe(true);

      // Mark single read
      const markSuccess = await markNotificationRead(testRecipient, notif.id);
      expect(markSuccess).toBe(true);

      const listAfter = await listNotifications(testRecipient);
      const updated = listAfter.notifications.find((n) => n.id === notif.id);
      expect(updated?.readAt).not.toBeNull();
    });

    it("marks all notifications as read for a recipient in a single operation", async () => {
      const testRecipient = `usr_bulk_${Date.now()}`;

      await createNotification({
        recipientId: testRecipient,
        eventType: "member_joined",
        payload: {
          summary: "Colleague A joined",
          detail: "Elena joined project workspace.",
        },
      });
      await createNotification({
        recipientId: testRecipient,
        eventType: "revision_request",
        payload: {
          summary: "Revision requested on v1",
          detail: "Reviewer requested spacing adjustments.",
        },
      });

      const before = await listNotifications(testRecipient);
      expect(before.unreadCount).toBe(2);

      const count = await markAllNotificationsRead(testRecipient);
      expect(count).toBe(2);

      const after = await listNotifications(testRecipient);
      expect(after.unreadCount).toBe(0);
    });

    it("guarantees no fake email sending when provider is unconfigured", async () => {
      // Save current env
      const origResend = process.env.RESEND_API_KEY;
      const origSmtp = process.env.SMTP_HOST;

      try {
        delete process.env.RESEND_API_KEY;
        delete process.env.SMTP_HOST;

        expect(isEmailProviderConfigured()).toBe(false);

        const dispatchResult = await dispatchEmailIfConfigured({
          to: "client@example.com",
          subject: "Test Notification",
          html: "<p>Hello</p>",
        });

        // Zero false-email guarantee: returns false with reason unconfigured, does not crash or fake success
        expect(dispatchResult.sent).toBe(false);
        expect(dispatchResult.reason).toBe("unconfigured");

        // When RESEND_API_KEY is configured
        process.env.RESEND_API_KEY = "re_test_dummy_key_123";
        expect(isEmailProviderConfigured()).toBe(true);
      } finally {
        process.env.RESEND_API_KEY = origResend;
        process.env.SMTP_HOST = origSmtp;
      }
    });
  });

  // ==========================================================================
  // 3. PUBLIC CONTACT INQUIRIES & ANTI-SPAM PROTECTIONS
  // ==========================================================================
  describe("3. Contact Inquiries & Anti-Spam Security", () => {
    it("validates contact inquiry input schema with Zod", () => {
      // Valid input
      const valid = contactInquirySchema.safeParse({
        senderName: "Marcus Vance",
        senderEmail: "marcus@aeroflux.example",
        subject: "Full Brand Architecture",
        message: "We need a complete visual design identity overhaul for Q1 release.",
      });
      expect(valid.success).toBe(true);

      // Rejects invalid email
      const invalidEmail = contactInquirySchema.safeParse({
        senderName: "Marcus",
        senderEmail: "not-an-email",
        message: "Valid length message for testing purposes.",
      });
      expect(invalidEmail.success).toBe(false);

      // Rejects message shorter than 10 characters
      const shortMsg = contactInquirySchema.safeParse({
        senderName: "Marcus",
        senderEmail: "marcus@aeroflux.example",
        message: "Hi",
      });
      expect(shortMsg.success).toBe(false);
    });

    it("traps bots silently using honeypot field (website_hp)", async () => {
      const botSubmission = {
        senderName: "Spambot 3000",
        senderEmail: "bot@spammer.example",
        subject: "SEO Services",
        message: "Buy cheap crypto ranking backlinks for your website now!",
        website_hp: "https://spam-link.example", // Honeypot filled by bot
      };

      const result = await submitContactInquiry(botSubmission);

      // Returns success to confuse bot, but flagged as simulated and rejected
      expect(result.success).toBe(true);
      expect(result.simulated).toBe(true);
      expect(result.inquiryId).toBe("inq_bot_rejected");
    });

    it("rejects sub-second bot submissions using speed threshold check", async () => {
      const fastBotSubmission = {
        senderName: "Headless Crawler",
        senderEmail: "headless@crawler.example",
        subject: "Scrape Request",
        message: "Automated submission generated in 100 milliseconds.",
        renderedAt: Date.now() - 200, // Only 200ms elapsed since mount
      };

      const result = await submitContactInquiry(fastBotSubmission);

      expect(result.success).toBe(true);
      expect(result.simulated).toBe(true);
      expect(result.inquiryId).toBe("inq_speed_rejected");
    });

    it("allows public visitors to insert legitimate inquiries for studio owner via PostgreSQL", async () => {
      await expect(
        queryAs(
          "anon",
          null,
          `INSERT INTO public.contact_inquiries (portfolio_owner_id, sender_name, sender_email, subject, message)
           VALUES ($1, 'Aria Quinn', 'aria@prism.example', 'Typography System', 'Requesting quote for geometric variable font design.');`,
          [STUDIO_OWNER_ID]
        )
      ).resolves.not.toThrow();

      // Verify the studio owner can immediately see it
      const selectRes = await queryAs(
        "authenticated",
        STUDIO_OWNER_ID,
        `SELECT id, status, sender_name FROM public.contact_inquiries WHERE portfolio_owner_id = $1 AND sender_email = 'aria@prism.example';`,
        [STUDIO_OWNER_ID]
      );
      expect(selectRes.rows).toHaveLength(1);
      expect(selectRes.rows[0].status).toBe("new");
      expect(selectRes.rows[0].sender_name).toBe("Aria Quinn");
    });

    it("blocks public visitors from inserting inquiries for non-owners via RLS CHECK", async () => {
      // CLIENT_USER_ID is a client, NOT a portfolio owner
      await expect(
        queryAs(
          "anon",
          null,
          `INSERT INTO public.contact_inquiries (portfolio_owner_id, sender_name, sender_email, message)
           VALUES ($1, 'Spam User', 'spam@test.example', 'Should fail owner check.')`,
          [CLIENT_USER_ID]
        )
      ).rejects.toThrow();
    });

    it("restricts inquiry reading to the portfolio owner (privacy guarantee)", async () => {
      // 1. Studio owner can select their own inquiries
      const ownerInquiries = await queryAs(
        "authenticated",
        STUDIO_OWNER_ID,
        `SELECT * FROM public.contact_inquiries WHERE portfolio_owner_id = $1;`,
        [STUDIO_OWNER_ID]
      );
      expect(ownerInquiries.rows.length).toBeGreaterThanOrEqual(1);

      // 2. Unrelated user cannot select the studio owner's inquiries
      const unrelatedInquiries = await queryAs(
        "authenticated",
        UNRELATED_USER_ID,
        `SELECT * FROM public.contact_inquiries WHERE portfolio_owner_id = $1;`,
        [STUDIO_OWNER_ID]
      );
      expect(unrelatedInquiries.rows).toHaveLength(0);

      // 3. Anonymous visitors cannot read any contact inquiries
      await expect(
        queryAs("anon", null, `SELECT * FROM public.contact_inquiries;`)
      ).rejects.toThrow();
    });

    it("allows portfolio owner to update inquiry status (read, archived)", async () => {
      const listRes = await queryAs(
        "authenticated",
        STUDIO_OWNER_ID,
        `SELECT id FROM public.contact_inquiries WHERE portfolio_owner_id = $1 LIMIT 1;`,
        [STUDIO_OWNER_ID]
      );
      const inqId = listRes.rows[0].id;

      // Owner updates status to 'read'
      await expect(
        queryAs(
          "authenticated",
          STUDIO_OWNER_ID,
          `UPDATE public.contact_inquiries SET status = 'read' WHERE id = $1;`,
          [inqId]
        )
      ).resolves.not.toThrow();

      // Verify update persisted
      const verifyRes = await queryAs(
        "authenticated",
        STUDIO_OWNER_ID,
        `SELECT status FROM public.contact_inquiries WHERE id = $1;`,
        [inqId]
      );
      expect(verifyRes.rows[0].status).toBe("read");
    });

    it("validates inquiry status update schema", () => {
      expect(updateInquiryStatusSchema.safeParse({ status: "read" }).success).toBe(true);
      expect(updateInquiryStatusSchema.safeParse({ status: "archived" }).success).toBe(true);
      expect(updateInquiryStatusSchema.safeParse({ status: "invalid_status" }).success).toBe(false);
    });

    it("submits, lists, and updates inquiries in local service fallback", async () => {
      const submission = {
        portfolioOwnerId: "usr_owner_01",
        senderName: "Devon Reed",
        senderEmail: "devon@reed-art.example",
        subject: "Motion Identity Package",
        message: "Looking to commission futuristic kinetic title sequences.",
        renderedAt: Date.now() - 5000,
      };

      const result = await submitContactInquiry(submission);
      expect(result.success).toBe(true);
      expect(result.inquiryId).toBeDefined();

      const list = await listContactInquiries("usr_owner_01");
      const found = list.find((i) => i.id === result.inquiryId);
      expect(found).toBeDefined();
      expect(found?.senderName).toBe("Devon Reed");

      // Update status
      const updated = await updateContactInquiryStatus(
        "usr_owner_01",
        result.inquiryId,
        "read"
      );
      expect(updated).toBe(true);

      const listAfter = await listContactInquiries("usr_owner_01");
      const foundAfter = listAfter.find((i) => i.id === result.inquiryId);
      expect(foundAfter?.status).toBe("read");
    });
  });
});
