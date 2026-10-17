"use client";

import * as React from "react";
import { Scale } from "lucide-react";
import type { DetailedDeliverable } from "@/lib/collaboration/service";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ReviewStatusBadge } from "@/components/shared/status-badge";
import { formatTechnicalTimestamp } from "@/lib/utils/format";

interface ComparisonResult {
  versionA: DetailedDeliverable;
  versionB: DetailedDeliverable;
  comparison: {
    statusDifference: boolean;
    fileSizeDelta: number;
    versionJump: number;
  };
}

interface DeliverableCompareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deliverables: DetailedDeliverable[];
}

export function DeliverableCompareDialog({
  open,
  onOpenChange,
  deliverables,
}: DeliverableCompareDialogProps) {
  const [v1Id, setV1Id] = React.useState<string>("");
  const [v2Id, setV2Id] = React.useState<string>("");
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<ComparisonResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open && deliverables.length >= 2) {
      if (!v1Id || !v2Id) {
        setV1Id(deliverables[deliverables.length - 1].id);
        setV2Id(deliverables[0].id);
      }
    }
  }, [open, deliverables, v1Id, v2Id]);

  const runComparison = React.useCallback(async (idA: string, idB: string) => {
    if (!idA || !idB || idA === idB) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/v1/deliverables/compare?v1=${encodeURIComponent(
          idA
        )}&v2=${encodeURIComponent(idB)}`
      );
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error?.message || "Failed to compare versions.");
      }
      setResult(json.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error executing comparison.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (open && v1Id && v2Id && v1Id !== v2Id) {
      runComparison(v1Id, v2Id);
    }
  }, [open, v1Id, v2Id, runComparison]);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Deliverable Version Comparison Matrix"
      description="Compare metadata, review statuses, and notes between two deliverable iterations."
      maxWidth="2xl"
    >
      <div className="space-y-6">
        {/* Version Pickers */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 bg-background-secondary p-4 rounded-lg border border-border">
          <div>
            <label
              htmlFor="compV1"
              className="block font-mono text-xs uppercase tracking-wider text-foreground-muted mb-1.5"
            >
              Base Iteration (Version A)
            </label>
            <Select
              id="compV1"
              value={v1Id}
              onChange={(e) => setV1Id(e.target.value)}
            >
              {deliverables.map((d) => (
                <option key={`a-${d.id}`} value={d.id}>
                  v{d.versionNumber} — {d.assetName} ({d.reviewStatus})
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label
              htmlFor="compV2"
              className="block font-mono text-xs uppercase tracking-wider text-foreground-muted mb-1.5"
            >
              Comparison Iteration (Version B)
            </label>
            <Select
              id="compV2"
              value={v2Id}
              onChange={(e) => setV2Id(e.target.value)}
            >
              {deliverables.map((d) => (
                <option key={`b-${d.id}`} value={d.id}>
                  v{d.versionNumber} — {d.assetName} ({d.reviewStatus})
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* Comparison Content */}
        {loading ? (
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : error ? (
          <div className="p-4 rounded-md border border-status-error/30 bg-status-error/10 text-xs text-status-error text-center">
            {error}
          </div>
        ) : result ? (
          <div className="space-y-4">
            {/* Diff Summary Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background-card p-3 font-mono text-xs">
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-accent-primary" />
                <span className="text-foreground-muted">VERSION DELTA:</span>
                <span className="font-semibold text-foreground">
                  +{result.comparison.versionJump} iteration(s)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-foreground-muted">STATUS TRANSITION:</span>
                <Badge
                  variant={
                    result.comparison.statusDifference ? "cyan" : "outline"
                  }
                >
                  {result.comparison.statusDifference
                    ? "STATUS CHANGED"
                    : "SAME STATUS"}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-foreground-muted">PAYLOAD DELTA:</span>
                <span
                  className={
                    result.comparison.fileSizeDelta > 0
                      ? "text-status-warning"
                      : "text-status-success"
                  }
                >
                  {result.comparison.fileSizeDelta >= 0 ? "+" : ""}
                  {Math.round(result.comparison.fileSizeDelta / 1024)} KB
                </span>
              </div>
            </div>

            {/* Side-by-Side Cards */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Version A Card */}
              <Card className="p-4 space-y-3 border-border/80">
                <div className="flex items-center justify-between border-b border-border pb-2.5">
                  <Badge variant="primary">
                    VERSION {result.versionA.versionNumber}
                  </Badge>
                  <ReviewStatusBadge status={result.versionA.reviewStatus} />
                </div>
                <div className="space-y-1.5 text-xs">
                  <p className="font-semibold text-foreground">
                    {result.versionA.assetName}
                  </p>
                  <div className="font-mono text-foreground-muted text-[11px] space-y-0.5">
                    <p>Format: {result.versionA.assetDetails?.format || "SVG"}</p>
                    <p>
                      Payload:{" "}
                      {Math.round(
                        (result.versionA.assetDetails?.fileSize || 0) / 1024
                      )}{" "}
                      KB
                    </p>
                    <p>
                      Submitted:{" "}
                      {formatTechnicalTimestamp(result.versionA.submittedAt)}
                    </p>
                  </div>
                </div>
                <div className="border-t border-border/60 pt-2 text-xs">
                  <p className="font-mono text-[11px] text-foreground-muted mb-1">
                    SUBMISSION NOTES:
                  </p>
                  <p className="text-foreground-muted bg-background-secondary p-2.5 rounded text-xs leading-relaxed">
                    {result.versionA.commentSummary || "No changelog notes provided."}
                  </p>
                </div>
              </Card>

              {/* Version B Card */}
              <Card className="p-4 space-y-3 border-accent-secondary/40 bg-background-card">
                <div className="flex items-center justify-between border-b border-border pb-2.5">
                  <Badge variant="cyan">
                    VERSION {result.versionB.versionNumber}
                  </Badge>
                  <ReviewStatusBadge status={result.versionB.reviewStatus} />
                </div>
                <div className="space-y-1.5 text-xs">
                  <p className="font-semibold text-foreground">
                    {result.versionB.assetName}
                  </p>
                  <div className="font-mono text-foreground-muted text-[11px] space-y-0.5">
                    <p>Format: {result.versionB.assetDetails?.format || "SVG"}</p>
                    <p>
                      Payload:{" "}
                      {Math.round(
                        (result.versionB.assetDetails?.fileSize || 0) / 1024
                      )}{" "}
                      KB
                    </p>
                    <p>
                      Submitted:{" "}
                      {formatTechnicalTimestamp(result.versionB.submittedAt)}
                    </p>
                  </div>
                </div>
                <div className="border-t border-border/60 pt-2 text-xs">
                  <p className="font-mono text-[11px] text-foreground-muted mb-1">
                    SUBMISSION NOTES:
                  </p>
                  <p className="text-foreground-muted bg-background-secondary p-2.5 rounded text-xs leading-relaxed">
                    {result.versionB.commentSummary || "No changelog notes provided."}
                  </p>
                </div>
              </Card>
            </div>
          </div>
        ) : (
          <p className="text-xs text-foreground-muted text-center py-4">
            Select two distinct versions above to compare their specifications.
          </p>
        )}

        <div className="flex justify-end border-t border-border pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close Comparison
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
