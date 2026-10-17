"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  ArrowRightLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Edit2,
  ExternalLink,
  Layers,
  MessageSquare,
  Plus,
  Sparkles,
  Trash2,
  User,
  Wrench,
} from "lucide-react";
import type { Project } from "@/types";
import type { DetailedDeliverable } from "@/lib/collaboration/service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PriorityBadge,
  ProjectStatusBadge,
  ReviewStatusBadge,
  VisibilityBadge,
} from "@/components/shared/status-badge";
import { ProjectFormDialog } from "@/components/projects/project-form-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DeliverableSubmitDialog } from "@/components/collaboration/deliverable-submit-dialog";
import { DeliverableReviewDialog } from "@/components/collaboration/deliverable-review-dialog";
import { DeliverableCompareDialog } from "@/components/collaboration/deliverable-compare-dialog";
import { useToast } from "@/components/ui/toast";
import { formatDate, formatTechnicalTimestamp } from "@/lib/utils/format";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ProjectDetailPage({ params }: PageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const { toast } = useToast();

  const [project, setProject] = React.useState<Project | null>(null);
  const [deliverables, setDeliverables] = React.useState<DetailedDeliverable[]>([]);
  const [currentUserId, setCurrentUserId] = React.useState<string>("usr_owner_01");
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Dialog states
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [submitDeliverableOpen, setSubmitDeliverableOpen] = React.useState(false);
  const [reviewDeliverableOpen, setReviewDeliverableOpen] = React.useState(false);
  const [compareDeliverablesOpen, setCompareDeliverablesOpen] = React.useState(false);
  const [selectedDeliverable, setSelectedDeliverable] = React.useState<DetailedDeliverable | null>(null);

  const fetchProjectDetails = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [projRes, delRes, profRes] = await Promise.all([
        fetch(`/api/v1/projects/${id}`),
        fetch(`/api/v1/projects/${id}/deliverables`),
        fetch("/api/v1/profile"),
      ]);

      const [projData, delData, profData] = await Promise.all([
        projRes.json(),
        delRes.json(),
        profRes.json(),
      ]);

      if (!projRes.ok) {
        throw new Error(projData?.error?.message || "Failed to load project details.");
      }

      setProject(projData.data.project);

      if (delRes.ok && delData.data?.deliverables) {
        setDeliverables(delData.data.deliverables);
      }

      if (profRes.ok && profData.data?.profile?.id) {
        setCurrentUserId(profData.data.profile.id);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error loading project.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    fetchProjectDetails();
  }, [fetchProjectDetails]);

  const handleProjectUpdated = (updated: Project) => {
    setProject(updated);
    toast({
      title: "Project updated",
      description: `Project "${updated.title}" was saved.`,
      variant: "success",
    });
  };

  const handleToggleArchive = async () => {
    if (!project) return;
    try {
      const res = await fetch(`/api/v1/projects/${project.id}/archive`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error?.message || "Failed to toggle archive status.");
      }

      const updated = data.data.project as Project;
      setProject(updated);

      toast({
        title:
          updated.status === "archived" ? "Project archived" : "Project restored",
        description: `Project is now marked as ${updated.status}.`,
        variant: "info",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Archive operation failed.";
      toast({
        title: "Action failed",
        description: msg,
        variant: "error",
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!project) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/v1/projects/${project.id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error?.message || "Failed to delete project.");
      }

      toast({
        title: "Project deleted",
        description: `Project "${project.title}" has been permanently deleted.`,
        variant: "success",
      });

      router.push("/dashboard/projects");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete project.";
      toast({
        title: "Deletion failed",
        description: msg,
        variant: "error",
      });
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-40" />
        </div>
        <Card className="p-6 space-y-4">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="aspect-[21/9] w-full rounded-lg" />
        </Card>
      </div>
    );
  }

  if (error || !project) {
    return (
      <Card className="p-8 text-center space-y-4 border-status-error/40 bg-status-error/5 max-w-xl mx-auto my-12">
        <h2 className="text-xl font-bold text-foreground">Project Not Available</h2>
        <p className="text-xs text-foreground-muted">
          {error || "The requested project could not be found or you lack permission to view it."}
        </p>
        <div className="pt-2">
          <Link href="/dashboard/projects">
            <Button variant="outline">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Return to Projects
            </Button>
          </Link>
        </div>
      </Card>
    );
  }

  const isArchived = project.status === "archived";

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-xs">
          <Link
            href="/dashboard/projects"
            className="inline-flex items-center gap-1 text-foreground-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Projects
          </Link>
          <span className="text-foreground-muted">/</span>
          <span className="font-mono text-accent-secondary truncate max-w-xs sm:max-w-md">
            {project.title}
          </span>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {project.visibility === "public" && (
            <Link href={`/portfolio/${project.slug}`}>
              <Button variant="ghost" size="sm" className="text-accent-primary">
                <ExternalLink className="h-3.5 w-3.5" />
                Public Case Study
              </Button>
            </Link>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleToggleArchive}
          >
            {isArchived ? (
              <>
                <ArchiveRestore className="h-3.5 w-3.5 text-status-success" />
                Restore Project
              </>
            ) : (
              <>
                <Archive className="h-3.5 w-3.5 text-status-warning" />
                Archive Project
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setEditOpen(true)}
          >
            <Edit2 className="h-3.5 w-3.5 text-accent-primary" />
            Edit Project
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setDeleteOpen(true)}
            className="text-status-error hover:bg-status-error/10 hover:text-status-error"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      </div>

      {/* Main Project Header Card */}
      <Card className="overflow-hidden p-0 border-border bg-background-card">
        <div className="relative aspect-[21/8] min-h-[220px] w-full bg-background border-b border-border overflow-hidden">
          <Image
            src={project.coverUrl || "/placeholders/asset-brand-system.svg"}
            alt={project.title}
            fill
            priority
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background-card via-background-card/40 to-transparent" />

          {/* Badges in header overlay */}
          <div className="absolute left-6 bottom-6 right-6 flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="primary">{project.category}</Badge>
                <ProjectStatusBadge status={project.status} />
                <PriorityBadge priority={project.priority} />
                <VisibilityBadge visibility={project.visibility} />
                {project.featured && <Badge variant="cyan">Featured</Badge>}
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl drop-shadow-md">
                {project.title}
              </h1>

              {project.clientName && (
                <div className="flex items-center gap-1.5 text-xs font-mono text-accent-secondary">
                  <User className="h-3.5 w-3.5" />
                  <span>CLIENT / CONCEPT: {project.clientName}</span>
                </div>
              )}
            </div>

            <div className="rounded-md border border-border/80 bg-background/80 p-3 backdrop-blur font-mono text-xs text-foreground-muted space-y-1">
              <div>SLUG: /{project.slug}</div>
              <div>DUE: {formatDate(project.dueDate)}</div>
            </div>
          </div>
        </div>

        {/* Quick Metadata Bar */}
        <div className="grid grid-cols-2 divide-x divide-border border-b border-border sm:grid-cols-4 font-mono text-xs">
          <div className="p-4">
            <span className="text-foreground-muted block text-[10px] uppercase">
              Start Date
            </span>
            <span className="text-foreground font-semibold">
              {formatDate(project.startDate)}
            </span>
          </div>
          <div className="p-4">
            <span className="text-foreground-muted block text-[10px] uppercase">
              Target Due Date
            </span>
            <span className="text-accent-primary font-semibold">
              {formatDate(project.dueDate)}
            </span>
          </div>
          <div className="p-4">
            <span className="text-foreground-muted block text-[10px] uppercase">
              Deliverables
            </span>
            <span className="text-foreground font-semibold">
              {project.deliverablesCount} version
              {project.deliverablesCount === 1 ? "" : "s"}
            </span>
          </div>
          <div className="p-4">
            <span className="text-foreground-muted block text-[10px] uppercase">
              Pending Revisions
            </span>
            <span className="text-status-warning font-semibold">
              {project.pendingRevisionsCount} review cycle
              {project.pendingRevisionsCount === 1 ? "" : "s"}
            </span>
          </div>
        </div>
      </Card>

      {/* Two-Column Specification & Deliverables Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Brief, Description, and Deliverables */}
        <div className="space-y-6 lg:col-span-8">
          {/* Executive Summary */}
          <Card className="p-6 space-y-3">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Sparkles className="h-4 w-4 text-accent-primary" />
              <h2 className="text-base font-semibold text-foreground">
                Executive Summary
              </h2>
            </div>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {project.description || "No executive summary provided."}
            </p>
          </Card>

          {/* Creative Brief */}
          <Card className="p-6 space-y-3">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Layers className="h-4 w-4 text-accent-secondary" />
              <h2 className="text-base font-semibold text-foreground">
                Creative Brief &amp; Specifications
              </h2>
            </div>
            <p className="text-sm text-foreground-muted leading-relaxed whitespace-pre-wrap">
              {project.brief ||
                "No detailed brief specified. Use the 'Edit Project' button to document objectives and technical specifications."}
            </p>
          </Card>

          {/* Deliverables & Versions Section */}
          <Card className="p-6 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-status-success" />
                <h2 className="text-base font-semibold text-foreground">
                  Deliverable Versions &amp; Review Status
                </h2>
                <Badge variant="mono">
                  {deliverables.length} RECORDED
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                {deliverables.length >= 2 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCompareDeliverablesOpen(true)}
                  >
                    <ArrowRightLeft className="h-3.5 w-3.5" />
                    Compare Versions
                  </Button>
                )}
                <Button
                  variant="gradient"
                  size="sm"
                  onClick={() => setSubmitDeliverableOpen(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Submit New Version
                </Button>
              </div>
            </div>

            {deliverables.length === 0 ? (
              <div className="rounded-lg border border-border bg-background-secondary/50 p-6 text-center space-y-2">
                <Clock className="mx-auto h-5 w-5 text-foreground-muted" />
                <p className="text-xs font-semibold text-foreground">
                  No Deliverable Versions Attached Yet
                </p>
                <p className="text-xs text-foreground-muted">
                  Deliverable versions and client review threads will appear here once submitted.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => setSubmitDeliverableOpen(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Submit First Deliverable
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {deliverables.map((del) => (
                  <div
                    key={del.id}
                    className="rounded-lg border border-border bg-background-secondary/70 p-4 space-y-3 transition-colors hover:border-accent-primary/40"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="primary">v{del.versionNumber}</Badge>
                        <span className="text-sm font-semibold text-foreground">
                          {del.assetName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ReviewStatusBadge status={del.reviewStatus} />
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => {
                            setSelectedDeliverable(del);
                            setReviewDeliverableOpen(true);
                          }}
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          Review &amp; Sign-Off
                        </Button>
                      </div>
                    </div>

                    <p className="text-xs text-foreground-muted leading-relaxed">
                      {del.commentSummary}
                    </p>

                    <div className="flex flex-wrap items-center justify-between border-t border-border/80 pt-2 font-mono text-[11px] text-foreground-muted">
                      <span>Submitted by {del.submittedBy}</span>
                      <div className="flex items-center gap-3">
                        {del.comments && del.comments.length > 0 && (
                          <span className="text-accent-secondary">
                            {del.comments.length} comment(s)
                          </span>
                        )}
                        <span>{formatTechnicalTimestamp(del.submittedAt)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Tools, Timeline & System Attributes */}
        <div className="space-y-6 lg:col-span-4">
          {/* Tools & Production Stack */}
          <Card className="p-6 space-y-3">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Wrench className="h-4 w-4 text-accent-primary" />
              <h2 className="text-sm font-semibold text-foreground">
                Creative Tools &amp; Stack
              </h2>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {(project.tools && project.tools.length > 0
                ? project.tools
                : ["Figma", "Adobe Illustrator"]
              ).map((tool) => (
                <span
                  key={tool}
                  className="rounded-md border border-border bg-background-secondary px-2.5 py-1 font-mono text-xs text-foreground"
                >
                  {tool}
                </span>
              ))}
            </div>
          </Card>

          {/* System Audit & Timestamps */}
          <Card className="p-6 space-y-3 font-mono text-xs">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Calendar className="h-4 w-4 text-accent-secondary" />
              <h2 className="text-sm font-semibold text-foreground font-sans">
                Audit Trail &amp; Metadata
              </h2>
            </div>

            <div className="space-y-2.5 pt-1 text-foreground-muted">
              <div>
                <span className="block text-[10px] text-foreground-muted">
                  PROJECT ID
                </span>
                <span className="text-foreground text-[11px] break-all">
                  {project.id}
                </span>
              </div>

              <div>
                <span className="block text-[10px] text-foreground-muted">
                  CREATED AT
                </span>
                <span className="text-foreground text-[11px]">
                  {formatTechnicalTimestamp(project.createdAt)}
                </span>
              </div>

              <div>
                <span className="block text-[10px] text-foreground-muted">
                  LAST UPDATED
                </span>
                <span className="text-foreground text-[11px]">
                  {formatTechnicalTimestamp(project.updatedAt)}
                </span>
              </div>

              {project.publishedAt && (
                <div>
                  <span className="block text-[10px] text-foreground-muted">
                    PORTFOLIO PUBLISHED AT
                  </span>
                  <span className="text-accent-primary text-[11px]">
                    {formatTechnicalTimestamp(project.publishedAt)}
                  </span>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Edit Project Dialog */}
      <ProjectFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        project={project}
        onSuccess={handleProjectUpdated}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete Project: ${project.title}`}
        description="Are you sure you want to permanently delete this project? All associated metadata and revision records will be removed. This action cannot be undone."
        confirmLabel="Delete Project"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
      />

      {/* Deliverable Collaboration Dialogs */}
      <DeliverableSubmitDialog
        open={submitDeliverableOpen}
        onOpenChange={setSubmitDeliverableOpen}
        projectId={project.id}
        onSuccess={(newDel) => {
          setDeliverables((prev) => [newDel, ...prev]);
        }}
      />

      <DeliverableReviewDialog
        open={reviewDeliverableOpen}
        onOpenChange={setReviewDeliverableOpen}
        deliverable={selectedDeliverable}
        currentUserId={currentUserId}
        onDeliverableUpdated={(updated) => {
          setDeliverables((prev) =>
            prev.map((d) => (d.id === updated.id ? updated : d))
          );
          setSelectedDeliverable(updated);
        }}
      />

      <DeliverableCompareDialog
        open={compareDeliverablesOpen}
        onOpenChange={setCompareDeliverablesOpen}
        deliverables={deliverables}
      />
    </div>
  );
}
