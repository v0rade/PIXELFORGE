"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import type { Asset } from "@/types";
import type { DetailedDeliverable } from "@/lib/collaboration/service";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

interface DeliverableSubmitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSuccess: (deliverable: DetailedDeliverable) => void;
}

export function DeliverableSubmitDialog({
  open,
  onOpenChange,
  projectId,
  onSuccess,
}: DeliverableSubmitDialogProps) {
  const { toast } = useToast();
  const [assets, setAssets] = React.useState<Asset[]>([]);
  const [selectedAssetId, setSelectedAssetId] = React.useState<string>("");
  const [versionNotes, setVersionNotes] = React.useState<string>("");
  const [reviewStatus, setReviewStatus] = React.useState<
    "submitted" | "draft"
  >("submitted");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;

    let isMounted = true;
    async function loadAssets() {
      try {
        const res = await fetch("/api/v1/assets?limit=50");
        const json = await res.json();
        if (res.ok && json.data?.items && isMounted) {
          setAssets(json.data.items);
          if (json.data.items.length > 0) {
            setSelectedAssetId(json.data.items[0].id);
          }
        }
      } catch {
        // graceful fallback
      }
    }

    loadAssets();
    return () => {
      isMounted = false;
    };
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetId) {
      toast({
        title: "Asset Required",
        description: "Please select an asset from your studio library to submit as a deliverable.",
        variant: "warning",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/deliverables`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: selectedAssetId,
          versionNotes: versionNotes.trim(),
          reviewStatus,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error?.message || "Failed to submit deliverable.");
      }

      toast({
        title: "Deliverable Version Submitted",
        description: `Version v${json.data.versionNumber} is now ready for review.`,
        variant: "success",
      });

      onSuccess(json.data);
      onOpenChange(false);
      setVersionNotes("");
    } catch (err: unknown) {
      toast({
        title: "Submission Failed",
        description:
          err instanceof Error ? err.message : "Error submitting deliverable.",
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Submit Deliverable Version"
      description="Attach an asset from your studio repository and initiate a client review thread."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="delAsset">Studio Asset *</Label>
          {assets.length === 0 ? (
            <div className="rounded-md border border-border bg-background-secondary p-3 text-xs text-foreground-muted">
              Loading available studio assets...
            </div>
          ) : (
            <Select
              id="delAsset"
              value={selectedAssetId}
              onChange={(e) => setSelectedAssetId(e.target.value)}
            >
              {assets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.name} ({asset.format?.toUpperCase() || "ASSET"} -{" "}
                  {Math.round(asset.fileSize / 1024)} KB)
                </option>
              ))}
            </Select>
          )}
        </div>

        <div>
          <Label htmlFor="delNotes">Version Changelog / Notes</Label>
          <Input
            id="delNotes"
            value={versionNotes}
            onChange={(e) => setVersionNotes(e.target.value)}
            placeholder="e.g. Revised optical balance, P3 color profile compliance."
          />
        </div>

        <div>
          <Label htmlFor="delStatus">Initial Review State</Label>
          <Select
            id="delStatus"
            value={reviewStatus}
            onChange={(e) =>
              setReviewStatus(e.target.value as "submitted" | "draft")
            }
          >
            <option value="submitted">
              Submitted (Ready for Client Review &amp; Sign-off)
            </option>
            <option value="draft">Draft (Internal Working Version)</option>
          </Select>
        </div>

        <div className="flex justify-end gap-2.5 border-t border-border pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" variant="gradient" disabled={isSubmitting}>
            {isSubmitting ? (
              "Submitting..."
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Submit New Version
              </>
            )}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
