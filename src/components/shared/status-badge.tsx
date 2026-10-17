import * as React from "react";
import { Badge } from "@/components/ui/badge";
import type {
  ProjectPriority,
  ProjectStatus,
  ReviewStatus,
  Visibility,
} from "@/types";

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  switch (status) {
    case "completed":
      return <Badge variant="success">Completed</Badge>;
    case "in_review":
      return <Badge variant="warning">In Review</Badge>;
    case "in_progress":
      return <Badge variant="cyan">In Progress</Badge>;
    case "draft":
      return <Badge variant="default">Draft</Badge>;
    case "archived":
      return <Badge variant="outline">Archived</Badge>;
  }
}

export function PriorityBadge({ priority }: { priority: ProjectPriority }) {
  switch (priority) {
    case "urgent":
      return <Badge variant="error">Urgent</Badge>;
    case "high":
      return <Badge variant="warning">High</Badge>;
    case "medium":
      return <Badge variant="primary">Medium</Badge>;
    case "low":
      return <Badge variant="outline">Low</Badge>;
  }
}

export function ReviewStatusBadge({ status }: { status: ReviewStatus }) {
  switch (status) {
    case "approved":
      return <Badge variant="success">Approved</Badge>;
    case "changes_requested":
      return <Badge variant="error">Revision Requested</Badge>;
    case "submitted":
      return <Badge variant="warning">Awaiting Review</Badge>;
    case "draft":
      return <Badge variant="outline">Draft Version</Badge>;
  }
}

export function VisibilityBadge({ visibility }: { visibility: Visibility }) {
  return visibility === "public" ? (
    <Badge variant="cyan">Public</Badge>
  ) : (
    <Badge variant="outline">Private</Badge>
  );
}
