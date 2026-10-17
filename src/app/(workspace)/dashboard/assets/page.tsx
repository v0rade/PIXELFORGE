"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  CheckSquare,
  Copy,
  Edit3,
  ExternalLink,
  Eye,
  FileCode2,
  FolderOpen,
  FolderPlus,
  Grid,
  List as ListIcon,
  Lock,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Square,
  Trash2,
  UploadCloud,
} from "lucide-react";
import type {
  AssetCategory,
  AssetCollection,
  CreativeAsset,
  Project,
  Visibility,
} from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { EmptyState, Skeleton } from "@/components/ui/skeleton";
import { VisibilityBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import {
  formatFileSize,
  formatTechnicalTimestamp,
} from "@/lib/utils/format";
import {
  ALLOWED_ASSET_CATEGORIES,
  ALLOWED_ASSET_FORMATS,
  ALLOWED_MIME_TYPES,
  MAX_ASSET_FILE_SIZE,
} from "@/lib/validation/assets";

interface TagItem {
  id: string;
  name: string;
  slug: string;
}

function AssetLibraryContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const { toast } = useToast();

  // Primary Data State
  const [assets, setAssets] = React.useState<CreativeAsset[]>([]);
  const [total, setTotal] = React.useState(0);
  const [totalPages, setTotalPages] = React.useState(1);
  const [page, setPage] = React.useState(1);
  const limit = 24;
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Filter Data from auxiliary endpoints
  const [availableTags, setAvailableTags] = React.useState<TagItem[]>([]);
  const [availableCollections, setAvailableCollections] = React.useState<AssetCollection[]>([]);
  const [availableProjects, setAvailableProjects] = React.useState<Project[]>([]);

  // Filter & Search Controls
  const [searchQuery, setSearchQuery] = React.useState(initialQuery);
  const [debouncedSearch, setDebouncedSearch] = React.useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = React.useState<string>("all");
  const [selectedFormat, setSelectedFormat] = React.useState<string>("all");
  const [selectedTag, setSelectedTag] = React.useState<string>("all");
  const [selectedCollection, setSelectedCollection] = React.useState<string>("all");
  const [selectedProject, setSelectedProject] = React.useState<string>("all");
  const [sortBy, setSortBy] = React.useState<"date" | "title" | "size">("date");
  const [sortOrder, setSortOrder] = React.useState<"desc" | "asc">("desc");
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid");

  // Multi-select & Bulk operations
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = React.useState(false);
  const [bulkCollectionId, setBulkCollectionId] = React.useState("");
  const [addToCollectionDialogOpen, setAddToCollectionDialogOpen] = React.useState(false);

  // Modals & Inspectors
  const [previewAsset, setPreviewAsset] = React.useState<CreativeAsset | null>(null);
  const [editingAsset, setEditingAsset] = React.useState<CreativeAsset | null>(null);
  const [isUpdatingMetadata, setIsUpdatingMetadata] = React.useState(false);
  const [deleteConfirmIds, setDeleteConfirmIds] = React.useState<string[] | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = React.useState(false);

  // Upload Form State
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = React.useState<number | null>(null);
  const [uploadTitle, setUploadTitle] = React.useState("");
  const [uploadDescription, setUploadDescription] = React.useState("");
  const [uploadCategory, setUploadCategory] = React.useState<AssetCategory>("Brand Identity");
  const [uploadVisibility, setUploadVisibility] = React.useState<Visibility>("private");
  const [uploadTags, setUploadTags] = React.useState("vector, concept");
  const [uploadFile, setUploadFile] = React.useState<File | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  // Signed URL State
  const [signedUrlData, setSignedUrlData] = React.useState<{ url: string; expiresAt: number } | null>(null);
  const [isGeneratingSignedUrl, setIsGeneratingSignedUrl] = React.useState(false);

  // Debounce search query
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Load auxiliary data (tags, collections, projects)
  React.useEffect(() => {
    async function loadAuxiliaryData() {
      try {
        const [tagsRes, colRes, projRes] = await Promise.all([
          fetch("/api/v1/tags"),
          fetch("/api/v1/collections"),
          fetch("/api/v1/projects?limit=50"),
        ]);

        if (tagsRes.ok) {
          const td = await tagsRes.json();
          setAvailableTags(td.data.tags || []);
        }
        if (colRes.ok) {
          const cd = await colRes.json();
          setAvailableCollections(cd.data.collections || []);
        }
        if (projRes.ok) {
          const pd = await projRes.json();
          setAvailableProjects(pd.data.projects || []);
        }
      } catch {
        // Non-blocking auxiliary failures
      }
    }
    loadAuxiliaryData();
  }, []);

  // Fetch Assets from API
  const loadAssets = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        search: debouncedSearch,
        category: selectedCategory,
        format: selectedFormat,
        tag: selectedTag,
        projectId: selectedProject,
        collectionId: selectedCollection,
        sortBy,
        sortOrder,
        page: String(page),
        limit: String(limit),
      });

      const res = await fetch(`/api/v1/assets?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error?.message || "Failed to load creative assets.");
      }

      setAssets(data.data.assets || []);
      setTotal(data.data.total || 0);
      setTotalPages(data.data.totalPages || 1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error connecting to asset service.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [
    debouncedSearch,
    selectedCategory,
    selectedFormat,
    selectedTag,
    selectedProject,
    selectedCollection,
    sortBy,
    sortOrder,
    page,
  ]);

  React.useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  // Multi-select helpers
  const toggleSelectId = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === assets.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(assets.map((a) => a.id));
    }
  };

  // Signed URL generator
  const handleGenerateSignedUrl = async (asset: CreativeAsset) => {
    setIsGeneratingSignedUrl(true);
    try {
      const res = await fetch(`/api/v1/assets/${asset.id}/signed-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expiresIn: 1800 }), // 30 minutes
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error?.message || "Failed to generate signed URL.");
      }

      const signedUrl = data.data.signedUrl;
      setSignedUrlData({
        url: signedUrl,
        expiresAt: Date.now() + 1800 * 1000,
      });

      if (navigator.clipboard) {
        await navigator.clipboard.writeText(signedUrl);
      }

      toast({
        title: "Signed URL Generated (30m)",
        description: `Signed access URL copied to clipboard. Authorized for 30 minutes.`,
        variant: "info",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Signed URL error.";
      toast({
        title: "Failed to Sign URL",
        description: msg,
        variant: "error",
      });
    } finally {
      setIsGeneratingSignedUrl(false);
    }
  };

  // Bulk Operations
  const handleBulkAction = async (action: "set_public" | "set_private" | "delete") => {
    if (selectedIds.length === 0) return;
    setBulkActionLoading(true);

    try {
      const res = await fetch("/api/v1/assets/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetIds: selectedIds,
          action,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || "Bulk action failed.");
      }

      toast({
        title: "Bulk Operation Complete",
        description: `Successfully processed ${data.data.affected} asset(s).`,
        variant: "success",
      });

      setSelectedIds([]);
      loadAssets();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Bulk action failed.";
      toast({
        title: "Bulk Operation Failed",
        description: msg,
        variant: "error",
      });
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkAddToCollection = async () => {
    if (!bulkCollectionId || selectedIds.length === 0) return;
    setBulkActionLoading(true);

    try {
      const res = await fetch("/api/v1/assets/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetIds: selectedIds,
          action: "add_to_collection",
          targetId: bulkCollectionId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || "Failed to add assets to collection.");
      }

      toast({
        title: "Added to Collection",
        description: `Organized ${data.data.affected} asset(s) into selected collection.`,
        variant: "success",
      });

      setAddToCollectionDialogOpen(false);
      setSelectedIds([]);
      loadAssets();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to organize assets.";
      toast({
        title: "Action Failed",
        description: msg,
        variant: "error",
      });
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Single Deletion & Bulk Deletion confirmation
  const handleConfirmDelete = async () => {
    if (!deleteConfirmIds || deleteConfirmIds.length === 0) return;
    setIsDeleting(true);

    try {
      if (deleteConfirmIds.length === 1) {
        const id = deleteConfirmIds[0];
        const res = await fetch(`/api/v1/assets/${id}`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error?.message || "Delete failed.");
      } else {
        const res = await fetch("/api/v1/assets/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assetIds: deleteConfirmIds,
            action: "delete",
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error?.message || "Bulk delete failed.");
      }

      toast({
        title: `Removed ${deleteConfirmIds.length} asset(s)`,
        description: "Storage object and database record removed.",
        variant: "success",
      });

      if (previewAsset && deleteConfirmIds.includes(previewAsset.id)) {
        setPreviewAsset(null);
      }
      setSelectedIds((prev) => prev.filter((id) => !deleteConfirmIds.includes(id)));
      setDeleteConfirmIds(null);
      loadAssets();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Deletion failed.";
      toast({
        title: "Delete Failed",
        description: msg,
        variant: "error",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Upload Handling
  const validateAndSetFile = (file: File | null) => {
    setUploadError(null);
    if (!file) {
      setUploadFile(null);
      return;
    }

    if (!ALLOWED_MIME_TYPES[file.type]) {
      setUploadError(
        `Unsupported file type (${file.type || file.name}). Allowed formats: JPG, PNG, WebP, GIF, SVG, PDF, ZIP.`
      );
      setUploadFile(null);
      return;
    }

    if (file.size <= 0 || file.size > MAX_ASSET_FILE_SIZE) {
      setUploadError(
        `File size (${formatFileSize(file.size)}) exceeds the 50 MB studio upload limit.`
      );
      setUploadFile(null);
      return;
    }

    setUploadFile(file);
    if (!uploadTitle) {
      setUploadTitle(file.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadError("Please choose or drop an artwork file to upload.");
      return;
    }

    setUploadError(null);
    setUploadProgress(20);

    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("title", uploadTitle.trim());
      formData.append("description", uploadDescription.trim());
      formData.append("category", uploadCategory);
      formData.append("visibility", uploadVisibility);
      formData.append("tags", uploadTags);

      const progressTimer = setInterval(() => {
        setUploadProgress((p) => (p && p < 85 ? p + 15 : p));
      }, 150);

      const res = await fetch("/api/v1/assets", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressTimer);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error?.message || "File upload failed.");
      }

      setUploadProgress(100);
      setTimeout(() => {
        setUploadProgress(null);
        setUploadDialogOpen(false);
        setUploadFile(null);
        setUploadTitle("");
        setUploadDescription("");
        loadAssets();
        toast({
          title: "Asset uploaded & indexed",
          description: `${data.data.asset.originalFilename} (${formatFileSize(data.data.asset.fileSize)}) saved to creative-assets bucket.`,
          variant: "success",
        });
      }, 300);
    } catch (err: unknown) {
      setUploadProgress(null);
      const msg = err instanceof Error ? err.message : "Upload error.";
      setUploadError(msg);
    }
  };

  // Edit Metadata Save
  const handleSaveMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAsset) return;
    setIsUpdatingMetadata(true);

    try {
      const res = await fetch(`/api/v1/assets/${editingAsset.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingAsset.name,
          description: editingAsset.description,
          category: editingAsset.category,
          visibility: editingAsset.visibility,
          tags: editingAsset.tags,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || "Failed to update asset metadata.");
      }

      const updated = data.data.asset;
      setAssets((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      if (previewAsset?.id === updated.id) {
        setPreviewAsset(updated);
      }
      setEditingAsset(null);

      toast({
        title: "Metadata saved",
        description: `Changes to ${updated.name} have been committed.`,
        variant: "success",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update metadata.";
      toast({
        title: "Save Failed",
        description: msg,
        variant: "error",
      });
    } finally {
      setIsUpdatingMetadata(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-border pb-6 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="cyan">BUCKET // CREATIVE-ASSETS</Badge>
            <Badge variant="mono">{total} ASSETS</Badge>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Creative Asset Library
          </h1>
          <p className="mt-1 text-sm text-foreground-muted">
            Organize master artwork, inspect technical metadata, and manage private signed URL access.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadAssets}
            disabled={isLoading}
            className="px-2.5"
            title="Refresh assets"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>

          <Button
            type="button"
            variant="gradient"
            onClick={() => {
              setUploadError(null);
              setUploadDialogOpen(true);
            }}
          >
            <UploadCloud className="h-4 w-4" />
            Upload Asset
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 space-y-4">
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search filename, title, or #tag..."
              aria-label="Search assets"
              className="h-9 w-full rounded-md border border-border bg-background-secondary pl-9 pr-4 text-xs text-foreground placeholder:text-foreground-muted focus:border-accent-primary focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Format Filter */}
            <Select
              value={selectedFormat}
              onChange={(e) => {
                setSelectedFormat(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by format"
              className="h-9 w-32 text-xs font-mono"
            >
              <option value="all">All Formats</option>
              {ALLOWED_ASSET_FORMATS.map((fmt) => (
                <option key={fmt} value={fmt}>
                  {fmt}
                </option>
              ))}
            </Select>

            {/* Tag Filter */}
            <Select
              value={selectedTag}
              onChange={(e) => {
                setSelectedTag(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by tag"
              className="h-9 w-36 text-xs font-mono"
            >
              <option value="all">All Tags</option>
              {availableTags.map((tag) => (
                <option key={tag.id} value={tag.name}>
                  #{tag.name}
                </option>
              ))}
            </Select>

            {/* Collection Filter */}
            <Select
              value={selectedCollection}
              onChange={(e) => {
                setSelectedCollection(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by collection"
              className="h-9 w-40 text-xs"
            >
              <option value="all">All Collections</option>
              {availableCollections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>

            {/* Project Filter */}
            <Select
              value={selectedProject}
              onChange={(e) => {
                setSelectedProject(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by project"
              className="h-9 w-40 text-xs"
            >
              <option value="all">All Projects</option>
              {availableProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </Select>

            {/* Sort Filter */}
            <Select
              value={`${sortBy}_${sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split("_") as ["date" | "title" | "size", "desc" | "asc"];
                setSortBy(sb);
                setSortOrder(so);
                setPage(1);
              }}
              aria-label="Sort assets"
              className="h-9 w-36 text-xs"
            >
              <option value="date_desc">Newest First</option>
              <option value="date_asc">Oldest First</option>
              <option value="title_asc">Title (A-Z)</option>
              <option value="size_desc">File Size (Large)</option>
            </Select>

            {/* View Mode Toggle */}
            <div className="inline-flex rounded-md border border-border bg-background-secondary p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                aria-label="Grid view"
                className={`rounded p-1.5 transition-colors ${
                  viewMode === "grid"
                    ? "bg-accent-primary text-[#09090F]"
                    : "text-foreground-muted hover:text-foreground"
                }`}
              >
                <Grid className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                aria-label="List view"
                className={`rounded p-1.5 transition-colors ${
                  viewMode === "list"
                    ? "bg-accent-primary text-[#09090F]"
                    : "text-foreground-muted hover:text-foreground"
                }`}
              >
                <ListIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Category Pills & Select All Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5 text-foreground-muted mr-1" />
            <button
              type="button"
              onClick={() => {
                setSelectedCategory("all");
                setPage(1);
              }}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors border ${
                selectedCategory === "all"
                  ? "border-accent-primary bg-accent-primary/15 text-accent-primary font-semibold"
                  : "border-transparent bg-background-secondary text-foreground-muted hover:text-foreground"
              }`}
            >
              All Categories
            </button>
            {ALLOWED_ASSET_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat);
                  setPage(1);
                }}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors border ${
                  selectedCategory === cat
                    ? "border-accent-primary bg-accent-primary/15 text-accent-primary font-semibold"
                    : "border-transparent bg-background-secondary text-foreground-muted hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={toggleSelectAll}
            className="inline-flex items-center gap-1.5 font-mono text-xs text-foreground-muted hover:text-foreground"
          >
            {selectedIds.length > 0 && selectedIds.length === assets.length ? (
              <CheckSquare className="h-3.5 w-3.5 text-accent-primary" />
            ) : (
              <Square className="h-3.5 w-3.5" />
            )}
            <span>
              {selectedIds.length > 0 ? `${selectedIds.length} Selected` : "Select All"}
            </span>
          </button>
        </div>
      </Card>

      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-accent-primary/40 bg-accent-primary/10 px-4 py-3 shadow-forge-sm">
          <div className="flex items-center gap-2 text-xs font-medium text-foreground">
            <Badge variant="primary">{selectedIds.length} Selected</Badge>
            <span>Batch actions across studio files:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={bulkActionLoading}
              onClick={() => handleBulkAction("set_public")}
            >
              Set Public
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={bulkActionLoading}
              onClick={() => handleBulkAction("set_private")}
            >
              <Lock className="h-3.5 w-3.5" />
              Set Private
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={bulkActionLoading}
              onClick={() => setAddToCollectionDialogOpen(true)}
            >
              <FolderPlus className="h-3.5 w-3.5 text-accent-secondary" />
              Add to Collection
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={bulkActionLoading}
              onClick={() => setDeleteConfirmIds(selectedIds)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete Selected
            </Button>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <Card className="p-6 border-status-error/40 bg-status-error/5 text-center">
          <p className="text-sm font-semibold text-status-error">{error}</p>
          <p className="mt-1 text-xs text-foreground-muted">
            Failed to retrieve assets from storage.
          </p>
          <Button variant="outline" size="sm" onClick={loadAssets} className="mt-4">
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Retry
          </Button>
        </Card>
      )}

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="overflow-hidden p-0 space-y-3">
              <Skeleton className="aspect-[3/2] w-full" />
              <div className="p-4 space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && assets.length === 0 && (
        <EmptyState
          icon={<FolderOpen className="h-6 w-6" />}
          title="No assets match your active filters"
          description={
            debouncedSearch || selectedCategory !== "all" || selectedFormat !== "all" || selectedTag !== "all"
              ? "Try resetting filters or adjusting search parameters to locate artwork."
              : "Your asset repository is empty. Upload your first artwork or master file to begin."
          }
          action={
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                  setSelectedFormat("all");
                  setSelectedTag("all");
                  setSelectedCollection("all");
                  setSelectedProject("all");
                  setPage(1);
                }}
              >
                Reset All Filters
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setUploadDialogOpen(true)}
              >
                <Plus className="h-4 w-4" />
                Upload Asset
              </Button>
            </div>
          }
        />
      )}

      {/* Grid View */}
      {!isLoading && !error && assets.length > 0 && viewMode === "grid" && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {assets.map((asset) => {
            const isSelected = selectedIds.includes(asset.id);
            return (
              <Card
                key={asset.id}
                interactive
                className={`overflow-hidden flex flex-col justify-between group transition-all duration-200 border-border bg-background-card ${
                  isSelected ? "border-accent-primary ring-1 ring-accent-primary" : ""
                }`}
              >
                <div>
                  {/* Thumbnail Banner */}
                  <div className="relative aspect-[3/2] w-full bg-background border-b border-border overflow-hidden">
                    <Image
                      src={asset.previewUrl}
                      alt={asset.name}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                    <div className="absolute left-3 top-3 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => toggleSelectId(asset.id)}
                        aria-label={`Select ${asset.name}`}
                        className="flex h-6 w-6 items-center justify-center rounded bg-background-card/90 border border-border text-foreground hover:border-accent-primary"
                      >
                        {isSelected ? (
                          <CheckSquare className="h-3.5 w-3.5 text-accent-primary" />
                        ) : (
                          <Square className="h-3.5 w-3.5 text-foreground-muted" />
                        )}
                      </button>
                      <VisibilityBadge visibility={asset.visibility} />
                    </div>
                    <div className="absolute right-3 top-3">
                      <Badge variant="mono">{asset.format}</Badge>
                    </div>

                    {/* Quick Hover Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        type="button"
                        size="sm"
                        variant="primary"
                        onClick={() => setPreviewAsset(asset)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Inspect
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingAsset(asset)}
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-accent-secondary uppercase text-[10px] tracking-wider truncate">
                        {asset.category}
                      </span>
                      <span className="text-foreground-muted text-[11px]">
                        {formatFileSize(asset.fileSize)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setPreviewAsset(asset)}
                      className="block text-left text-sm font-semibold text-foreground hover:text-accent-primary transition-colors line-clamp-1"
                    >
                      {asset.name}
                    </button>

                    <p className="font-mono text-[10px] text-foreground-muted truncate">
                      {asset.originalFilename}
                    </p>

                    {asset.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {asset.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="rounded bg-background-secondary px-1.5 py-0.5 font-mono text-[10px] text-foreground-muted"
                          >
                            #{tag}
                          </span>
                        ))}
                        {asset.tags.length > 3 && (
                          <span className="font-mono text-[10px] text-foreground-muted">
                            +{asset.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between border-t border-border px-4 py-2 bg-background-secondary/40 text-xs">
                  <span className="font-mono text-[10px] text-foreground-muted">
                    {asset.width && asset.height ? `${asset.width}×${asset.height}` : asset.format}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleGenerateSignedUrl(asset)}
                      disabled={isGeneratingSignedUrl}
                      className="rounded p-1 text-foreground-muted hover:bg-background-elevated hover:text-foreground"
                      title={asset.visibility === "public" ? "Copy public link" : "Generate signed access URL"}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingAsset(asset)}
                      className="rounded p-1 text-foreground-muted hover:bg-background-elevated hover:text-foreground"
                      title="Edit metadata"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmIds([asset.id])}
                      className="rounded p-1 text-foreground-muted hover:bg-status-error/15 hover:text-status-error"
                      title="Delete asset"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* List View */}
      {!isLoading && !error && assets.length > 0 && viewMode === "list" && (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-background-secondary font-mono text-[10px] uppercase text-foreground-muted">
                <tr>
                  <th className="p-3">Asset</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Format</th>
                  <th className="p-3">Dimensions</th>
                  <th className="p-3">File Size</th>
                  <th className="p-3">Visibility</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {assets.map((asset) => {
                  const isSelected = selectedIds.includes(asset.id);
                  return (
                    <tr
                      key={asset.id}
                      className={`hover:bg-background-secondary/50 transition-colors ${
                        isSelected ? "bg-accent-primary/5" : ""
                      }`}
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => toggleSelectId(asset.id)}
                            aria-label={`Select ${asset.name}`}
                          >
                            {isSelected ? (
                              <CheckSquare className="h-3.5 w-3.5 text-accent-primary" />
                            ) : (
                              <Square className="h-3.5 w-3.5 text-foreground-muted" />
                            )}
                          </button>
                          <div className="relative h-10 w-14 shrink-0 overflow-hidden rounded border border-border bg-background">
                            <Image
                              src={asset.previewUrl}
                              alt={asset.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => setPreviewAsset(asset)}
                              className="font-semibold text-foreground hover:text-accent-primary block truncate max-w-xs"
                            >
                              {asset.name}
                            </button>
                            <span className="font-mono text-[10px] text-foreground-muted block truncate max-w-xs">
                              {asset.originalFilename}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-foreground-muted font-mono">{asset.category}</td>
                      <td className="p-3">
                        <Badge variant="mono">{asset.format}</Badge>
                      </td>
                      <td className="p-3 font-mono text-foreground-muted">
                        {asset.width && asset.height ? `${asset.width}×${asset.height}` : "—"}
                      </td>
                      <td className="p-3 font-mono text-foreground-muted">
                        {formatFileSize(asset.fileSize)}
                      </td>
                      <td className="p-3">
                        <VisibilityBadge visibility={asset.visibility} />
                      </td>
                      <td className="p-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setPreviewAsset(asset)}
                          >
                            Inspect
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingAsset(asset)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeleteConfirmIds([asset.id])}
                            className="text-status-error hover:bg-status-error/10 hover:text-status-error"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="font-mono text-xs text-foreground-muted">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
        </div>
      )}

      {/* Asset Preview & Inspection Modal */}
      <Dialog
        open={Boolean(previewAsset)}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewAsset(null);
            setSignedUrlData(null);
          }
        }}
        title={previewAsset?.name ?? "Asset Inspection"}
        description={previewAsset?.originalFilename}
        maxWidth="xl"
      >
        {previewAsset && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="lg:col-span-7 space-y-3">
              <div className="relative aspect-[3/2] w-full overflow-hidden rounded-lg border border-border bg-background">
                <Image
                  src={previewAsset.previewUrl}
                  alt={previewAsset.name}
                  fill
                  className="object-contain"
                />
              </div>
              <p className="text-xs text-foreground-muted leading-relaxed whitespace-pre-wrap">
                {previewAsset.description || "No asset description specified."}
              </p>

              {signedUrlData && (
                <div className="rounded-md border border-accent-secondary/40 bg-accent-secondary/10 p-2.5 font-mono text-[10px] text-accent-secondary break-all space-y-1">
                  <span className="font-semibold block uppercase">
                    Active Signed Access URL (Valid for 30m):
                  </span>
                  <div className="text-foreground">{signedUrlData.url}</div>
                </div>
              )}
            </div>

            <div className="lg:col-span-5 space-y-4">
              <div className="rounded-lg border border-border bg-background-secondary p-4 space-y-2.5 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-foreground-muted">ASSET ID</span>
                  <span className="text-foreground text-[10px] break-all">{previewAsset.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground-muted">MIME TYPE</span>
                  <span className="text-accent-secondary">{previewAsset.mimeType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground-muted">FILE SIZE</span>
                  <span className="text-foreground">{formatFileSize(previewAsset.fileSize)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground-muted">DIMENSIONS</span>
                  <span className="text-foreground">
                    {previewAsset.width && previewAsset.height
                      ? `${previewAsset.width} × ${previewAsset.height} px`
                      : "Vector / Document"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground-muted">VISIBILITY</span>
                  <span className="uppercase text-accent-primary">{previewAsset.visibility}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground-muted">UPLOADED</span>
                  <span className="text-foreground">
                    {formatTechnicalTimestamp(previewAsset.createdAt)}
                  </span>
                </div>
                <div className="border-t border-border pt-2">
                  <span className="text-foreground-muted block mb-1">STORAGE PATH</span>
                  <code className="block break-all rounded bg-background p-2 text-[10px] text-foreground-muted">
                    {previewAsset.storagePath}
                  </code>
                </div>
              </div>

              {/* Linked Projects */}
              <div>
                <p className="font-mono text-xs uppercase text-foreground-muted mb-2">
                  Associated Projects
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {previewAsset.linkedProjectIds.length === 0 ? (
                    <span className="text-xs text-foreground-muted">
                      Not linked to any project.
                    </span>
                  ) : (
                    previewAsset.linkedProjectIds.map((pid) => {
                      const proj = availableProjects.find((p) => p.id === pid);
                      return (
                        <Link key={pid} href={`/dashboard/projects/${pid}`}>
                          <Badge variant="primary" className="cursor-pointer hover:underline">
                            {proj ? proj.title : pid}
                            <ExternalLink className="ml-1 h-3 w-3 inline" />
                          </Badge>
                        </Link>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleGenerateSignedUrl(previewAsset)}
                  disabled={isGeneratingSignedUrl}
                >
                  <Copy className="h-3.5 w-3.5" />
                  {previewAsset.visibility === "public"
                    ? "Copy Public Link"
                    : "Generate Signed URL"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingAsset(previewAsset);
                  }}
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  Edit Metadata
                </Button>
              </div>
            </div>
          </div>
        )}
      </Dialog>

      {/* Edit Metadata Modal */}
      <Dialog
        open={Boolean(editingAsset)}
        onOpenChange={(open) => !open && setEditingAsset(null)}
        title="Edit Asset Metadata"
        description="Update title, description, category, tags, and visibility rules."
      >
        {editingAsset && (
          <form onSubmit={handleSaveMetadata} className="space-y-4">
            <div>
              <Label htmlFor="editAssetName">Asset Title *</Label>
              <Input
                id="editAssetName"
                value={editingAsset.name}
                onChange={(e) =>
                  setEditingAsset({ ...editingAsset, name: e.target.value })
                }
                required
              />
            </div>

            <div>
              <Label htmlFor="editAssetDesc">Description</Label>
              <Textarea
                id="editAssetDesc"
                rows={3}
                value={editingAsset.description}
                onChange={(e) =>
                  setEditingAsset({
                    ...editingAsset,
                    description: e.target.value,
                  })
                }
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="editAssetCategory">Category</Label>
                <Select
                  id="editAssetCategory"
                  value={editingAsset.category}
                  onChange={(e) =>
                    setEditingAsset({
                      ...editingAsset,
                      category: e.target.value as AssetCategory,
                    })
                  }
                >
                  {ALLOWED_ASSET_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <Label htmlFor="editAssetVisibility">Visibility Policy</Label>
                <Select
                  id="editAssetVisibility"
                  value={editingAsset.visibility}
                  onChange={(e) =>
                    setEditingAsset({
                      ...editingAsset,
                      visibility: e.target.value as Visibility,
                    })
                  }
                >
                  <option value="private">Private (Signed URLs Only)</option>
                  <option value="public">Public (Allowed on Portfolio)</option>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="editAssetTags">Tags (comma-separated)</Label>
              <Input
                id="editAssetTags"
                value={editingAsset.tags.join(", ")}
                onChange={(e) =>
                  setEditingAsset({
                    ...editingAsset,
                    tags: e.target.value
                      .split(",")
                      .map((t) => t.trim().toLowerCase())
                      .filter(Boolean),
                  })
                }
              />
            </div>

            <div className="flex justify-end gap-2.5 border-t border-border pt-4">
              <Button
                type="button"
                variant="outline"
                disabled={isUpdatingMetadata}
                onClick={() => setEditingAsset(null)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={isUpdatingMetadata}>
                Save Metadata
              </Button>
            </div>
          </form>
        )}
      </Dialog>

      {/* Drag & Drop Upload Modal */}
      <Dialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        title="Upload Creative Asset"
        description="Files are validated for allowed MIME types (JPG, PNG, WebP, GIF, SVG, PDF, ZIP) and stored in the private creative-assets bucket."
      >
        <form onSubmit={handleUploadSubmit} className="space-y-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const file = e.dataTransfer.files?.[0] ?? null;
              validateAndSetFile(file);
            }}
            className={`rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
              isDragging
                ? "border-accent-primary bg-accent-primary/10"
                : "border-border bg-background-secondary/60 hover:border-accent-primary/50"
            }`}
          >
            <FileCode2 className="mx-auto h-8 w-8 text-accent-primary" />
            <p className="mt-2 text-sm font-medium text-foreground">
              {uploadFile ? uploadFile.name : "Drag & drop artwork here, or choose a file"}
            </p>
            <p className="mt-1 font-mono text-xs text-foreground-muted">
              {uploadFile ? formatFileSize(uploadFile.size) : "MAX 50 MB · SVG SANITIZED · PRIVATE BUCKET"}
            </p>
            <input
              type="file"
              id="assetFilePicker"
              accept=".jpg,.jpeg,.png,.webp,.gif,.svg,.pdf,.zip"
              onChange={(e) => validateAndSetFile(e.target.files?.[0] ?? null)}
              className="mt-4 block w-full text-xs text-foreground-muted file:mr-3 file:rounded-md file:border-0 file:bg-accent-primary/20 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-accent-primary hover:file:bg-accent-primary/30"
            />
          </div>

          {uploadError && (
            <div
              role="alert"
              className="rounded-md border border-status-error/40 bg-status-error/10 p-3 text-xs text-status-error"
            >
              {uploadError}
            </div>
          )}

          <div>
            <Label htmlFor="uploadTitle">Asset Title *</Label>
            <Input
              id="uploadTitle"
              value={uploadTitle}
              onChange={(e) => setUploadTitle(e.target.value)}
              placeholder="e.g., Orbital Key Visual Master"
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="uploadCategory">Category</Label>
              <Select
                id="uploadCategory"
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value as AssetCategory)}
              >
                {ALLOWED_ASSET_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="uploadVisibility">Initial Visibility</Label>
              <Select
                id="uploadVisibility"
                value={uploadVisibility}
                onChange={(e) => setUploadVisibility(e.target.value as Visibility)}
              >
                <option value="private">Private (Default)</option>
                <option value="public">Public (Portfolio Case Study)</option>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="uploadTags">Tags (comma-separated)</Label>
            <Input
              id="uploadTags"
              value={uploadTags}
              onChange={(e) => setUploadTags(e.target.value)}
              placeholder="brand, vector, grid"
            />
          </div>

          <div>
            <Label htmlFor="uploadDescription">Executive Description</Label>
            <Textarea
              id="uploadDescription"
              rows={2}
              value={uploadDescription}
              onChange={(e) => setUploadDescription(e.target.value)}
              placeholder="Design constraints, color profiles, or usage notes..."
            />
          </div>

          {uploadProgress !== null && (
            <div className="space-y-1.5">
              <div className="flex justify-between font-mono text-xs">
                <span className="text-accent-secondary">
                  UPLOADING TO PRIVATE STORAGE BUCKET...
                </span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-background-secondary">
                <div
                  className="h-full bg-forge-gradient transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2.5 border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              disabled={uploadProgress !== null}
              onClick={() => setUploadDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="gradient"
              isLoading={uploadProgress !== null}
              disabled={!uploadFile}
            >
              <UploadCloud className="h-4 w-4" />
              Upload &amp; Index
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Add To Collection Modal */}
      <Dialog
        open={addToCollectionDialogOpen}
        onOpenChange={setAddToCollectionDialogOpen}
        title="Add Selected Assets to Collection"
        description="Curate selected assets into a collection without duplicating storage objects."
        maxWidth="sm"
      >
        <div className="space-y-4 pt-2">
          <div>
            <Label htmlFor="bulkColSelect">Select Destination Collection</Label>
            <Select
              id="bulkColSelect"
              value={bulkCollectionId}
              onChange={(e) => setBulkCollectionId(e.target.value)}
            >
              <option value="">Choose a collection...</option>
              {availableCollections.map((col) => (
                <option key={col.id} value={col.id}>
                  {col.name} ({col.assetIds.length} assets)
                </option>
              ))}
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setAddToCollectionDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!bulkCollectionId || bulkActionLoading}
              isLoading={bulkActionLoading}
              onClick={handleBulkAddToCollection}
            >
              Add {selectedIds.length} Asset(s)
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Deletion Confirmation Modal */}
      <ConfirmDialog
        open={Boolean(deleteConfirmIds)}
        onOpenChange={(open) => !open && setDeleteConfirmIds(null)}
        title={
          deleteConfirmIds?.length === 1
            ? "Delete Studio Asset"
            : `Delete ${deleteConfirmIds?.length} Selected Assets`
        }
        description="Are you sure you want to permanently delete this asset and its underlying storage object? Any linked deliverables or collections will be unlinked. This action cannot be undone."
        confirmLabel="Permanently Delete"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

export default function AssetLibraryPage() {
  return (
    <React.Suspense
      fallback={
        <div className="space-y-6">
          <Skeleton className="h-20 w-full" />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      }
    >
      <AssetLibraryContent />
    </React.Suspense>
  );
}
