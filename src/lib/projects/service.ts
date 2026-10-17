import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import type { Project, ProjectStatus } from "@/types";
import type { Database } from "@/types/database";
import {
  DEMO_ASSETS,
  DEMO_CLIENTS,
  DEMO_PROJECTS,
} from "@/lib/demo/data";
import type {
  CreateProjectInput,
  ProjectQueryInput,
  UpdateProjectInput,
} from "@/lib/validation/projects";
import { slugify } from "@/lib/utils/format";

// Global fallback in-memory store for local dev when external Supabase is not configured.
// Initialized from DEMO_PROJECTS.
let localProjectsStore: Project[] = [...DEMO_PROJECTS];

export interface ProjectsListResult {
  projects: Project[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DashboardSummaryData {
  metrics: {
    totalProjects: number;
    publishedProjects: number;
    inReviewProjects: number;
    inProgressProjects: number;
    completedProjects: number;
    draftProjects: number;
    archivedProjects: number;
    totalAssets: number;
    totalStorageBytes: number;
    activeClients: number;
    pendingRevisions: number;
  };
  recentProjects: Project[];
  statusCounts: {
    completed: number;
    in_review: number;
    in_progress: number;
    draft: number;
  };
}

/**
 * Maps a Supabase row to our standardized Project interface
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSupabaseProjectRow(row: any, clientsMap?: Map<string, string>): Project {
  const clientName =
    row.clients?.name ??
    (row.client_id && clientsMap ? clientsMap.get(row.client_id) : null) ??
    row.client_name ??
    null;

  return {
    id: row.id,
    ownerId: row.owner_id,
    clientId: row.client_id ?? null,
    clientName: clientName,
    title: row.title,
    slug: row.slug,
    description: row.description ?? "",
    brief: row.brief ?? "",
    designProcess: "Structured visual exploration and execution.",
    outcome: row.status === "completed" ? "Successfully delivered and approved." : undefined,
    category: row.category ?? "Brand Identity",
    tools: ["Figma", "Adobe Illustrator"],
    coverAssetId: row.cover_asset_id ?? "ast_01",
    coverUrl: row.cover_url ?? "/placeholders/asset-brand-system.svg",
    galleryAssetIds: row.cover_asset_id ? [row.cover_asset_id] : [],
    status: row.status as ProjectStatus,
    priority: row.priority ?? "medium",
    visibility: row.visibility ?? "private",
    featured: Boolean(row.featured),
    startDate: row.start_date ?? new Date().toISOString().slice(0, 10),
    dueDate: row.due_date ?? "2026-11-30",
    publishedAt: row.published_at ?? null,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
    pendingRevisionsCount: row.status === "in_review" ? 1 : 0,
    deliverablesCount: 1,
  };
}

export async function listProjects(
  userId: string,
  query: ProjectQueryInput
): Promise<ProjectsListResult> {
  const { isConfigured } = getSupabasePublicConfig();

  if (isConfigured) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      let req = supabase
        .from("projects")
        .select("*, clients(id, name, company)", { count: "exact" });

      // In Supabase, RLS automatically filters rows to those readable by user.
      // But we also explicitly filter by status if not "all"
      if (query.status !== "all") {
        if (query.status === "archived") {
          req = req.eq("status", "archived");
        } else {
          req = req.eq("status", query.status);
        }
      }

      if (query.category !== "all") {
        req = req.eq("category", query.category);
      }

      if (query.search) {
        req = req.ilike("title", `%${query.search}%`);
      }

      // Sort
      const ascending = query.sortOrder === "asc";
      switch (query.sortBy) {
        case "title":
          req = req.order("title", { ascending });
          break;
        case "priority":
          req = req.order("priority", { ascending });
          break;
        case "status":
          req = req.order("status", { ascending });
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
        throw new Error(`Failed to list projects: ${error.message}`);
      }

      const total = count ?? (data ? data.length : 0);
      const projects = (data ?? []).map((row) => mapSupabaseProjectRow(row));

      return {
        projects,
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
      };
    }
  }

  // --- Local Fallback Mode ---
  const items = localProjectsStore.filter((p) => {
    // User can see projects they own or where they are client
    const isOwner = p.ownerId === userId || p.ownerId === "usr_owner_01";
    if (!isOwner && p.visibility !== "public") return false;

    if (query.status !== "all" && p.status !== query.status) return false;
    if (query.category !== "all" && p.category !== query.category) return false;
    if (query.search) {
      const q = query.search.toLowerCase();
      const matchesTitle = p.title.toLowerCase().includes(q);
      const matchesClient = (p.clientName ?? "").toLowerCase().includes(q);
      const matchesDesc = (p.description ?? "").toLowerCase().includes(q);
      if (!matchesTitle && !matchesClient && !matchesDesc) return false;
    }
    return true;
  });

  // Sort
  items.sort((a, b) => {
    const asc = query.sortOrder === "asc" ? 1 : -1;
    if (query.sortBy === "title") {
      return a.title.localeCompare(b.title) * asc;
    }
    if (query.sortBy === "priority") {
      const pMap = { urgent: 4, high: 3, medium: 2, low: 1 };
      return ((pMap[a.priority] || 0) - (pMap[b.priority] || 0)) * asc;
    }
    if (query.sortBy === "status") {
      return a.status.localeCompare(b.status) * asc;
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
    projects: paginated,
    total,
    page: query.page,
    limit: query.limit,
    totalPages: Math.max(1, Math.ceil(total / query.limit)),
  };
}

export async function getProjectById(
  userId: string,
  idOrSlug: string
): Promise<Project | null> {
  const { isConfigured } = getSupabasePublicConfig();

  if (isConfigured) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      // Check if parameter is UUID
      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          idOrSlug
        );

      let req = supabase
        .from("projects")
        .select("*, clients(id, name, company)");

      if (isUuid) {
        req = req.eq("id", idOrSlug);
      } else {
        req = req.eq("slug", idOrSlug);
      }

      const { data, error } = await req.maybeSingle();
      if (error || !data) return null;

      return mapSupabaseProjectRow(data);
    }
  }

  const found = localProjectsStore.find(
    (p) => p.id === idOrSlug || p.slug === idOrSlug
  );
  if (!found) return null;

  // Access check
  if (
    found.visibility !== "public" &&
    found.ownerId !== userId &&
    found.ownerId !== "usr_owner_01"
  ) {
    return null;
  }

  return found;
}

export async function createProject(
  userId: string,
  input: CreateProjectInput
): Promise<Project> {
  const finalSlug = input.slug || slugify(input.title);
  const now = new Date().toISOString();

  const { isConfigured } = getSupabasePublicConfig();

  if (isConfigured) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase
        .from("projects")
        .insert({
          owner_id: userId,
          title: input.title,
          slug: finalSlug,
          description: input.description ?? "",
          brief: input.brief ?? "",
          category: input.category,
          client_id: input.clientId ?? null,
          cover_asset_id: input.coverAssetId ?? null,
          status: input.status,
          priority: input.priority,
          visibility: input.visibility,
          featured: input.featured,
          start_date: input.startDate ?? null,
          due_date: input.dueDate ?? null,
          published_at: input.visibility === "public" ? now : null,
        })
        .select("*, clients(id, name, company)")
        .single();

      if (error) {
        throw new Error(`Failed to create project: ${error.message}`);
      }

      // Record activity log
      await supabase.from("activity_logs").insert({
        actor_id: userId,
        project_id: data.id,
        event_type: "project_created",
        metadata: {
          title: input.title,
          slug: finalSlug,
        },
      });

      return mapSupabaseProjectRow(data);
    }
  }

  // Local fallback
  const newProject: Project = {
    id: `prj_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    ownerId: userId,
    clientId: input.clientId ?? null,
    clientName: input.clientName || (input.clientId ? "Assigned Client" : "Studio Concept"),
    title: input.title,
    slug: finalSlug,
    description: input.description || "",
    brief: input.brief || "",
    designProcess: "Discovery, structural drafting, and iterative review.",
    category: input.category,
    tools: input.tools || ["Figma", "Adobe Illustrator"],
    coverAssetId: input.coverAssetId || "ast_01",
    coverUrl: input.coverUrl || "/placeholders/asset-brand-system.svg",
    galleryAssetIds: ["ast_01"],
    status: input.status,
    priority: input.priority,
    visibility: input.visibility,
    featured: input.featured,
    startDate: input.startDate || now.slice(0, 10),
    dueDate: input.dueDate || "2026-11-30",
    publishedAt: input.visibility === "public" ? now : null,
    createdAt: now,
    updatedAt: now,
    pendingRevisionsCount: input.status === "in_review" ? 1 : 0,
    deliverablesCount: 1,
  };

  localProjectsStore = [newProject, ...localProjectsStore];
  return newProject;
}

export async function updateProject(
  userId: string,
  projectId: string,
  input: UpdateProjectInput
): Promise<Project> {
  const { isConfigured } = getSupabasePublicConfig();
  const now = new Date().toISOString();

  if (isConfigured) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      // Supabase RLS enforces that only owner can update
      const updateData: Database["public"]["Tables"]["projects"]["Update"] = {
        updated_at: now,
      };

      if (input.title !== undefined) updateData.title = input.title;
      if (input.slug !== undefined) updateData.slug = input.slug;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.brief !== undefined) updateData.brief = input.brief;
      if (input.category !== undefined) updateData.category = input.category;
      if (input.clientId !== undefined) updateData.client_id = input.clientId;
      if (input.coverAssetId !== undefined) updateData.cover_asset_id = input.coverAssetId;
      if (input.status !== undefined) updateData.status = input.status;
      if (input.priority !== undefined) updateData.priority = input.priority;
      if (input.visibility !== undefined) {
        updateData.visibility = input.visibility;
        if (input.visibility === "public") {
          updateData.published_at = now;
        }
      }
      if (input.featured !== undefined) updateData.featured = input.featured;
      if (input.startDate !== undefined) updateData.start_date = input.startDate;
      if (input.dueDate !== undefined) updateData.due_date = input.dueDate;
      if (input.archivedAt !== undefined) updateData.archived_at = input.archivedAt;

      const { data, error } = await supabase
        .from("projects")
        .update(updateData)
        .eq("id", projectId)
        .select("*, clients(id, name, company)")
        .single();

      if (error) {
        throw new Error(`Failed to update project: ${error.message}`);
      }

      return mapSupabaseProjectRow(data);
    }
  }

  // Local fallback
  const index = localProjectsStore.findIndex((p) => p.id === projectId);
  if (index === -1) {
    throw new Error("Project not found.");
  }

  const existing = localProjectsStore[index];
  if (existing.ownerId !== userId && existing.ownerId !== "usr_owner_01") {
    throw new Error("Unauthorized: you do not own this project.");
  }

  const updated: Project = {
    ...existing,
    ...(input.title !== undefined && { title: input.title }),
    ...(input.slug !== undefined && { slug: input.slug }),
    ...(input.description !== undefined && { description: input.description }),
    ...(input.brief !== undefined && { brief: input.brief }),
    ...(input.category !== undefined && { category: input.category }),
    ...(input.clientId !== undefined && { clientId: input.clientId }),
    ...(input.clientName !== undefined && { clientName: input.clientName }),
    ...(input.coverAssetId !== undefined && { coverAssetId: input.coverAssetId ?? existing.coverAssetId ?? "ast_01" }),
    ...(input.coverUrl !== undefined && { coverUrl: input.coverUrl }),
    ...(input.status !== undefined && { status: input.status }),
    ...(input.priority !== undefined && { priority: input.priority }),
    ...(input.visibility !== undefined && {
      visibility: input.visibility,
      publishedAt: input.visibility === "public" ? now : null,
    }),
    ...(input.featured !== undefined && { featured: input.featured }),
    ...(input.startDate !== undefined && { startDate: input.startDate ?? existing.startDate }),
    ...(input.dueDate !== undefined && { dueDate: input.dueDate ?? existing.dueDate }),
    ...(input.tools !== undefined && { tools: input.tools }),
    updatedAt: now,
  };

  localProjectsStore[index] = updated;
  return updated;
}

export async function deleteProject(
  userId: string,
  projectId: string
): Promise<boolean> {
  const { isConfigured } = getSupabasePublicConfig();

  if (isConfigured) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", projectId);

      if (error) {
        throw new Error(`Failed to delete project: ${error.message}`);
      }
      return true;
    }
  }

  const index = localProjectsStore.findIndex((p) => p.id === projectId);
  if (index === -1) return false;

  const existing = localProjectsStore[index];
  if (existing.ownerId !== userId && existing.ownerId !== "usr_owner_01") {
    throw new Error("Unauthorized: you do not own this project.");
  }

  localProjectsStore = localProjectsStore.filter((p) => p.id !== projectId);
  return true;
}

export async function toggleArchiveProject(
  userId: string,
  projectId: string
): Promise<Project> {
  const project = await getProjectById(userId, projectId);
  if (!project) throw new Error("Project not found.");

  const isArchived = project.status === "archived";
  const newStatus: ProjectStatus = isArchived ? "in_progress" : "archived";
  const now = new Date().toISOString();

  return updateProject(userId, projectId, {
    status: newStatus,
    archivedAt: isArchived ? null : now,
  });
}

export async function getDashboardSummary(userId: string): Promise<DashboardSummaryData> {
  const { isConfigured } = getSupabasePublicConfig();

  if (isConfigured) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      // Fetch projects
      const { data: projectsData } = await supabase
        .from("projects")
        .select("*, clients(id, name, company)")
        .order("updated_at", { ascending: false });

      // Fetch assets count
      const { count: assetsCount } = await supabase
        .from("assets")
        .select("*", { count: "exact", head: true });

      // Fetch clients count
      const { count: clientsCount } = await supabase
        .from("clients")
        .select("*", { count: "exact", head: true });

      const projects = (projectsData ?? []).map((row) => mapSupabaseProjectRow(row));

      const statusCounts = {
        completed: 0,
        in_review: 0,
        in_progress: 0,
        draft: 0,
      };

      let publishedCount = 0;
      let archivedCount = 0;
      let pendingRevisions = 0;

      for (const p of projects) {
        if (p.status in statusCounts) {
          statusCounts[p.status as keyof typeof statusCounts] += 1;
        }
        if (p.visibility === "public") publishedCount += 1;
        if (p.status === "archived") archivedCount += 1;
        if (p.status === "in_review") pendingRevisions += 1;
      }

      return {
        metrics: {
          totalProjects: projects.length,
          publishedProjects: publishedCount,
          inReviewProjects: statusCounts.in_review,
          inProgressProjects: statusCounts.in_progress,
          completedProjects: statusCounts.completed,
          draftProjects: statusCounts.draft,
          archivedProjects: archivedCount,
          totalAssets: assetsCount ?? DEMO_ASSETS.length,
          totalStorageBytes: DEMO_ASSETS.reduce((sum, a) => sum + a.fileSize, 0),
          activeClients: clientsCount ?? DEMO_CLIENTS.length,
          pendingRevisions,
        },
        recentProjects: projects.slice(0, 5),
        statusCounts,
      };
    }
  }

  // Local fallback
  const projects = localProjectsStore.filter(
    (p) => p.ownerId === userId || p.ownerId === "usr_owner_01"
  );

  const statusCounts = {
    completed: 0,
    in_review: 0,
    in_progress: 0,
    draft: 0,
  };

  let publishedCount = 0;
  let archivedCount = 0;
  let pendingRevisions = 0;

  for (const p of projects) {
    if (p.status in statusCounts) {
      statusCounts[p.status as keyof typeof statusCounts] += 1;
    }
    if (p.visibility === "public") publishedCount += 1;
    if (p.status === "archived") archivedCount += 1;
    pendingRevisions += p.pendingRevisionsCount;
  }

  return {
    metrics: {
      totalProjects: projects.length,
      publishedProjects: publishedCount,
      inReviewProjects: statusCounts.in_review,
      inProgressProjects: statusCounts.in_progress,
      completedProjects: statusCounts.completed,
      draftProjects: statusCounts.draft,
      archivedProjects: archivedCount,
      totalAssets: DEMO_ASSETS.length,
      totalStorageBytes: DEMO_ASSETS.reduce((sum, a) => sum + a.fileSize, 0),
      activeClients: DEMO_CLIENTS.length,
      pendingRevisions,
    },
    recentProjects: projects.slice(0, 5),
    statusCounts,
  };
}
