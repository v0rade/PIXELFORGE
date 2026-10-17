"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Activity,
  ArrowUpRight,
  Briefcase,
  Clock,
  FolderPlus,
  HardDrive,
  Image as ImageIcon,
  Plus,
  RefreshCw,
  Sparkles,
  Upload,
  Users,
} from "lucide-react";
import {
  DEMO_ACTIVITY_EVENTS,
  DEMO_ASSETS,
  DEMO_DELIVERABLES,
} from "@/lib/demo/data";
import type { DashboardSummaryData } from "@/lib/projects/service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton, EmptyState } from "@/components/ui/skeleton";
import {
  PriorityBadge,
  ProjectStatusBadge,
  ReviewStatusBadge,
  VisibilityBadge,
} from "@/components/shared/status-badge";
import {
  formatDate,
  formatFileSize,
  formatTechnicalTimestamp,
} from "@/lib/utils/format";

export default function DashboardOverviewPage() {
  const [summary, setSummary] = React.useState<DashboardSummaryData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [showOnboardingPreview, setShowOnboardingPreview] = React.useState(false);

  const fetchSummary = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/dashboard/summary");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error?.message || "Failed to load dashboard telemetry.");
      }

      setSummary(data.data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error connecting to telemetry service.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const metrics = summary?.metrics ?? {
    totalProjects: 0,
    publishedProjects: 0,
    inReviewProjects: 0,
    inProgressProjects: 0,
    completedProjects: 0,
    draftProjects: 0,
    archivedProjects: 0,
    totalAssets: 0,
    totalStorageBytes: 0,
    activeClients: 0,
    pendingRevisions: 0,
  };

  const statusCounts = summary?.statusCounts ?? {
    completed: 0,
    in_review: 0,
    in_progress: 0,
    draft: 0,
  };

  const recentProjects = summary?.recentProjects ?? [];

  // If user is previewing empty state or no projects exist
  const isEmptyState = showOnboardingPreview || (!isLoading && metrics.totalProjects === 0);

  return (
    <div className="space-y-8">
      {/* Page Header & Quick Actions */}
      <div className="flex flex-col justify-between gap-4 border-b border-border pb-6 lg:flex-row lg:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="primary">STUDIO TELEMETRY // WORKSPACE</Badge>
            <span className="font-mono text-xs text-foreground-muted">
              POSTGRESQL &bull; RLS SECURED
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Creative Studio Overview
          </h1>
          <p className="mt-1 text-sm text-foreground-muted">
            Monitor active visual systems, asset repository usage, and pending
            client deliverable reviews.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowOnboardingPreview((prev) => !prev)}
            className="border border-border font-mono text-xs"
          >
            {showOnboardingPreview
              ? "Exit Empty Preview"
              : "Preview Empty State"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchSummary}
            disabled={isLoading}
            className="px-2.5"
            title="Refresh dashboard"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
          <Link href="/dashboard/assets">
            <Button variant="outline" size="sm">
              <Upload className="h-4 w-4 text-accent-secondary" />
              Upload Asset
            </Button>
          </Link>
          <Link href="/dashboard/projects">
            <Button variant="primary" size="sm">
              <Plus className="h-4 w-4" />
              New Project
            </Button>
          </Link>
        </div>
      </div>

      {/* Error State */}
      {error && !isLoading && (
        <Card className="p-6 border-status-error/40 bg-status-error/5 text-center">
          <p className="text-sm font-semibold text-status-error">{error}</p>
          <p className="mt-1 text-xs text-foreground-muted">
            Could not fetch studio telemetry. Please check database connectivity.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSummary}
            className="mt-4"
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Retry
          </Button>
        </Card>
      )}

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="p-4 space-y-3">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-8 w-12" />
                <Skeleton className="h-3 w-20" />
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <Card className="lg:col-span-7 p-6 space-y-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-12 w-full rounded" />
              <Skeleton className="h-16 w-full rounded" />
              <Skeleton className="h-16 w-full rounded" />
            </Card>
            <Card className="lg:col-span-5 p-6 space-y-4">
              <Skeleton className="h-6 w-36" />
              <Skeleton className="h-24 w-full rounded" />
              <Skeleton className="h-24 w-full rounded" />
            </Card>
          </div>
        </div>
      )}

      {/* Empty Account State */}
      {!isLoading && !error && isEmptyState ? (
        <EmptyState
          icon={<Sparkles className="h-6 w-6" />}
          title="Welcome to Your PIXELFORGE Creative Studio"
          description="Your workspace is currently empty. Start by initializing your first design project or uploading artwork to your private creative-assets bucket."
          action={
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link href="/dashboard/projects">
                <Button variant="gradient">
                  <FolderPlus className="h-4 w-4" />
                  Create First Project
                </Button>
              </Link>
              <Link href="/dashboard/assets">
                <Button variant="outline">
                  <Upload className="h-4 w-4 text-accent-secondary" />
                  Upload First Asset
                </Button>
              </Link>
            </div>
          }
        />
      ) : !isLoading && !error ? (
        <>
          {/* KPI Metric Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <Card className="p-4">
              <div className="flex items-center justify-between text-foreground-muted">
                <span className="font-mono text-[11px] uppercase tracking-wider">
                  Total Projects
                </span>
                <Briefcase className="h-4 w-4 text-accent-primary" />
              </div>
              <p className="mt-3 font-mono text-2xl font-bold text-foreground">
                {metrics.totalProjects}
              </p>
              <p className="mt-1 text-xs text-foreground-muted">
                {metrics.publishedProjects} published publicly
              </p>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between text-foreground-muted">
                <span className="font-mono text-[11px] uppercase tracking-wider">
                  Published
                </span>
                <ArrowUpRight className="h-4 w-4 text-status-success" />
              </div>
              <p className="mt-3 font-mono text-2xl font-bold text-status-success">
                {metrics.publishedProjects}
              </p>
              <p className="mt-1 text-xs text-foreground-muted">
                Live on /portfolio
              </p>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between text-foreground-muted">
                <span className="font-mono text-[11px] uppercase tracking-wider">
                  Total Assets
                </span>
                <ImageIcon className="h-4 w-4 text-accent-secondary" />
              </div>
              <p className="mt-3 font-mono text-2xl font-bold text-foreground">
                {metrics.totalAssets}
              </p>
              <p className="mt-1 text-xs text-foreground-muted">
                SVG, PNG, WEBP, PDF, ZIP
              </p>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between text-foreground-muted">
                <span className="font-mono text-[11px] uppercase tracking-wider">
                  Storage Usage
                </span>
                <HardDrive className="h-4 w-4 text-accent-primary" />
              </div>
              <p className="mt-3 font-mono text-2xl font-bold text-accent-secondary">
                {formatFileSize(metrics.totalStorageBytes)}
              </p>
              <p className="mt-1 text-xs text-foreground-muted">
                of 1.0 GB Free Tier quota
              </p>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between text-foreground-muted">
                <span className="font-mono text-[11px] uppercase tracking-wider">
                  Active Clients
                </span>
                <Users className="h-4 w-4 text-accent-primary" />
              </div>
              <p className="mt-3 font-mono text-2xl font-bold text-foreground">
                {metrics.activeClients}
              </p>
              <p className="mt-1 text-xs text-foreground-muted">
                Authorized project members
              </p>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between text-foreground-muted">
                <span className="font-mono text-[11px] uppercase tracking-wider">
                  Pending Revisions
                </span>
                <Clock className="h-4 w-4 text-status-warning" />
              </div>
              <p className="mt-3 font-mono text-2xl font-bold text-status-warning">
                {metrics.pendingRevisions}
              </p>
              <p className="mt-1 text-xs text-foreground-muted">
                Awaiting review or updates
              </p>
            </Card>
          </div>

          {/* Project Status Distribution & Pending Client Actions */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Recently Updated Projects + Status Distribution */}
            <Card className="lg:col-span-7 flex flex-col justify-between">
              <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
                <div>
                  <CardTitle>Recently Updated Projects</CardTitle>
                  <CardDescription>
                    Status distribution and deadline tracking
                  </CardDescription>
                </div>
                <Link href="/dashboard/projects">
                  <Button variant="ghost" size="sm">
                    View All
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </CardHeader>

              <CardContent className="pt-5 space-y-5">
                {/* Status Distribution Bar */}
                <div className="rounded-lg border border-border bg-background-secondary p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-foreground-muted">
                      STATUS DISTRIBUTION
                    </span>
                    <span className="text-foreground">
                      {statusCounts.completed} Completed &bull;{" "}
                      {statusCounts.in_review} In Review &bull;{" "}
                      {statusCounts.in_progress} In Progress &bull;{" "}
                      {statusCounts.draft} Draft
                    </span>
                  </div>
                  <div className="flex h-2 w-full overflow-hidden rounded-full bg-background">
                    <div
                      className="bg-status-success transition-all duration-300"
                      style={{
                        width: metrics.totalProjects
                          ? `${(statusCounts.completed / metrics.totalProjects) * 100}%`
                          : "0%",
                      }}
                      title={`Completed: ${statusCounts.completed}`}
                    />
                    <div
                      className="bg-status-warning transition-all duration-300"
                      style={{
                        width: metrics.totalProjects
                          ? `${(statusCounts.in_review / metrics.totalProjects) * 100}%`
                          : "0%",
                      }}
                      title={`In Review: ${statusCounts.in_review}`}
                    />
                    <div
                      className="bg-accent-secondary transition-all duration-300"
                      style={{
                        width: metrics.totalProjects
                          ? `${(statusCounts.in_progress / metrics.totalProjects) * 100}%`
                          : "0%",
                      }}
                      title={`In Progress: ${statusCounts.in_progress}`}
                    />
                    <div
                      className="bg-foreground-muted transition-all duration-300"
                      style={{
                        width: metrics.totalProjects
                          ? `${(statusCounts.draft / metrics.totalProjects) * 100}%`
                          : "0%",
                      }}
                      title={`Draft: ${statusCounts.draft}`}
                    />
                  </div>
                </div>

                {/* Project Rows */}
                <div className="divide-y divide-border">
                  {recentProjects.length === 0 ? (
                    <p className="py-4 text-center text-xs text-foreground-muted">
                      No projects found.
                    </p>
                  ) : (
                    recentProjects.map((project) => (
                      <div
                        key={project.id}
                        className="flex flex-col justify-between gap-3 py-3.5 sm:flex-row sm:items-center"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/dashboard/projects/${project.id}`}
                              className="text-sm font-semibold text-foreground hover:text-accent-primary truncate"
                            >
                              {project.title}
                            </Link>
                            <VisibilityBadge visibility={project.visibility} />
                          </div>
                          <p className="mt-0.5 font-mono text-xs text-foreground-muted">
                            {project.clientName || "Studio Concept"} &bull; Due{" "}
                            {formatDate(project.dueDate)}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <PriorityBadge priority={project.priority} />
                          <ProjectStatusBadge status={project.status} />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Pending Client Actions & Deliverables */}
            <Card className="lg:col-span-5 flex flex-col justify-between">
              <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
                <div>
                  <CardTitle>Deliverable Reviews</CardTitle>
                  <CardDescription>
                    Versioned client sign-offs and revision requests
                  </CardDescription>
                </div>
                <Link href="/dashboard/clients">
                  <Button variant="ghost" size="sm">
                    Client Portal
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </CardHeader>

              <CardContent className="pt-5 space-y-3.5">
                {DEMO_DELIVERABLES.map((del) => (
                  <div
                    key={del.id}
                    className="rounded-lg border border-border bg-background-secondary/70 p-3.5 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-semibold text-accent-primary">
                        v{del.versionNumber} &bull; {del.projectTitle}
                      </span>
                      <ReviewStatusBadge status={del.reviewStatus} />
                    </div>
                    <p className="text-xs font-medium text-foreground">
                      {del.assetName}
                    </p>
                    <p className="text-xs text-foreground-muted">
                      {del.commentSummary}
                    </p>
                    <p className="font-mono text-[10px] text-foreground-muted">
                      SUBMITTED: {formatTechnicalTimestamp(del.submittedAt)}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Recent Asset Uploads & Activity Feed */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Recent Asset Uploads */}
            <Card className="lg:col-span-7">
              <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
                <div>
                  <CardTitle>Recent Asset Uploads</CardTitle>
                  <CardDescription>
                    Latest files indexed in private storage bucket
                  </CardDescription>
                </div>
                <Link href="/dashboard/assets">
                  <Button variant="outline" size="sm">
                    Open Asset Library
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </CardHeader>

              <CardContent className="pt-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {DEMO_ASSETS.slice(0, 4).map((asset) => (
                    <Link
                      key={asset.id}
                      href="/dashboard/assets"
                      className="group flex items-center gap-3.5 rounded-lg border border-border bg-background-secondary/60 p-3 hover:border-accent-primary/40 transition-colors"
                    >
                      <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded border border-border bg-background">
                        <Image
                          src={asset.previewUrl}
                          alt={asset.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <Badge variant="mono">{asset.format}</Badge>
                          <span className="font-mono text-[11px] text-foreground-muted">
                            {formatFileSize(asset.fileSize)}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-xs font-semibold text-foreground group-hover:text-accent-primary">
                          {asset.name}
                        </p>
                        <p className="font-mono text-[10px] text-foreground-muted truncate">
                          {asset.originalFilename}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Studio Activity */}
            <Card className="lg:col-span-5">
              <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
                <div>
                  <CardTitle>Recent Studio Activity</CardTitle>
                  <CardDescription>
                    Immutable audit trail of workspace events
                  </CardDescription>
                </div>
                <Link href="/dashboard/activity">
                  <Button variant="ghost" size="sm">
                    <Activity className="h-3.5 w-3.5" />
                    Full Log
                  </Button>
                </Link>
              </CardHeader>

              <CardContent className="pt-5 space-y-3">
                {DEMO_ACTIVITY_EVENTS.slice(0, 4).map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 border-b border-border pb-3 last:border-0 last:pb-0"
                  >
                    <div className="mt-1 h-2 w-2 rounded-full bg-accent-secondary shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-foreground">
                        {event.summary}
                      </p>
                      <p className="mt-0.5 text-xs text-foreground-muted">
                        {event.detail}
                      </p>
                      <p className="mt-1 font-mono text-[10px] text-foreground-muted">
                        {event.actorName} ({event.actorRole.toUpperCase()}) &bull;{" "}
                        {formatTechnicalTimestamp(event.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
