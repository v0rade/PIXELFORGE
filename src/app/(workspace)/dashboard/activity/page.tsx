"use client";

import * as React from "react";
import Link from "next/link";
import {
  Activity,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck,
  FileEdit,
  FolderGit2,
  Mail,
  RefreshCw,
  Search,
  UploadCloud,
  UserCheck,
} from "lucide-react";
import type { ActivityLogItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { formatTechnicalTimestamp } from "@/lib/utils/format";

type FilterTab =
  | "all"
  | "deliverables"
  | "projects"
  | "assets"
  | "collaboration"
  | "inquiries";

export default function WorkspaceActivityPage() {
  const { toast } = useToast();
  const [activities, setActivities] = React.useState<ActivityLogItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = React.useState("");

  const fetchActivities = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/activity?limit=100");
      const json = await res.json();
      if (res.ok && json.data?.activities) {
        setActivities(json.data.activities);
      }
    } catch (err: unknown) {
      toast({
        title: "Failed to load audit logs",
        description:
          err instanceof Error ? err.message : "Error connecting to server.",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const filteredActivities = activities.filter((act) => {
    // 1. Tab filter
    if (activeTab === "deliverables") {
      const deliverableEvents = [
        "deliverable_submitted",
        "deliverable_approved",
        "revisions_requested",
      ];
      if (!deliverableEvents.includes(act.eventType)) return false;
    } else if (activeTab === "projects") {
      const projectEvents = ["project_created", "project_updated"];
      if (!projectEvents.includes(act.eventType)) return false;
    } else if (activeTab === "assets") {
      if (act.eventType !== "asset_uploaded") return false;
    } else if (activeTab === "collaboration") {
      const collabEvents = [
        "client_invited",
        "member_joined",
        "invitation_revoked",
      ];
      if (!collabEvents.includes(act.eventType)) return false;
    } else if (activeTab === "inquiries") {
      if (act.eventType !== "contact_inquiry_received") return false;
    }

    // 2. Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchActor = act.actorName.toLowerCase().includes(q);
      const matchProject = act.projectTitle?.toLowerCase().includes(q);
      const matchEvent = act.eventType.toLowerCase().includes(q);
      return matchActor || matchProject || matchEvent;
    }

    return true;
  });

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case "deliverable_approved":
        return <CheckCircle2 className="h-4 w-4 text-status-success" />;
      case "revisions_requested":
        return <FileEdit className="h-4 w-4 text-status-warning" />;
      case "deliverable_submitted":
        return <FileCheck className="h-4 w-4 text-accent-primary" />;
      case "project_created":
      case "project_updated":
        return <FolderGit2 className="h-4 w-4 text-accent-secondary" />;
      case "asset_uploaded":
        return <UploadCloud className="h-4 w-4 text-accent-primary" />;
      case "member_joined":
      case "client_invited":
        return <UserCheck className="h-4 w-4 text-status-success" />;
      case "contact_inquiry_received":
        return <Mail className="h-4 w-4 text-accent-secondary" />;
      default:
        return <Activity className="h-4 w-4 text-foreground-muted" />;
    }
  };

  const formatEventSummary = (act: ActivityLogItem): string => {
    switch (act.eventType) {
      case "deliverable_submitted":
        return `Submitted deliverable for review`;
      case "deliverable_approved":
        return `Approved deliverable sign-off`;
      case "revisions_requested":
        return `Requested adjustments on deliverable`;
      case "project_created":
        return `Initialized new project workspace`;
      case "asset_uploaded":
        return `Uploaded new creative asset`;
      case "member_joined":
        return `Joined project collaboration team`;
      case "invitation_revoked":
        return `Revoked project invitation token`;
      case "contact_inquiry_received":
        return `Received commission inquiry`;
      default:
        return act.eventType.replace(/_/g, " ");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-border pb-6 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="primary">WORKSPACE // AUDIT LOGS</Badge>
            <Badge variant="mono">{filteredActivities.length} LOGGED</Badge>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            System Activity &amp; Audit Trail
          </h1>
          <p className="mt-1 text-sm text-foreground-muted">
            Immutable, timestamped record of project updates, deliverable
            submissions, client sign-offs, and contact inquiries.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchActivities}
          disabled={loading}
          title="Refresh activity logs"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh Audit Trail
        </Button>
      </div>

      {/* Filter Tabs and Search Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5 rounded-lg border border-border bg-background-secondary p-1">
          {(
            [
              { key: "all", label: "All Events" },
              { key: "deliverables", label: "Deliverables & Reviews" },
              { key: "projects", label: "Projects" },
              { key: "assets", label: "Assets" },
              { key: "collaboration", label: "Members" },
              { key: "inquiries", label: "Inquiries" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                activeTab === tab.key
                  ? "bg-accent-primary text-[#09090F] font-semibold shadow-sm"
                  : "text-foreground-muted hover:text-foreground hover:bg-background-elevated/60"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-foreground-muted" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by actor or project..."
            className="pl-8 text-xs"
          />
        </div>
      </div>

      {/* Activity Timeline List */}
      <div className="space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i} className="p-4 space-y-2">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-4 w-1/2" />
              </Card>
            ))}
          </div>
        ) : filteredActivities.length === 0 ? (
          <Card className="p-10 text-center border-dashed border-border/80 space-y-2">
            <Clock className="mx-auto h-8 w-8 text-foreground-muted mb-1" />
            <p className="text-sm font-semibold text-foreground">
              No matching activity logged
            </p>
            <p className="text-xs text-foreground-muted max-w-sm mx-auto">
              {searchQuery
                ? "No audit records matched your search query."
                : "Activity logs will accumulate as you create projects, upload assets, and collaborate with clients."}
            </p>
          </Card>
        ) : (
          filteredActivities.map((act) => (
            <Card
              key={act.id}
              className="p-4 transition-colors hover:border-accent-primary/40"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background-secondary shrink-0">
                    {getEventIcon(act.eventType)}
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-foreground text-sm">
                        {act.actorName}
                      </span>
                      <Badge
                        variant={act.actorRole === "client" ? "cyan" : "primary"}
                        className="text-[10px]"
                      >
                        {act.actorRole.toUpperCase()}
                      </Badge>
                      <span className="text-sm text-foreground">
                        {formatEventSummary(act)}
                      </span>
                      {act.projectTitle && act.projectId && (
                        <Link
                          href={`/dashboard/projects/${act.projectId}`}
                          className="inline-flex items-center gap-1 font-mono text-xs text-accent-secondary hover:underline"
                        >
                          {act.projectTitle}
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      )}
                    </div>

                    {act.metadata && Object.keys(act.metadata).length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-0.5 font-mono text-[11px] text-foreground-muted">
                        {Object.entries(act.metadata).map(([k, v]) => (
                          <span
                            key={k}
                            className="bg-background-secondary px-2 py-0.5 rounded border border-border/60"
                          >
                            {k}:{" "}
                            <span className="text-foreground">
                              {String(v)}
                            </span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="font-mono text-[11px] text-foreground-muted shrink-0 text-left sm:text-right">
                  {formatTechnicalTimestamp(act.createdAt)}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <div className="rounded-lg border border-border/70 bg-background-secondary/50 p-3.5 font-mono text-xs text-foreground-muted flex items-center justify-between">
        <span>SECURITY GUARANTEE: AUDIT LOGS ARE IMMUTABLE</span>
        <span className="text-status-success">RLS ENFORCED</span>
      </div>
    </div>
  );
}
