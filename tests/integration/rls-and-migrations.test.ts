import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import fs from "fs";
import path from "path";

const OWNER_A_ID = "11111111-1111-4111-8111-111111111111";
const UNRELATED_B_ID = "22222222-2222-4222-8222-222222222222";
const CLIENT_C_ID = "33333333-3333-4333-8333-333333333333";

const PUBLIC_PROJECT_ID = "cccccccc-1111-4111-8111-111111111111";
const PRIVATE_PROJECT_ID = "cccccccc-2222-4222-8222-222222222222";
const PUBLIC_ASSET_ID = "bbbbbbbb-1111-4111-8111-111111111111";
const PRIVATE_ASSET_ID = "bbbbbbbb-2222-4222-8222-222222222222";
const DELIVERABLE_ID = "dddddddd-1111-4111-8111-111111111111";

describe("Phase 2 — PostgreSQL Schema Migrations & Row Level Security (RLS)", () => {
  let db: PGlite;

  /**
   * Helper to run queries under a specific Postgres role and simulated JWT claim (auth.uid()).
   */
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

  it("initializes profiles automatically via trigger when a new user registers in auth.users", async () => {
    const newUserId = "44444444-4444-4444-8444-444444444444";
    await db.query(
      `INSERT INTO auth.users (id, email, raw_user_meta_data)
       VALUES ($1, $2, $3::jsonb)`,
      [
        newUserId,
        "nova@pixelforge.studio",
        JSON.stringify({ display_name: "Nova Lin", role: "owner" }),
      ]
    );

    const res = await db.query<{
      id: string;
      display_name: string;
      role: string;
    }>(`SELECT id, display_name, role FROM public.profiles WHERE id = $1`, [
      newUserId,
    ]);

    expect(res.rows).toHaveLength(1);
    expect(res.rows[0].display_name).toBe("Nova Lin");
    expect(res.rows[0].role).toBe("owner");
  });

  it("allows anonymous visitors to read ONLY published public projects and public assets", async () => {
    const projectsRes = await queryAs<{ id: string; visibility: string }>(
      "anon",
      null,
      `SELECT id, visibility FROM public.projects`
    );

    expect(projectsRes.rows).toHaveLength(1);
    expect(projectsRes.rows[0].id).toBe(PUBLIC_PROJECT_ID);
    expect(projectsRes.rows[0].visibility).toBe("public");

    const assetsRes = await queryAs<{ id: string; visibility: string }>(
      "anon",
      null,
      `SELECT id, visibility FROM public.assets`
    );

    expect(assetsRes.rows).toHaveLength(1);
    expect(assetsRes.rows[0].id).toBe(PUBLIC_ASSET_ID);
  });

  it("blocks anonymous visitors from reading private client records, invitations, or contact inquiries", async () => {
    // Contact inquiries can be inserted by anon, but never read by anon
    await queryAs(
      "anon",
      null,
      `INSERT INTO public.contact_inquiries (portfolio_owner_id, sender_name, sender_email, subject, message)
       VALUES ($1, 'Visitor', 'visitor@example.com', 'Brand System', 'Interested in Q4 brand system work.')`,
      [OWNER_A_ID]
    );

    await expect(
      queryAs("anon", null, `SELECT * FROM public.contact_inquiries`)
    ).rejects.toThrow();

    await expect(
      queryAs("anon", null, `SELECT * FROM public.clients`)
    ).rejects.toThrow();

    await expect(
      queryAs("anon", null, `SELECT * FROM public.project_invitations`)
    ).rejects.toThrow();
  });

  it("prevents Unrelated User B from reading or mutating Owner A's private projects, assets, or clients", async () => {
    const privateProjRes = await queryAs<{ id: string }>(
      "authenticated",
      UNRELATED_B_ID,
      `SELECT id FROM public.projects WHERE id = $1`,
      [PRIVATE_PROJECT_ID]
    );
    expect(privateProjRes.rows).toHaveLength(0);

    const privateAssetRes = await queryAs<{ id: string }>(
      "authenticated",
      UNRELATED_B_ID,
      `SELECT id FROM public.assets WHERE id = $1`,
      [PRIVATE_ASSET_ID]
    );
    expect(privateAssetRes.rows).toHaveLength(0);

    const clientsRes = await queryAs<{ id: string }>(
      "authenticated",
      UNRELATED_B_ID,
      `SELECT id FROM public.clients`
    );
    expect(clientsRes.rows).toHaveLength(0);

    // Attempt unauthorized UPDATE on Owner A's public project
    const updateRes = await queryAs(
      "authenticated",
      UNRELATED_B_ID,
      `UPDATE public.projects SET title = 'Hijacked Title' WHERE id = $1 RETURNING id`,
      [PUBLIC_PROJECT_ID]
    );
    expect(updateRes.rows).toHaveLength(0);

    // Attempt spoofing owner_id on INSERT
    await expect(
      queryAs(
        "authenticated",
        UNRELATED_B_ID,
        `INSERT INTO public.projects (owner_id, title, slug, status, priority, visibility)
         VALUES ($1, 'Spoofed Owner Project', 'spoofed-owner', 'draft', 'low', 'private')`,
        [OWNER_A_ID]
      )
    ).rejects.toThrow();
  });

  it("allows Invited Client C to read their authorized private project and submit revision comments/approvals", async () => {
    // Client C can read the private project they were invited & accepted to
    const clientProjRes = await queryAs<{ id: string; title: string }>(
      "authenticated",
      CLIENT_C_ID,
      `SELECT id, title FROM public.projects WHERE id = $1`,
      [PRIVATE_PROJECT_ID]
    );
    expect(clientProjRes.rows).toHaveLength(1);
    expect(clientProjRes.rows[0].id).toBe(PRIVATE_PROJECT_ID);

    // Client C can read the private asset attached to their project
    const clientAssetRes = await queryAs<{ id: string }>(
      "authenticated",
      CLIENT_C_ID,
      `SELECT id FROM public.assets WHERE id = $1`,
      [PRIVATE_ASSET_ID]
    );
    expect(clientAssetRes.rows).toHaveLength(1);

    // Client C can add a revision comment on the deliverable
    const commentRes = await queryAs<{ id: string }>(
      "authenticated",
      CLIENT_C_ID,
      `INSERT INTO public.revision_comments (deliverable_version_id, author_id, body, comment_type)
       VALUES ($1, $2, 'Please adjust crease tolerance by +1.5mm.', 'revision_request')
       RETURNING id`,
      [DELIVERABLE_ID, CLIENT_C_ID]
    );
    expect(commentRes.rows).toHaveLength(1);

    // Client C can transition submitted deliverable to changes_requested
    const reviewRes = await queryAs<{ review_status: string }>(
      "authenticated",
      CLIENT_C_ID,
      `UPDATE public.deliverable_versions
       SET review_status = 'changes_requested'
       WHERE id = $1
       RETURNING review_status`,
      [DELIVERABLE_ID]
    );
    expect(reviewRes.rows).toHaveLength(1);
    expect(reviewRes.rows[0].review_status).toBe("changes_requested");
  });

  it("blocks Invited Client C from reading private client notes, mutating project ownership, or escalating role", async () => {
    // Client C cannot read Owner A's private clients table (which contains private notes)
    const clientNotesRes = await queryAs(
      "authenticated",
      CLIENT_C_ID,
      `SELECT id, notes FROM public.clients`
    );
    expect(clientNotesRes.rows).toHaveLength(0);

    // Client C cannot update the project title or visibility
    const projectUpdateRes = await queryAs(
      "authenticated",
      CLIENT_C_ID,
      `UPDATE public.projects SET visibility = 'public' WHERE id = $1 RETURNING id`,
      [PRIVATE_PROJECT_ID]
    );
    expect(projectUpdateRes.rows).toHaveLength(0);

    // Client C cannot escalate their own role in profiles from 'client' to 'owner'
    await expect(
      queryAs(
        "authenticated",
        CLIENT_C_ID,
        `UPDATE public.profiles SET role = 'owner' WHERE id = $1`,
        [CLIENT_C_ID]
      )
    ).rejects.toThrow(/Users cannot change their authorization role/);
  });

  it("allows Owner A full access to their own projects, assets, clients, and contact inquiries", async () => {
    const ownerProjects = await queryAs(
      "authenticated",
      OWNER_A_ID,
      `SELECT id FROM public.projects WHERE owner_id = $1`,
      [OWNER_A_ID]
    );
    expect(ownerProjects.rows).toHaveLength(2);

    const ownerInquiries = await queryAs(
      "authenticated",
      OWNER_A_ID,
      `SELECT id, sender_email FROM public.contact_inquiries WHERE portfolio_owner_id = $1`,
      [OWNER_A_ID]
    );
    expect(ownerInquiries.rows.length).toBeGreaterThanOrEqual(1);
  });
});
