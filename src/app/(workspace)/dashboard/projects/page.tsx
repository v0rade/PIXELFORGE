"use client";

import * as React from "react";
import {
  FolderOpen,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import type { Project, ProjectStatus } from "@/types";
import { PROJECT_CATEGORIES } from "@/lib/validation/projects";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { Skeleton, EmptyState } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { ProjectCard } from "@/components/projects/project-card";
import { ProjectFormDialog } from "@/components/projects/project-form-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

export default function WorkspaceProjectsPage() {
  const { toast } = useToast();

  const [projects, setProjects] = React.useState<Project[]>([]);
  const [total, setTotal] = React.useState(0);
  const [totalPages, setTotalPages] = React.useState(1);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Filters & Pagination State
  const [statusFilter, setStatusFilter] = React.useState<"all" | ProjectStatus>("all");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [sortBy, setSortBy] = React.useState<"date" | "title" | "priority" | "status">("date");
  const [sortOrder, setSortOrder] = React.useState<"desc" | "asc">("desc");
  const [page, setPage] = React.useState(1);
  const limit = 12;

  // Dialog states
  const [formOpen, setFormOpen] = React.useState(false);
  const [selectedProject, setSelectedProject] = React.useState<Project | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [projectToDelete, setProjectToDelete] = React.useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Debounce search input
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setPage(1); // Reset to page 1 on new search
    }, 250);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Reset page when filters change
  const handleStatusChange = (status: "all" | ProjectStatus) => {
    setStatusFilter(status);
    setPage(1);
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCategoryFilter(e.target.value);
    setPage(1);
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === "date_desc") {
      setSortBy("date");
      setSortOrder("desc");
    } else if (val === "date_asc") {
      setSortBy("date");
      setSortOrder("asc");
    } else if (val === "title_asc") {
      setSortBy("title");
      setSortOrder("asc");
    } else if (val === "priority_desc") {
      setSortBy("priority");
      setSortOrder("desc");
    }
    setPage(1);
  };

  // Fetch projects from server API
  const loadProjects = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        status: statusFilter,
        category: categoryFilter,
        search: debouncedSearch,
        sortBy,
        sortOrder,
        page: String(page),
        limit: String(limit),
      });

      const res = await fetch(`/api/v1/projects?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error?.message || "Failed to load projects.");
      }

      setProjects(data.data.projects || []);
      setTotal(data.data.total || 0);
      setTotalPages(data.data.totalPages || 1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error connecting to studio service.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, categoryFilter, debouncedSearch, sortBy, sortOrder, page]);

  React.useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Actions
  const handleOpenCreate = () => {
    setSelectedProject(null);
    setFormOpen(true);
  };

  const handleOpenEdit = (project: Project) => {
    setSelectedProject(project);
    setFormOpen(true);
  };

  const handleProjectSaved = (savedProject: Project) => {
    if (selectedProject) {
      // Update in list
      setProjects((prev) =>
        prev.map((p) => (p.id === savedProject.id ? savedProject : p))
      );
      toast({
        title: "Project updated",
        description: `Modifications to ${savedProject.title} were saved successfully.`,
        variant: "success",
      });
    } else {
      // Prepend newly created project
      setProjects((prev) => [savedProject, ...prev]);
      setTotal((prev) => prev + 1);
      toast({
        title: "Project initialized",
        description: `${savedProject.title} is now active in your workspace.`,
        variant: "success",
      });
    }
  };

  const handleToggleArchive = async (project: Project) => {
    try {
      const res = await fetch(`/api/v1/projects/${project.id}/archive`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error?.message || "Failed to update project archive status.");
      }

      const updated = data.data.project as Project;
      setProjects((prev) =>
        prev.map((p) => (p.id === updated.id ? updated : p))
      );

      toast({
        title:
          updated.status === "archived" ? "Project archived" : "Project restored",
        description: `${updated.title} status is now ${updated.status}.`,
        variant: "info",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Archive operation failed.";
      toast({
        title: "Operation Failed",
        description: msg,
        variant: "error",
      });
    }
  };

  const handleOpenDelete = (project: Project) => {
    setProjectToDelete(project);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!projectToDelete) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/v1/projects/${projectToDelete.id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error?.message || "Failed to delete project.");
      }

      setProjects((prev) => prev.filter((p) => p.id !== projectToDelete.id));
      setTotal((prev) => Math.max(0, prev - 1));
      setDeleteConfirmOpen(false);
      setProjectToDelete(null);

      toast({
        title: "Project deleted",
        description: "The project record and references have been removed.",
        variant: "success",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete project.";
      toast({
        title: "Deletion Failed",
        description: msg,
        variant: "error",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-border pb-6 sm:flex-row sm:items-center">
        <div>
          <Badge variant="primary">WORKSPACE // PROJECTS</Badge>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Projects &amp; Deliverables
          </h1>
          <p className="mt-1 text-sm text-foreground-muted">
            Manage creative briefs, track client revision cycles, and control
            portfolio visibility.
          </p>
        </div>
        <Button variant="gradient" onClick={handleOpenCreate}>
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 space-y-4">
        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-border pb-3">
          {(
            [
              { id: "all", label: "All Projects" },
              { id: "in_progress", label: "In Progress" },
              { id: "in_review", label: "In Review" },
              { id: "completed", label: "Completed / Approved" },
              { id: "draft", label: "Draft" },
              { id: "archived", label: "Archived" },
            ] as const
          ).map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => handleStatusChange(st.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors border ${
                statusFilter === st.id
                  ? "border-accent-primary bg-accent-primary/15 text-accent-primary font-semibold"
                  : "border-transparent bg-background-secondary text-foreground-muted hover:text-foreground"
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>

        {/* Search, Category, and Sort Row */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground-muted" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search title, client, brief..."
              aria-label="Search projects"
              className="h-9 w-full rounded-md border border-border bg-background-secondary pl-9 pr-3 text-xs text-foreground placeholder:text-foreground-muted focus:border-accent-primary focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5">
              <SlidersHorizontal className="h-3.5 w-3.5 text-foreground-muted" />
              <Select
                value={categoryFilter}
                onChange={handleCategoryChange}
                aria-label="Filter by category"
                className="h-9 w-44 text-xs"
              >
                <option value="all">All Categories</option>
                {PROJECT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </Select>
            </div>

            <Select
              value={`${sortBy}_${sortOrder}`}
              onChange={handleSortChange}
              aria-label="Sort projects"
              className="h-9 w-40 text-xs"
            >
              <option value="date_desc">Newest First</option>
              <option value="date_asc">Oldest First</option>
              <option value="title_asc">Title (A-Z)</option>
              <option value="priority_desc">Priority (High to Low)</option>
            </Select>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={loadProjects}
              disabled={isLoading}
              className="h-9 px-2.5"
              aria-label="Refresh list"
              title="Refresh project list"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </Card>

      {/* Error State */}
      {error && !isLoading && (
        <Card className="p-6 border-status-error/40 bg-status-error/5 text-center">
          <p className="text-sm font-semibold text-status-error">{error}</p>
          <p className="mt-1 text-xs text-foreground-muted">
            An error occurred while communicating with the database.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={loadProjects}
            className="mt-4"
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Retry
          </Button>
        </Card>
      )}

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="overflow-hidden space-y-4 p-0">
              <Skeleton className="aspect-[16/10] w-full" />
              <div className="p-5 space-y-3">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-5/6" />
                <div className="pt-2">
                  <Skeleton className="h-10 w-full rounded" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Projects Grid */}
      {!isLoading && !error && projects.length === 0 && (
        <EmptyState
          icon={<FolderOpen className="h-6 w-6" />}
          title="No projects match your filter"
          description={
            debouncedSearch || statusFilter !== "all" || categoryFilter !== "all"
              ? "Try adjusting your search query, status, or category filter to discover projects."
              : "No projects exist yet. Create your first studio project to start organizing visual assets and client deliverables."
          }
          action={
            debouncedSearch || statusFilter !== "all" || categoryFilter !== "all" ? (
              <Button
                variant="outline"
                onClick={() => {
                  setStatusFilter("all");
                  setCategoryFilter("all");
                  setSearchQuery("");
                }}
              >
                Clear Filters
              </Button>
            ) : (
              <Button variant="primary" onClick={handleOpenCreate}>
                <Plus className="h-4 w-4" />
                Create First Project
              </Button>
            )
          }
        />
      )}

      {!isLoading && !error && projects.length > 0 && (
        <>
          <div className="flex items-center justify-between text-xs font-mono text-foreground-muted">
            <span>
              SHOWING {projects.length} OF {total} PROJECT{total === 1 ? "" : "S"}
            </span>
            {totalPages > 1 && (
              <span>
                PAGE {page} OF {totalPages}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onEdit={handleOpenEdit}
                onArchiveToggle={handleToggleArchive}
                onDelete={handleOpenDelete}
              />
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous Page
              </Button>
              <span className="font-mono text-xs text-foreground-muted">
                Page {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next Page
              </Button>
            </div>
          )}
        </>
      )}

      {/* Project Create / Edit Dialog */}
      <ProjectFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        project={selectedProject}
        onSuccess={handleProjectSaved}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title={`Delete Project: ${projectToDelete?.title ?? ""}`}
        description="Are you sure you want to delete this project? This will permanently remove all associated deliverable version records and client revisions. This action cannot be undone."
        confirmLabel="Permanently Delete"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
