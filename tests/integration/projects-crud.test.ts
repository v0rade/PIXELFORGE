import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import fs from "fs";
import path from "path";
import {
  createProjectSchema,
  updateProjectSchema,
  projectQuerySchema,
} from "@/lib/validation/projects";

const OWNER_A_ID = "11111111-1111-4111-8111-111111111111";
const UNRELATED_B_ID = "22222222-2222-4222-8222-222222222222";
const CLIENT_C_ID = "33333333-3333-4333-8333-333333333333";

describe("Phase 3 — Projects CRUD, Validation & Access Control", () => {
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

  describe("Zod Validation Schemas", () => {
    it("validates valid project creation payloads", () => {
      const valid = {
        title: "Kinetix Modular Design Kit",
        slug: "kinetix-modular-kit",
        category: "UI Visual Design",
        status: "in_progress",
        priority: "high",
        visibility: "private",
        brief: "Create dark-first UI kit with 80+ components.",
        description: "Modular design kit for telemetry applications.",
      };

      const result = createProjectSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("rejects invalid project creation payloads", () => {
      const invalid = {
        title: "", // empty title
        status: "non_existent_status",
        priority: "extreme",
      };

      const result = createProjectSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        const issues = result.error.issues;
        expect(issues.some((i) => i.path.includes("title"))).toBe(true);
        expect(issues.some((i) => i.path.includes("status"))).toBe(true);
      }
    });

    it("validates project query params and applies defaults", () => {
      const query = projectQuerySchema.parse({});
      expect(query.status).toBe("all");
      expect(query.category).toBe("all");
      expect(query.page).toBe(1);
      expect(query.limit).toBe(12);
      expect(query.sortBy).toBe("date");
      expect(query.sortOrder).toBe("desc");
    });
  });

  describe("Database Operations & RLS Enforcement", () => {
    let createdProjectId: string;

    it("allows Owner A to create a new project in their workspace", async () => {
      const insertRes = await queryAs<{ id: string; title: string; status: string }>(
        "authenticated",
        OWNER_A_ID,
        `INSERT INTO public.projects (
          owner_id, title, slug, description, brief, category, status, priority, visibility
        ) VALUES (
          $1, 'Quantum Field Identity', 'quantum-field-identity',
          'Parametric visual system for field simulations.', 'Create identity guidelines.',
          'Brand Identity', 'in_progress', 'high', 'private'
        ) RETURNING id, title, status`,
        [OWNER_A_ID]
      );

      expect(insertRes.rows).toHaveLength(1);
      expect(insertRes.rows[0].title).toBe("Quantum Field Identity");
      expect(insertRes.rows[0].status).toBe("in_progress");
      createdProjectId = insertRes.rows[0].id;
    });

    it("allows Owner A to view, filter, and search their projects", async () => {
      const listRes = await queryAs<{ id: string; title: string }>(
        "authenticated",
        OWNER_A_ID,
        `SELECT id, title FROM public.projects WHERE owner_id = $1 AND title ILIKE $2`,
        [OWNER_A_ID, "%Quantum%"]
      );

      expect(listRes.rows).toHaveLength(1);
      expect(listRes.rows[0].id).toBe(createdProjectId);
    });

    it("allows Owner A to edit project attributes and toggle status", async () => {
      const updateRes = await queryAs<{ title: string; status: string; priority: string }>(
        "authenticated",
        OWNER_A_ID,
        `UPDATE public.projects
         SET title = 'Quantum Field Visual Architecture',
             status = 'in_review',
             priority = 'urgent'
         WHERE id = $1
         RETURNING title, status, priority`,
        [createdProjectId]
      );

      expect(updateRes.rows).toHaveLength(1);
      expect(updateRes.rows[0].title).toBe("Quantum Field Visual Architecture");
      expect(updateRes.rows[0].status).toBe("in_review");
      expect(updateRes.rows[0].priority).toBe("urgent");
    });

    it("allows Owner A to archive and unarchive the project", async () => {
      // Archive
      const archiveRes = await queryAs<{ status: string; archived_at: string | null }>(
        "authenticated",
        OWNER_A_ID,
        `UPDATE public.projects
         SET status = 'archived',
             archived_at = NOW()
         WHERE id = $1
         RETURNING status, archived_at`,
        [createdProjectId]
      );

      expect(archiveRes.rows).toHaveLength(1);
      expect(archiveRes.rows[0].status).toBe("archived");
      expect(archiveRes.rows[0].archived_at).not.toBeNull();

      // Restore
      const restoreRes = await queryAs<{ status: string; archived_at: string | null }>(
        "authenticated",
        OWNER_A_ID,
        `UPDATE public.projects
         SET status = 'in_progress',
             archived_at = NULL
         WHERE id = $1
         RETURNING status, archived_at`,
        [createdProjectId]
      );

      expect(restoreRes.rows).toHaveLength(1);
      expect(restoreRes.rows[0].status).toBe("in_progress");
      expect(restoreRes.rows[0].archived_at).toBeNull();
    });

    it("prevents Unrelated User B from viewing Owner A's private project", async () => {
      const res = await queryAs<{ id: string }>(
        "authenticated",
        UNRELATED_B_ID,
        `SELECT id FROM public.projects WHERE id = $1`,
        [createdProjectId]
      );

      expect(res.rows).toHaveLength(0);
    });

    it("prevents Unrelated User B from editing or deleting Owner A's project", async () => {
      // Attempt update
      const updateRes = await queryAs(
        "authenticated",
        UNRELATED_B_ID,
        `UPDATE public.projects SET title = 'Malicious Hijack' WHERE id = $1 RETURNING id`,
        [createdProjectId]
      );
      expect(updateRes.rows).toHaveLength(0);

      // Attempt delete
      const deleteRes = await queryAs(
        "authenticated",
        UNRELATED_B_ID,
        `DELETE FROM public.projects WHERE id = $1 RETURNING id`,
        [createdProjectId]
      );
      expect(deleteRes.rows).toHaveLength(0);
    });

    it("allows Owner A to permanently delete their project", async () => {
      const deleteRes = await queryAs<{ id: string }>(
        "authenticated",
        OWNER_A_ID,
        `DELETE FROM public.projects WHERE id = $1 RETURNING id`,
        [createdProjectId]
      );

      expect(deleteRes.rows).toHaveLength(1);
      expect(deleteRes.rows[0].id).toBe(createdProjectId);

      // Verify it's gone
      const verifyRes = await queryAs(
        "authenticated",
        OWNER_A_ID,
        `SELECT id FROM public.projects WHERE id = $1`,
        [createdProjectId]
      );
      expect(verifyRes.rows).toHaveLength(0);
    });

    it("enforces database constraint on project status values", async () => {
      await expect(
        queryAs(
          "authenticated",
          OWNER_A_ID,
          `INSERT INTO public.projects (owner_id, title, slug, status, priority, visibility)
           VALUES ($1, 'Bad Status Project', 'bad-status', 'invalid_status', 'low', 'private')`,
          [OWNER_A_ID]
        )
      ).rejects.toThrow();
    });
  });
});
