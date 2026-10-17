import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import type {
  AssetCategory,
  AssetCollection,
  AssetFormat,
  CreativeAsset,
  Visibility,
} from "@/types";
import type { Database } from "@/types/database";
import {
  DEMO_ASSETS,
  DEMO_COLLECTIONS,
} from "@/lib/demo/data";
import {
  ALLOWED_MIME_TYPES,
  type AssetQueryInput,
  type BulkAssetActionInput,
  type CreateAssetInput,
  type CreateCollectionInput,
  generateStoragePath,
  type UpdateAssetInput,
  type UpdateCollectionInput,
} from "@/lib/validation/assets";
import { slugify } from "@/lib/utils/format";

// --- In-Memory Fallback Store for Local Development ---
let localAssetsStore: CreativeAsset[] = [...DEMO_ASSETS];
let localCollectionsStore: AssetCollection[] = [...DEMO_COLLECTIONS];

export interface TagItem {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  createdAt: string;
}

let localTagsStore: TagItem[] = [
  { id: "tag_01", ownerId: "usr_owner_01", name: "vector", slug: "vector", createdAt: new Date().toISOString() },
  { id: "tag_02", ownerId: "usr_owner_01", name: "grid", slug: "grid", createdAt: new Date().toISOString() },
  { id: "tag_03", ownerId: "usr_owner_01", name: "dark-ui", slug: "dark-ui", createdAt: new Date().toISOString() },
  { id: "tag_04", ownerId: "usr_owner_01", name: "typography", slug: "typography", createdAt: new Date().toISOString() },
  { id: "tag_05", ownerId: "usr_owner_01", name: "brand", slug: "brand", createdAt: new Date().toISOString() },
  { id: "tag_06", ownerId: "usr_owner_01", name: "poster", slug: "poster", createdAt: new Date().toISOString() },
  { id: "tag_07", ownerId: "usr_owner_01", name: "packaging", slug: "packaging", createdAt: new Date().toISOString() },
];

export interface AssetsListResult {
  assets: CreativeAsset[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Maps a Supabase row to our standardized CreativeAsset interface
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSupabaseAssetRow(row: any): CreativeAsset {
  const mime = row.mime_type || "image/png";
  const format: AssetFormat = ALLOWED_MIME_TYPES[mime] || "PNG";

  // Extract tags from joined asset_tags if available
  const tags: string[] = Array.isArray(row.asset_tags)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? row.asset_tags.map((at: any) => at.tags?.name || at.tag_id).filter(Boolean)
    : [];

  // Extract linked project IDs
  const linkedProjectIds: string[] = Array.isArray(row.project_assets)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? row.project_assets.map((pa: any) => pa.project_id).filter(Boolean)
    : [];

  // Extract collection IDs
  const collectionIds: string[] = Array.isArray(row.collection_assets)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? row.collection_assets.map((ca: any) => ca.collection_id).filter(Boolean)
    : [];

  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    description: row.description || "",
    originalFilename: row.original_filename,
    storagePath: row.storage_path,
    previewUrl: row.visibility === "public"
      ? `/placeholders/asset-brand-system.svg` // In local/preview
      : `/placeholders/asset-brand-system.svg`,
    mimeType: row.mime_type,
    format,
    fileSize: Number(row.file_size),
    width: row.width,
    height: row.height,
    category: (row.category as AssetCategory) || "Brand Identity",
    tags,
    visibility: row.visibility as Visibility,
    downloadable: Boolean(row.visibility === "public"),
    linkedProjectIds,
    collectionIds,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================================================
// ASSETS CRUD & QUERIES
// ============================================================================

export async function listAssets(
  userId: string,
  query: AssetQueryInput
): Promise<AssetsListResult> {
  const { isConfigured } = getSupabasePublicConfig();

  if (isConfigured) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      let req = supabase
        .from("assets")
        .select(
          `*,
           asset_tags(tag_id, tags(id, name)),
           project_assets(project_id),
           collection_assets(collection_id)`,
          { count: "exact" }
        )
        .is("deleted_at", null);

      if (query.category !== "all") {
        req = req.eq("category", query.category);
      }

      if (query.visibility !== "all") {
        req = req.eq("visibility", query.visibility as "private" | "public");
      }

      if (query.search) {
        req = req.or(`name.ilike.%${query.search}%,original_filename.ilike.%${query.search}%`);
      }

      // Sort
      const ascending = query.sortOrder === "asc";
      switch (query.sortBy) {
        case "title":
          req = req.order("name", { ascending });
          break;
        case "size":
          req = req.order("file_size", { ascending });
          break;
        case "date":
        default:
          req = req.order("created_at", { ascending });
          break;
      }

      // Pagination
      const from = (query.page - 1) * query.limit;
      const to = from + query.limit - 1;
      req = req.range(from, to);

      const { data, count, error } = await req;
      if (error) {
        throw new Error(`Failed to query assets: ${error.message}`);
      }

      let assets = (data ?? []).map((row) => mapSupabaseAssetRow(row));

      // In-memory filter for format / tag / project / collection if requested
      if (query.format !== "all") {
        assets = assets.filter((a) => a.format === query.format);
      }
      if (query.tag !== "all") {
        assets = assets.filter((a) => a.tags.includes(query.tag.toLowerCase()));
      }
      if (query.projectId !== "all") {
        assets = assets.filter((a) => a.linkedProjectIds.includes(query.projectId));
      }
      if (query.collectionId !== "all") {
        assets = assets.filter((a) => a.collectionIds.includes(query.collectionId));
      }

      const total = count ?? assets.length;
      return {
        assets,
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
      };
    }
  }

  // --- Local Fallback Mode ---
  const items = localAssetsStore.filter((a) => {
    const isOwner = a.ownerId === userId || a.ownerId === "usr_owner_01";
    if (!isOwner && a.visibility !== "public") return false;

    if (query.category !== "all" && a.category !== query.category) return false;
    if (query.format !== "all" && a.format !== query.format) return false;
    if (query.visibility !== "all" && a.visibility !== query.visibility) return false;
    if (query.tag !== "all" && !a.tags.includes(query.tag.toLowerCase())) return false;
    if (query.projectId !== "all" && !a.linkedProjectIds.includes(query.projectId)) return false;
    if (query.collectionId !== "all" && !a.collectionIds.includes(query.collectionId)) return false;

    if (query.search) {
      const q = query.search.toLowerCase();
      const matchesName = a.name.toLowerCase().includes(q);
      const matchesFile = a.originalFilename.toLowerCase().includes(q);
      const matchesTag = a.tags.some((t) => t.toLowerCase().includes(q));
      if (!matchesName && !matchesFile && !matchesTag) return false;
    }
    return true;
  });

  // Sort
  items.sort((a, b) => {
    const asc = query.sortOrder === "asc" ? 1 : -1;
    if (query.sortBy === "title") {
      return a.name.localeCompare(b.name) * asc;
    }
    if (query.sortBy === "size") {
      return (a.fileSize - b.fileSize) * asc;
    }
    return (
      (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) *
      (query.sortOrder === "asc" ? -1 : 1)
    );
  });

  const total = items.length;
  const from = (query.page - 1) * query.limit;
  const paginated = items.slice(from, from + query.limit);

  return {
    assets: paginated,
    total,
    page: query.page,
    limit: query.limit,
    totalPages: Math.max(1, Math.ceil(total / query.limit)),
  };
}

export async function getAssetById(
  userId: string,
  assetId: string
): Promise<CreativeAsset | null> {
  const { isConfigured } = getSupabasePublicConfig();

  if (isConfigured) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase
        .from("assets")
        .select(
          `*,
           asset_tags(tag_id, tags(id, name)),
           project_assets(project_id),
           collection_assets(collection_id)`
        )
        .eq("id", assetId)
        .is("deleted_at", null)
        .maybeSingle();

      if (error || !data) return null;
      return mapSupabaseAssetRow(data);
    }
  }

  const asset = localAssetsStore.find((a) => a.id === assetId);
  if (!asset) return null;

  const isOwner = asset.ownerId === userId || asset.ownerId === "usr_owner_01";
  if (!isOwner && asset.visibility !== "public") {
    return null;
  }

  return asset;
}

export async function createAsset(
  userId: string,
  input: CreateAssetInput,
  fileBuffer?: Buffer
): Promise<CreativeAsset> {
  const storagePath = generateStoragePath(userId, input.originalFilename);
  const now = new Date().toISOString();
  const format: AssetFormat = ALLOWED_MIME_TYPES[input.mimeType] || "PNG";

  const { isConfigured } = getSupabasePublicConfig();

  if (isConfigured) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      // 1. Upload to storage bucket if buffer provided
      if (fileBuffer) {
        const { error: storageError } = await supabase.storage
          .from("creative-assets")
          .upload(storagePath, fileBuffer, {
            contentType: input.mimeType,
            upsert: false,
          });

        if (storageError) {
          throw new Error(`Storage upload failed: ${storageError.message}`);
        }
      }

      // 2. Insert asset record
      const { data, error } = await supabase
        .from("assets")
        .insert({
          owner_id: userId,
          name: input.name,
          description: input.description || null,
          original_filename: input.originalFilename,
          storage_path: storagePath,
          mime_type: input.mimeType,
          file_size: input.fileSize,
          width: input.width ?? 1920,
          height: input.height ?? 1080,
          category: input.category,
          visibility: input.visibility,
        })
        .select()
        .single();

      if (error) {
        // Rollback storage if database insert fails
        if (fileBuffer) {
          await supabase.storage.from("creative-assets").remove([storagePath]);
        }
        throw new Error(`Failed to create asset record: ${error.message}`);
      }

      // 3. Link tags if provided
      if (input.tags && input.tags.length > 0) {
        for (const tagName of input.tags) {
          const slug = slugify(tagName);
          // Find or create tag
          let tagId: string | null = null;
          const { data: tagRow } = await supabase
            .from("tags")
            .select("id")
            .eq("owner_id", userId)
            .eq("slug", slug)
            .maybeSingle();

          if (tagRow) {
            tagId = tagRow.id;
          } else {
            const { data: newTag } = await supabase
              .from("tags")
              .insert({ owner_id: userId, name: tagName, slug })
              .select("id")
              .single();
            if (newTag) tagId = newTag.id;
          }

          if (tagId) {
            await supabase.from("asset_tags").insert({
              asset_id: data.id,
              tag_id: tagId,
            });
          }
        }
      }

      // 4. Link projects if provided
      if (input.linkedProjectIds && input.linkedProjectIds.length > 0) {
        for (const pid of input.linkedProjectIds) {
          await supabase.from("project_assets").insert({
            project_id: pid,
            asset_id: data.id,
          });
        }
      }

      // 5. Link collections if provided
      if (input.collectionIds && input.collectionIds.length > 0) {
        for (const cid of input.collectionIds) {
          await supabase.from("collection_assets").insert({
            collection_id: cid,
            asset_id: data.id,
          });
        }
      }

      return mapSupabaseAssetRow({
        ...data,
        asset_tags: input.tags.map((t) => ({ tags: { name: t } })),
        project_assets: input.linkedProjectIds.map((pid) => ({ project_id: pid })),
        collection_assets: input.collectionIds.map((cid) => ({ collection_id: cid })),
      });
    }
  }

  // Local fallback
  const newAsset: CreativeAsset = {
    id: `ast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    ownerId: userId,
    name: input.name,
    description: input.description || "",
    originalFilename: input.originalFilename,
    storagePath,
    previewUrl: "/placeholders/asset-brand-system.svg",
    mimeType: input.mimeType,
    format,
    fileSize: input.fileSize,
    width: input.width ?? 1920,
    height: input.height ?? 1080,
    category: input.category,
    tags: input.tags,
    visibility: input.visibility,
    downloadable: Boolean(input.visibility === "public"),
    linkedProjectIds: input.linkedProjectIds || [],
    collectionIds: input.collectionIds || [],
    createdAt: now,
    updatedAt: now,
  };

  localAssetsStore = [newAsset, ...localAssetsStore];

  // Update collections store if collections were specified
  if (input.collectionIds && input.collectionIds.length > 0) {
    for (const cid of input.collectionIds) {
      const col = localCollectionsStore.find((c) => c.id === cid);
      if (col && !col.assetIds.includes(newAsset.id)) {
        col.assetIds.push(newAsset.id);
      }
    }
  }

  return newAsset;
}

export async function updateAsset(
  userId: string,
  assetId: string,
  input: UpdateAssetInput
): Promise<CreativeAsset> {
  const { isConfigured } = getSupabasePublicConfig();
  const now = new Date().toISOString();

  if (isConfigured) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const updateData: Database["public"]["Tables"]["assets"]["Update"] = {
        updated_at: now,
      };

      if (input.name !== undefined) updateData.name = input.name;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.category !== undefined) updateData.category = input.category;
      if (input.visibility !== undefined) updateData.visibility = input.visibility;

      const { data, error } = await supabase
        .from("assets")
        .update(updateData)
        .eq("id", assetId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update asset: ${error.message}`);
      }

      // Update tags if provided
      if (input.tags !== undefined) {
        // Clear existing
        await supabase.from("asset_tags").delete().eq("asset_id", assetId);

        for (const tagName of input.tags) {
          const slug = slugify(tagName);
          let tagId: string | null = null;
          const { data: tagRow } = await supabase
            .from("tags")
            .select("id")
            .eq("owner_id", userId)
            .eq("slug", slug)
            .maybeSingle();

          if (tagRow) {
            tagId = tagRow.id;
          } else {
            const { data: newTag } = await supabase
              .from("tags")
              .insert({ owner_id: userId, name: tagName, slug })
              .select("id")
              .single();
            if (newTag) tagId = newTag.id;
          }

          if (tagId) {
            await supabase.from("asset_tags").insert({
              asset_id: assetId,
              tag_id: tagId,
            });
          }
        }
      }

      return mapSupabaseAssetRow({
        ...data,
        asset_tags: (input.tags || []).map((t) => ({ tags: { name: t } })),
      });
    }
  }

  // Local fallback
  const index = localAssetsStore.findIndex((a) => a.id === assetId);
  if (index === -1) throw new Error("Asset not found.");

  const existing = localAssetsStore[index];
  if (existing.ownerId !== userId && existing.ownerId !== "usr_owner_01") {
    throw new Error("Unauthorized: you do not own this asset.");
  }

  const updated: CreativeAsset = {
    ...existing,
    ...(input.name !== undefined && { name: input.name }),
    ...(input.description !== undefined && { description: input.description }),
    ...(input.category !== undefined && { category: input.category }),
    ...(input.visibility !== undefined && {
      visibility: input.visibility,
      downloadable: input.visibility === "public",
    }),
    ...(input.tags !== undefined && { tags: input.tags }),
    ...(input.linkedProjectIds !== undefined && { linkedProjectIds: input.linkedProjectIds }),
    ...(input.collectionIds !== undefined && { collectionIds: input.collectionIds }),
    updatedAt: now,
  };

  localAssetsStore[index] = updated;
  return updated;
}

export async function deleteAsset(
  userId: string,
  assetId: string
): Promise<boolean> {
  const { isConfigured } = getSupabasePublicConfig();

  if (isConfigured) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      // Fetch storage path first
      const { data: asset } = await supabase
        .from("assets")
        .select("storage_path, owner_id")
        .eq("id", assetId)
        .maybeSingle();

      if (!asset) return false;
      if (asset.owner_id !== userId) {
        throw new Error("Unauthorized: cannot delete an asset you do not own.");
      }

      // Delete storage object
      await supabase.storage
        .from("creative-assets")
        .remove([asset.storage_path]);

      // Delete db row
      const { error } = await supabase
        .from("assets")
        .delete()
        .eq("id", assetId);

      if (error) {
        throw new Error(`Failed to delete asset: ${error.message}`);
      }

      return true;
    }
  }

  // Local fallback
  const index = localAssetsStore.findIndex((a) => a.id === assetId);
  if (index === -1) return false;

  const existing = localAssetsStore[index];
  if (existing.ownerId !== userId && existing.ownerId !== "usr_owner_01") {
    throw new Error("Unauthorized: you do not own this asset.");
  }

  localAssetsStore = localAssetsStore.filter((a) => a.id !== assetId);

  // Remove from any collections
  for (const col of localCollectionsStore) {
    col.assetIds = col.assetIds.filter((id) => id !== assetId);
  }

  return true;
}

export async function bulkAssetAction(
  userId: string,
  input: BulkAssetActionInput
): Promise<{ affected: number }> {
  const { assetIds, action, targetId, tag } = input;
  let affected = 0;

  for (const id of assetIds) {
    try {
      if (action === "set_public") {
        await updateAsset(userId, id, { visibility: "public" });
        affected++;
      } else if (action === "set_private") {
        await updateAsset(userId, id, { visibility: "private" });
        affected++;
      } else if (action === "delete") {
        const deleted = await deleteAsset(userId, id);
        if (deleted) affected++;
      } else if (action === "add_to_collection" && targetId) {
        await addAssetToCollection(userId, targetId, id);
        affected++;
      } else if (action === "remove_from_collection" && targetId) {
        await removeAssetFromCollection(userId, targetId, id);
        affected++;
      } else if (action === "add_tag" && tag) {
        const asset = await getAssetById(userId, id);
        if (asset && !asset.tags.includes(tag.toLowerCase())) {
          await updateAsset(userId, id, { tags: [...asset.tags, tag.toLowerCase()] });
          affected++;
        }
      }
    } catch {
      // Ignore individual failures to continue bulk batch
    }
  }

  return { affected };
}

export async function generateSignedUrl(
  userId: string,
  assetId: string,
  expiresInSeconds = 900 // 15 minutes default
): Promise<{ signedUrl: string; expiresIn: number }> {
  const asset = await getAssetById(userId, assetId);
  if (!asset) {
    throw new Error("Asset not found or access denied.");
  }

  const { isConfigured } = getSupabasePublicConfig();

  if (isConfigured) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.storage
        .from("creative-assets")
        .createSignedUrl(asset.storagePath, expiresInSeconds);

      if (error || !data) {
        throw new Error(`Failed to generate signed URL: ${error?.message || "Storage error"}`);
      }

      return {
        signedUrl: data.signedUrl,
        expiresIn: expiresInSeconds,
      };
    }
  }

  // Local fallback signed URL simulator
  return {
    signedUrl: `/placeholders/asset-brand-system.svg?token=${Math.random().toString(36).slice(2)}&expires=${Date.now() + expiresInSeconds * 1000}`,
    expiresIn: expiresInSeconds,
  };
}

// ============================================================================
// TAGS MANAGEMENT
// ============================================================================

export async function listTags(userId: string): Promise<TagItem[]> {
  const { isConfigured } = getSupabasePublicConfig();

  if (isConfigured) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase
        .from("tags")
        .select("*")
        .order("name", { ascending: true });

      if (error) {
        throw new Error(`Failed to list tags: ${error.message}`);
      }

      return (data || []).map((t) => ({
        id: t.id,
        ownerId: t.owner_id,
        name: t.name,
        slug: t.slug,
        createdAt: t.created_at,
      }));
    }
  }

  return localTagsStore.filter(
    (t) => t.ownerId === userId || t.ownerId === "usr_owner_01"
  );
}

export async function createTag(userId: string, name: string): Promise<TagItem> {
  const cleanName = name.trim().toLowerCase();
  const slug = slugify(cleanName);

  const { isConfigured } = getSupabasePublicConfig();

  if (isConfigured) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase
        .from("tags")
        .insert({
          owner_id: userId,
          name: cleanName,
          slug,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create tag: ${error.message}`);
      }

      return {
        id: data.id,
        ownerId: data.owner_id,
        name: data.name,
        slug: data.slug,
        createdAt: data.created_at,
      };
    }
  }

  const existing = localTagsStore.find(
    (t) => t.ownerId === userId && t.slug === slug
  );
  if (existing) return existing;

  const newTag: TagItem = {
    id: `tag_${Date.now()}`,
    ownerId: userId,
    name: cleanName,
    slug,
    createdAt: new Date().toISOString(),
  };

  localTagsStore = [...localTagsStore, newTag];
  return newTag;
}

export async function deleteTag(userId: string, tagId: string): Promise<boolean> {
  const { isConfigured } = getSupabasePublicConfig();

  if (isConfigured) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase
        .from("tags")
        .delete()
        .eq("id", tagId);

      if (error) {
        throw new Error(`Failed to delete tag: ${error.message}`);
      }
      return true;
    }
  }

  localTagsStore = localTagsStore.filter((t) => t.id !== tagId);
  return true;
}

// ============================================================================
// COLLECTIONS MANAGEMENT
// ============================================================================

export async function listCollections(userId: string): Promise<AssetCollection[]> {
  const { isConfigured } = getSupabasePublicConfig();

  if (isConfigured) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase
        .from("collections")
        .select("*, collection_assets(asset_id)")
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(`Failed to list collections: ${error.message}`);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data || []).map((c: any) => ({
        id: c.id,
        ownerId: c.owner_id,
        name: c.name,
        slug: slugify(c.name),
        description: c.description || "",
        category: "Brand Identity",
        visibility: c.visibility as Visibility,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        assetIds: Array.isArray(c.collection_assets) ? c.collection_assets.map((ca: any) => ca.asset_id) : [],
        coverUrl: "/placeholders/asset-brand-system.svg",
        updatedAt: c.updated_at,
      }));
    }
  }

  return localCollectionsStore.filter(
    (c) => c.ownerId === userId || c.ownerId === "usr_owner_01"
  );
}

export async function getCollectionById(
  userId: string,
  collectionId: string
): Promise<AssetCollection | null> {
  const { isConfigured } = getSupabasePublicConfig();

  if (isConfigured) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase
        .from("collections")
        .select("*, collection_assets(asset_id)")
        .eq("id", collectionId)
        .maybeSingle();

      if (error || !data) return null;

      return {
        id: data.id,
        ownerId: data.owner_id,
        name: data.name,
        slug: slugify(data.name),
        description: data.description || "",
        category: "Brand Identity",
        visibility: data.visibility as Visibility,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        assetIds: Array.isArray(data.collection_assets) ? data.collection_assets.map((ca: any) => ca.asset_id) : [],
        coverUrl: "/placeholders/asset-brand-system.svg",
        updatedAt: data.updated_at,
      };
    }
  }

  return localCollectionsStore.find((c) => c.id === collectionId) || null;
}

export async function createCollection(
  userId: string,
  input: CreateCollectionInput
): Promise<AssetCollection> {
  const now = new Date().toISOString();
  const slug = slugify(input.name);

  const { isConfigured } = getSupabasePublicConfig();

  if (isConfigured) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase
        .from("collections")
        .insert({
          owner_id: userId,
          name: input.name,
          description: input.description || null,
          visibility: input.visibility,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create collection: ${error.message}`);
      }

      return {
        id: data.id,
        ownerId: data.owner_id,
        name: data.name,
        slug,
        description: data.description || "",
        category: input.category,
        visibility: data.visibility as Visibility,
        assetIds: [],
        coverUrl: input.coverUrl || "/placeholders/asset-brand-system.svg",
        updatedAt: data.updated_at,
      };
    }
  }

  const newCol: AssetCollection = {
    id: `col_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    ownerId: userId,
    name: input.name,
    slug,
    description: input.description || "",
    category: input.category,
    visibility: input.visibility,
    assetIds: [],
    coverUrl: input.coverUrl || "/placeholders/asset-brand-system.svg",
    updatedAt: now,
  };

  localCollectionsStore = [newCol, ...localCollectionsStore];
  return newCol;
}

export async function updateCollection(
  userId: string,
  collectionId: string,
  input: UpdateCollectionInput
): Promise<AssetCollection> {
  const now = new Date().toISOString();
  const { isConfigured } = getSupabasePublicConfig();

  if (isConfigured) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const updateData: Database["public"]["Tables"]["collections"]["Update"] = {
        updated_at: now,
      };

      if (input.name !== undefined) updateData.name = input.name;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.visibility !== undefined) updateData.visibility = input.visibility;

      const { data, error } = await supabase
        .from("collections")
        .update(updateData)
        .eq("id", collectionId)
        .select("*, collection_assets(asset_id)")
        .single();

      if (error) {
        throw new Error(`Failed to update collection: ${error.message}`);
      }

      return {
        id: data.id,
        ownerId: data.owner_id,
        name: data.name,
        slug: slugify(data.name),
        description: data.description || "",
        category: input.category || "Brand Identity",
        visibility: data.visibility as Visibility,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        assetIds: Array.isArray(data.collection_assets) ? data.collection_assets.map((ca: any) => ca.asset_id) : [],
        coverUrl: input.coverUrl || "/placeholders/asset-brand-system.svg",
        updatedAt: data.updated_at,
      };
    }
  }

  const index = localCollectionsStore.findIndex((c) => c.id === collectionId);
  if (index === -1) throw new Error("Collection not found.");

  const existing = localCollectionsStore[index];
  if (existing.ownerId !== userId && existing.ownerId !== "usr_owner_01") {
    throw new Error("Unauthorized: you do not own this collection.");
  }

  const updated: AssetCollection = {
    ...existing,
    ...(input.name !== undefined && { name: input.name, slug: slugify(input.name) }),
    ...(input.description !== undefined && { description: input.description }),
    ...(input.category !== undefined && { category: input.category }),
    ...(input.visibility !== undefined && { visibility: input.visibility }),
    ...(input.coverUrl !== undefined && { coverUrl: input.coverUrl }),
    updatedAt: now,
  };

  localCollectionsStore[index] = updated;
  return updated;
}

export async function deleteCollection(
  userId: string,
  collectionId: string
): Promise<boolean> {
  const { isConfigured } = getSupabasePublicConfig();

  if (isConfigured) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase
        .from("collections")
        .delete()
        .eq("id", collectionId);

      if (error) {
        throw new Error(`Failed to delete collection: ${error.message}`);
      }
      return true;
    }
  }

  const index = localCollectionsStore.findIndex((c) => c.id === collectionId);
  if (index === -1) return false;

  const existing = localCollectionsStore[index];
  if (existing.ownerId !== userId && existing.ownerId !== "usr_owner_01") {
    throw new Error("Unauthorized: you do not own this collection.");
  }

  localCollectionsStore = localCollectionsStore.filter((c) => c.id !== collectionId);
  return true;
}

export async function addAssetToCollection(
  userId: string,
  collectionId: string,
  assetId: string
): Promise<boolean> {
  const { isConfigured } = getSupabasePublicConfig();

  if (isConfigured) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase
        .from("collection_assets")
        .insert({
          collection_id: collectionId,
          asset_id: assetId,
        });

      if (error && !error.message.includes("duplicate")) {
        throw new Error(`Failed to add asset to collection: ${error.message}`);
      }
      return true;
    }
  }

  const col = localCollectionsStore.find((c) => c.id === collectionId);
  if (!col) throw new Error("Collection not found.");
  if (!col.assetIds.includes(assetId)) {
    col.assetIds.push(assetId);
  }

  const asset = localAssetsStore.find((a) => a.id === assetId);
  if (asset && !asset.collectionIds.includes(collectionId)) {
    asset.collectionIds.push(collectionId);
  }

  return true;
}

export async function removeAssetFromCollection(
  userId: string,
  collectionId: string,
  assetId: string
): Promise<boolean> {
  const { isConfigured } = getSupabasePublicConfig();

  if (isConfigured) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase
        .from("collection_assets")
        .delete()
        .eq("collection_id", collectionId)
        .eq("asset_id", assetId);

      if (error) {
        throw new Error(`Failed to remove asset from collection: ${error.message}`);
      }
      return true;
    }
  }

  const col = localCollectionsStore.find((c) => c.id === collectionId);
  if (col) {
    col.assetIds = col.assetIds.filter((id) => id !== assetId);
  }

  const asset = localAssetsStore.find((a) => a.id === assetId);
  if (asset) {
    asset.collectionIds = asset.collectionIds.filter((cid) => cid !== collectionId);
  }

  return true;
}
