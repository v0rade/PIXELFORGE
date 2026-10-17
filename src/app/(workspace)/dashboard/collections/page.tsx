"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Edit2,
  FolderKanban,
  FolderOpen,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import type { AssetCategory, AssetCollection, CreativeAsset, Visibility } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { EmptyState, Skeleton } from "@/components/ui/skeleton";
import { VisibilityBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/utils/format";
import { ALLOWED_ASSET_CATEGORIES } from "@/lib/validation/assets";

export default function WorkspaceCollectionsPage() {
  const { toast } = useToast();

  const [collections, setCollections] = React.useState<AssetCollection[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Create & Edit State
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingCollection, setEditingCollection] = React.useState<AssetCollection | null>(null);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [category, setCategory] = React.useState<AssetCategory>("Brand Identity");
  const [visibility, setVisibility] = React.useState<Visibility>("private");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Deletion State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [collectionToDelete, setCollectionToDelete] = React.useState<AssetCollection | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // View Collection Assets State
  const [inspectCollection, setInspectCollection] = React.useState<AssetCollection | null>(null);
  const [collectionAssets, setCollectionAssets] = React.useState<CreativeAsset[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = React.useState(false);

  // Fetch collections
  const loadCollections = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/collections");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error?.message || "Failed to load collections.");
      }

      setCollections(data.data.collections || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error connecting to collections service.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  // Handle open create/edit modal
  const handleOpenCreate = () => {
    setEditingCollection(null);
    setName("");
    setDescription("");
    setCategory("Brand Identity");
    setVisibility("private");
    setDialogOpen(true);
  };

  const handleOpenEdit = (col: AssetCollection) => {
    setEditingCollection(col);
    setName(col.name);
    setDescription(col.description);
    setCategory((col.category as AssetCategory) || "Brand Identity");
    setVisibility(col.visibility);
    setDialogOpen(true);
  };

  // Submit Create or Edit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);

    try {
      if (editingCollection) {
        const res = await fetch(`/api/v1/collections/${editingCollection.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim(),
            category,
            visibility,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data?.error?.message || "Failed to update collection.");

        const updated = data.data.collection;
        setCollections((prev) =>
          prev.map((c) => (c.id === updated.id ? updated : c))
        );

        toast({
          title: "Collection updated",
          description: `Modifications to ${updated.name} have been saved.`,
          variant: "success",
        });
      } else {
        const res = await fetch("/api/v1/collections", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim(),
            category,
            visibility,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data?.error?.message || "Failed to create collection.");

        const created = data.data.collection;
        setCollections((prev) => [created, ...prev]);

        toast({
          title: "Collection created",
          description: `${created.name} is now available in your workspace.`,
          variant: "success",
        });
      }

      setDialogOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Operation failed.";
      toast({
        title: "Error",
        description: msg,
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Collection
  const handleOpenDelete = (col: AssetCollection) => {
    setCollectionToDelete(col);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!collectionToDelete) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/v1/collections/${collectionToDelete.id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data?.error?.message || "Failed to delete collection.");

      setCollections((prev) => prev.filter((c) => c.id !== collectionToDelete.id));
      setDeleteConfirmOpen(false);
      setCollectionToDelete(null);

      toast({
        title: "Collection deleted",
        description: "The collection has been deleted. Individual assets remain in your library.",
        variant: "success",
      });
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

  // Inspect Collection Assets
  const handleInspectCollection = async (col: AssetCollection) => {
    setInspectCollection(col);
    setIsLoadingAssets(true);

    try {
      const res = await fetch(`/api/v1/assets?collectionId=${col.id}&limit=50`);
      const data = await res.json();
      if (res.ok) {
        setCollectionAssets(data.data.assets || []);
      }
    } catch {
      setCollectionAssets([]);
    } finally {
      setIsLoadingAssets(false);
    }
  };

  // Remove asset from collection
  const handleRemoveAssetFromCollection = async (assetId: string) => {
    if (!inspectCollection) return;

    try {
      const res = await fetch(`/api/v1/collections/${inspectCollection.id}/assets`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to remove asset from collection.");

      setCollectionAssets((prev) => prev.filter((a) => a.id !== assetId));
      setCollections((prev) =>
        prev.map((c) =>
          c.id === inspectCollection.id
            ? { ...c, assetIds: c.assetIds.filter((id) => id !== assetId) }
            : c
        )
      );

      toast({
        title: "Asset removed from collection",
        description: "The asset was unlinked from this collection.",
        variant: "info",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Action failed.";
      toast({
        title: "Failed",
        description: msg,
        variant: "error",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-border pb-6 sm:flex-row sm:items-center">
        <div>
          <Badge variant="cyan">WORKSPACE // COLLECTIONS</Badge>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Curated Asset Collections
          </h1>
          <p className="mt-1 text-sm text-foreground-muted">
            Group brand kits, social templates, and deliverables into reusable collections without duplicating storage objects.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadCollections}
            disabled={isLoading}
            className="px-2.5"
            title="Refresh collections"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>

          <Button variant="gradient" onClick={handleOpenCreate}>
            <Plus className="h-4 w-4" />
            New Collection
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && !isLoading && (
        <Card className="p-6 border-status-error/40 bg-status-error/5 text-center">
          <p className="text-sm font-semibold text-status-error">{error}</p>
          <p className="mt-1 text-xs text-foreground-muted">
            Could not fetch collections from the database.
          </p>
          <Button variant="outline" size="sm" onClick={loadCollections} className="mt-4">
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Retry
          </Button>
        </Card>
      )}

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="overflow-hidden p-0 space-y-4">
              <Skeleton className="aspect-[16/9] w-full" />
              <div className="p-5 space-y-3">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-3 w-full" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && collections.length === 0 && (
        <EmptyState
          icon={<FolderOpen className="h-6 w-6" />}
          title="No collections created yet"
          description="Collections allow you to group related design assets across multiple projects or themes without duplicating files."
          action={
            <Button variant="primary" onClick={handleOpenCreate}>
              <Plus className="h-4 w-4" />
              Create First Collection
            </Button>
          }
        />
      )}

      {/* Collections Grid */}
      {!isLoading && !error && collections.length > 0 && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {collections.map((col) => (
            <Card
              key={col.id}
              interactive
              className="overflow-hidden flex flex-col justify-between group border-border bg-background-card"
            >
              <div>
                <div
                  className="relative aspect-[16/9] w-full bg-background border-b border-border cursor-pointer overflow-hidden"
                  onClick={() => handleInspectCollection(col)}
                >
                  <Image
                    src={col.coverUrl || "/placeholders/asset-brand-system.svg"}
                    alt={col.name}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                  <div className="absolute left-3 top-3">
                    <VisibilityBadge visibility={col.visibility} />
                  </div>
                  <div className="absolute right-3 top-3">
                    <Badge variant="mono">{col.assetIds.length} ASSETS</Badge>
                  </div>
                </div>

                <div className="p-5">
                  <div className="flex items-center justify-between text-xs font-mono text-accent-primary">
                    <div className="flex items-center gap-1.5">
                      <FolderKanban className="h-3.5 w-3.5" />
                      <span>{col.category}</span>
                    </div>
                  </div>

                  <h2
                    className="mt-1.5 text-base font-bold text-foreground hover:text-accent-primary transition-colors cursor-pointer"
                    onClick={() => handleInspectCollection(col)}
                  >
                    {col.name}
                  </h2>

                  <p className="mt-1 text-xs text-foreground-muted leading-relaxed line-clamp-2">
                    {col.description || "No description provided."}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-border px-5 py-3 text-xs bg-background-secondary/30">
                <span className="font-mono text-[10px] text-foreground-muted">
                  Updated {formatDate(col.updatedAt)}
                </span>

                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleInspectCollection(col)}
                  >
                    View
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleOpenEdit(col)}
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleOpenDelete(col)}
                    className="text-status-error hover:bg-status-error/10 hover:text-status-error"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Collection Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editingCollection ? `Edit Collection: ${editingCollection.name}` : "Create Asset Collection"}
        description="Organize assets across campaigns, brands, and formats without duplicating files."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="colName">Collection Name *</Label>
            <Input
              id="colName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Q4 Presentation Graphics"
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="colCategory">Category</Label>
              <Select
                id="colCategory"
                value={category}
                onChange={(e) => setCategory(e.target.value as AssetCategory)}
              >
                {ALLOWED_ASSET_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label htmlFor="colVisibility">Visibility Policy</Label>
              <Select
                id="colVisibility"
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as Visibility)}
              >
                <option value="private">Private (Workspace Only)</option>
                <option value="public">Public (Allowed on Portfolio)</option>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="colDesc">Description</Label>
            <Textarea
              id="colDesc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the curation purpose, guidelines, or target deliverables..."
            />
          </div>

          <div className="flex justify-end gap-2.5 border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="gradient" isLoading={isSubmitting}>
              {editingCollection ? "Save Collection" : "Create Collection"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Inspect Collection Assets Dialog */}
      <Dialog
        open={Boolean(inspectCollection)}
        onOpenChange={(open) => !open && setInspectCollection(null)}
        title={inspectCollection?.name ?? "Collection Assets"}
        description={`Browsing ${collectionAssets.length} asset(s) organized in this collection.`}
        maxWidth="lg"
      >
        {inspectCollection && (
          <div className="space-y-4">
            {isLoadingAssets ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-[3/2] w-full rounded" />
                ))}
              </div>
            ) : collectionAssets.length === 0 ? (
              <div className="rounded-lg border border-border bg-background-secondary/50 p-6 text-center space-y-2">
                <p className="text-xs font-semibold text-foreground">
                  No assets currently in this collection.
                </p>
                <p className="text-xs text-foreground-muted">
                  Use the Asset Library to select artwork and choose &quot;Add to Collection&quot;.
                </p>
                <div className="pt-2">
                  <Link href="/dashboard/assets">
                    <Button variant="outline" size="sm">
                      Go to Asset Library
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 max-h-[480px] overflow-y-auto p-1">
                {collectionAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className="group relative overflow-hidden rounded-lg border border-border bg-background"
                  >
                    <div className="relative aspect-[3/2] w-full">
                      <Image
                        src={asset.previewUrl}
                        alt={asset.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="p-2.5 space-y-1">
                      <p className="font-semibold text-xs text-foreground truncate">
                        {asset.name}
                      </p>
                      <p className="font-mono text-[10px] text-foreground-muted truncate">
                        {asset.originalFilename}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveAssetFromCollection(asset.id)}
                      className="absolute right-1.5 top-1.5 rounded-full bg-black/70 p-1 text-status-error opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black"
                      title="Remove from collection"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Dialog>

      {/* Deletion Confirmation Modal */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title={`Delete Collection: ${collectionToDelete?.name ?? ""}`}
        description="Are you sure you want to delete this collection? Assets contained within this collection will NOT be deleted from your Asset Library. This action cannot be undone."
        confirmLabel="Delete Collection"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
