import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import fs from "fs";
import path from "path";
import {
  createAssetSchema,
  generateStoragePath,
  MAX_ASSET_FILE_SIZE,
  sanitizeFilename,
  bulkAssetActionSchema,
} from "@/lib/validation/assets";

const OWNER_A_ID = "11111111-1111-4111-8111-111111111111";
const UNRELATED_B_ID = "22222222-2222-4222-8222-222222222222";

describe("Phase 4 — Asset Library, Uploads, Tags, Collections & Storage Security", () => {
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

  describe("Upload Validation & Path Traversal Prevention", () => {
    it("sanitizes dangerous filenames and eliminates directory traversal", () => {
      expect(sanitizeFilename("../../etc/passwd")).not.toContain("..");
      expect(sanitizeFilename("../../etc/passwd")).not.toContain("/");
      expect(sanitizeFilename("..\\windows\\system32\\cmd.exe")).not.toContain("\\");
      expect(sanitizeFilename("bad\0file.png")).not.toContain("\0");
      expect(sanitizeFilename("   ")).toBeDefined();
    });

    it("generates structured, non-traversable storage paths under user namespace", () => {
      const storagePath = generateStoragePath(OWNER_A_ID, "brand-vector-grid.svg");
      expect(storagePath.startsWith(`creative-assets/${OWNER_A_ID}/`)).toBe(true);
      expect(storagePath).toContain("brand-vector-grid.svg");
      expect(storagePath).not.toContain("..");
    });

    it("validates supported asset formats and rejects executable/dangerous MIME types", () => {
      const valid = {
        name: "Orbital Vector System",
        originalFilename: "orbital-vector.svg",
        mimeType: "image/svg+xml",
        fileSize: 1024 * 500,
        category: "Brand Identity",
        visibility: "private",
      };
      expect(createAssetSchema.safeParse(valid).success).toBe(true);

      const malicious = {
        name: "Exploit File",
        originalFilename: "exploit.exe",
        mimeType: "application/x-msdownload",
        fileSize: 1024,
        category: "Brand Identity",
      };
      expect(createAssetSchema.safeParse(malicious).success).toBe(false);
    });

    it("rejects files exceeding 50 MB studio quota", () => {
      const oversized = {
        name: "Gigantic Asset",
        originalFilename: "giant.zip",
        mimeType: "application/zip",
        fileSize: MAX_ASSET_FILE_SIZE + 1024,
        category: "Marketing Collateral",
      };
      const result = createAssetSchema.safeParse(oversized);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain("50 MB");
      }
    });

    it("validates bulk asset action schemas", () => {
      const validBulk = {
        assetIds: ["11111111-1111-4111-8111-111111111111", "22222222-2222-4222-8222-222222222222"],
        action: "set_public",
      };
      expect(bulkAssetActionSchema.safeParse(validBulk).success).toBe(true);

      const emptyBulk = {
        assetIds: [],
        action: "delete",
      };
      expect(bulkAssetActionSchema.safeParse(emptyBulk).success).toBe(false);
    });
  });

  describe("Database Operations & RLS Enforcement on Assets, Tags, and Collections", () => {
    let createdAssetId: string;
    let createdTagId: string;
    let createdCollectionId: string;

    it("allows Owner A to insert an asset record into creative-assets bucket", async () => {
      const storagePath = `creative-assets/${OWNER_A_ID}/2026/10/specimen-01.png`;

      const insertRes = await queryAs<{ id: string; name: string; visibility: string }>(
        "authenticated",
        OWNER_A_ID,
        `INSERT INTO public.assets (
          owner_id, name, original_filename, storage_path, mime_type, file_size, width, height, category, visibility
        ) VALUES (
          $1, 'Neural Mesh Alpha', 'specimen-01.png', $2, 'image/png', 204800, 1920, 1080, 'UI Visual Design', 'private'
        ) RETURNING id, name, visibility`,
        [OWNER_A_ID, storagePath]
      );

      expect(insertRes.rows).toHaveLength(1);
      expect(insertRes.rows[0].name).toBe("Neural Mesh Alpha");
      expect(insertRes.rows[0].visibility).toBe("private");
      createdAssetId = insertRes.rows[0].id;
    });

    it("prevents changing owner_id or storage_path via immutable field trigger", async () => {
      await expect(
        queryAs(
          "authenticated",
          OWNER_A_ID,
          `UPDATE public.assets SET owner_id = $1 WHERE id = $2`,
          [UNRELATED_B_ID, createdAssetId]
        )
      ).rejects.toThrow(/Asset ownership cannot be transferred/);

      await expect(
        queryAs(
          "authenticated",
          OWNER_A_ID,
          `UPDATE public.assets SET storage_path = 'hijacked/path.png' WHERE id = $1`,
          [createdAssetId]
        )
      ).rejects.toThrow(/storage_path is immutable/);
    });

    it("blocks Unrelated User B from reading Owner A's private asset", async () => {
      const res = await queryAs<{ id: string }>(
        "authenticated",
        UNRELATED_B_ID,
        `SELECT id FROM public.assets WHERE id = $1`,
        [createdAssetId]
      );
      expect(res.rows).toHaveLength(0);
    });

    it("blocks Unrelated User B from updating or deleting Owner A's asset", async () => {
      const updateRes = await queryAs(
        "authenticated",
        UNRELATED_B_ID,
        `UPDATE public.assets SET name = 'Hijacked Asset' WHERE id = $1 RETURNING id`,
        [createdAssetId]
      );
      expect(updateRes.rows).toHaveLength(0);

      const deleteRes = await queryAs(
        "authenticated",
        UNRELATED_B_ID,
        `DELETE FROM public.assets WHERE id = $1 RETURNING id`,
        [createdAssetId]
      );
      expect(deleteRes.rows).toHaveLength(0);
    });

    it("allows Owner A to create tags and associate them with assets", async () => {
      // 1. Create tag
      const tagRes = await queryAs<{ id: string; name: string }>(
        "authenticated",
        OWNER_A_ID,
        `INSERT INTO public.tags (owner_id, name, slug)
         VALUES ($1, 'neural-mesh', 'neural-mesh')
         RETURNING id, name`,
        [OWNER_A_ID]
      );
      expect(tagRes.rows).toHaveLength(1);
      createdTagId = tagRes.rows[0].id;

      // 2. Link tag to asset
      const linkRes = await queryAs(
        "authenticated",
        OWNER_A_ID,
        `INSERT INTO public.asset_tags (asset_id, tag_id)
         VALUES ($1, $2)
         RETURNING asset_id, tag_id`,
        [createdAssetId, createdTagId]
      );
      expect(linkRes.rows).toHaveLength(1);

      // 3. User B cannot link Owner A's tag to their assets
      await expect(
        queryAs(
          "authenticated",
          UNRELATED_B_ID,
          `INSERT INTO public.asset_tags (asset_id, tag_id)
           VALUES ($1, $2)`,
          [createdAssetId, createdTagId]
        )
      ).rejects.toThrow();
    });

    it("allows Owner A to create collections and add assets to them", async () => {
      // 1. Create collection
      const colRes = await queryAs<{ id: string; name: string }>(
        "authenticated",
        OWNER_A_ID,
        `INSERT INTO public.collections (owner_id, name, description, visibility)
         VALUES ($1, 'Neural Studies', 'Experimental visual models', 'private')
         RETURNING id, name`,
        [OWNER_A_ID]
      );
      expect(colRes.rows).toHaveLength(1);
      createdCollectionId = colRes.rows[0].id;

      // 2. Add asset to collection
      const colAssetRes = await queryAs(
        "authenticated",
        OWNER_A_ID,
        `INSERT INTO public.collection_assets (collection_id, asset_id, position)
         VALUES ($1, $2, 0)
         RETURNING collection_id, asset_id`,
        [createdCollectionId, createdAssetId]
      );
      expect(colAssetRes.rows).toHaveLength(1);

      // 3. Remove asset from collection
      const removeRes = await queryAs(
        "authenticated",
        OWNER_A_ID,
        `DELETE FROM public.collection_assets
         WHERE collection_id = $1 AND asset_id = $2
         RETURNING collection_id`,
        [createdCollectionId, createdAssetId]
      );
      expect(removeRes.rows).toHaveLength(1);
    });

    it("enforces cross-user ownership guards on collection_assets", async () => {
      // User B creates their own collection
      const bCol = await queryAs<{ id: string }>(
        "authenticated",
        UNRELATED_B_ID,
        `INSERT INTO public.collections (owner_id, name, visibility)
         VALUES ($1, 'User B Collection', 'private')
         RETURNING id`,
        [UNRELATED_B_ID]
      );

      // User B cannot add Owner A's asset to their collection
      await expect(
        queryAs(
          "authenticated",
          UNRELATED_B_ID,
          `INSERT INTO public.collection_assets (collection_id, asset_id)
           VALUES ($1, $2)`,
          [bCol.rows[0].id, createdAssetId]
        )
      ).rejects.toThrow(/Collection and asset must belong to the same owner/);
    });

    it("allows Owner A to delete their asset and cascades relational links", async () => {
      // Re-link tag
      await queryAs(
        "authenticated",
        OWNER_A_ID,
        `INSERT INTO public.asset_tags (asset_id, tag_id)
         VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [createdAssetId, createdTagId]
      );

      // Delete asset
      const deleteRes = await queryAs<{ id: string }>(
        "authenticated",
        OWNER_A_ID,
        `DELETE FROM public.assets WHERE id = $1 RETURNING id`,
        [createdAssetId]
      );
      expect(deleteRes.rows).toHaveLength(1);

      // Verify asset_tags link was automatically cascaded
      const verifyTagLink = await queryAs(
        "authenticated",
        OWNER_A_ID,
        `SELECT * FROM public.asset_tags WHERE asset_id = $1`,
        [createdAssetId]
      );
      expect(verifyTagLink.rows).toHaveLength(0);
    });
  });
});
