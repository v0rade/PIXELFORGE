"use client";

import * as React from "react";
import {
  CheckCircle2,
  FileEdit,
  MessageSquare,
  ShieldAlert,
} from "lucide-react";
import type {
  DetailedDeliverable,
  RevisionCommentItem,
} from "@/lib/collaboration/service";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/input";
import { ReviewStatusBadge } from "@/components/shared/status-badge";
import { useToast } from "@/components/ui/toast";
import { formatTechnicalTimestamp } from "@/lib/utils/format";

interface DeliverableReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deliverable: DetailedDeliverable | null;
  currentUserId?: string;
  onDeliverableUpdated: (updated: DetailedDeliverable) => void;
}

export function DeliverableReviewDialog({
  open,
  onOpenChange,
  deliverable,
  currentUserId,
  onDeliverableUpdated,
}: DeliverableReviewDialogProps) {
  const { toast } = useToast();
  const [commentText, setCommentText] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [comments, setComments] = React.useState<RevisionCommentItem[]>([]);
  const [currentStatus, setCurrentStatus] = React.useState<string>("submitted");

  React.useEffect(() => {
    if (deliverable) {
      setComments(deliverable.comments || []);
      setCurrentStatus(deliverable.reviewStatus);
    }
  }, [deliverable]);

  if (!deliverable) return null;

  const isSubmitter = currentUserId && deliverable.submittedBy === currentUserId;

  const handlePostAction = async (
    type: "comment" | "revision_request" | "approval_note"
  ) => {
    if (!commentText.trim()) {
      toast({
        title: "Comment Required",
        description: "Please provide review feedback or approval notes.",
        variant: "warning",
      });
      return;
    }

    if (type === "approval_note" && isSubmitter) {
      toast({
        title: "Self-Approval Forbidden",
        description:
          "Independent sign-off required: you cannot approve your own deliverable.",
        variant: "error",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/v1/deliverables/${deliverable.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: commentText.trim(),
          commentType: type,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error?.message || "Failed to post review feedback.");
      }

      const newComment: RevisionCommentItem = json.data;
      const updatedComments = [...comments, newComment];
      setComments(updatedComments);

      let newStatus = currentStatus;
      if (type === "approval_note") {
        newStatus = "approved";
      } else if (type === "revision_request") {
        newStatus = "changes_requested";
      }
      setCurrentStatus(newStatus);
      setCommentText("");

      toast({
        title:
          type === "approval_note"
            ? "Deliverable Approved"
            : type === "revision_request"
            ? "Revisions Requested"
            : "Feedback Recorded",
        description: `Your review action has been added to the project audit trail.`,
        variant: "success",
      });

      onDeliverableUpdated({
        ...deliverable,
        reviewStatus: newStatus as DetailedDeliverable["reviewStatus"],
        comments: updatedComments,
      });
    } catch (err: unknown) {
      toast({
        title: "Review Action Failed",
        description:
          err instanceof Error ? err.message : "Error executing review action.",
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
      title={`Deliverable v${deliverable.versionNumber} // Review & Sign-Off`}
      description={`Asset: ${deliverable.assetName}`}
      maxWidth="lg"
    >
      <div className="space-y-6">
        {/* Status Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background-secondary p-4">
          <div className="flex items-center gap-3">
            <Badge variant="primary" className="text-xs">
              VERSION {deliverable.versionNumber}
            </Badge>
            <span className="font-semibold text-foreground text-sm">
              {deliverable.assetName}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-foreground-muted">STATUS:</span>
            <ReviewStatusBadge
              status={currentStatus as DetailedDeliverable["reviewStatus"]}
            />
          </div>
        </div>

        {/* Independent Approval Safeguard Notice */}
        {isSubmitter && (
          <div className="flex items-start gap-2.5 rounded-lg border border-status-warning/30 bg-status-warning/10 p-3 text-xs text-status-warning">
            <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Independent Sign-Off Guard:</span> You
              submitted this deliverable. You may submit notes and feedback, but
              approvals must come from an authorized client or independent reviewer.
            </div>
          </div>
        )}

        {/* Comments & Activity Trail */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-mono text-xs uppercase tracking-wider text-foreground-muted">
              Revision Log &amp; Client Feedback ({comments.length})
            </h4>
          </div>

          <div className="max-h-64 overflow-y-auto space-y-3 pr-1">
            {comments.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-foreground-muted">
                No annotations or review comments posted yet.
              </div>
            ) : (
              comments.map((comment) => {
                const isApproval = comment.commentType === "approval_note";
                const isRevision = comment.commentType === "revision_request";

                return (
                  <div
                    key={comment.id}
                    className={`rounded-lg border p-3.5 space-y-2 text-xs ${
                      isApproval
                        ? "border-status-success/40 bg-status-success/5"
                        : isRevision
                        ? "border-status-warning/40 bg-status-warning/5"
                        : "border-border bg-background-secondary/60"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">
                          {comment.authorName || "Studio Collaborator"}
                        </span>
                        <Badge
                          variant={
                            isApproval
                              ? "success"
                              : isRevision
                              ? "warning"
                              : "default"
                          }
                          className="text-[10px]"
                        >
                          {isApproval
                            ? "APPROVED"
                            : isRevision
                            ? "CHANGES REQUESTED"
                            : "NOTE"}
                        </Badge>
                      </div>
                      <span className="font-mono text-[11px] text-foreground-muted">
                        {formatTechnicalTimestamp(comment.createdAt)}
                      </span>
                    </div>

                    <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                      {comment.body}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Action / Feedback Form */}
        <div className="space-y-3 border-t border-border pt-4">
          <label
            htmlFor="feedbackText"
            className="block font-mono text-xs uppercase tracking-wider text-foreground-muted"
          >
            Submit Feedback or Sign-Off
          </label>
          <Textarea
            id="feedbackText"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Document required adjustments, optical alignment notes, or sign-off approval..."
            rows={3}
          />

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={() => handlePostAction("comment")}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Add Comment
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-status-warning border-status-warning/40 hover:bg-status-warning/10"
                disabled={isSubmitting}
                onClick={() => handlePostAction("revision_request")}
              >
                <FileEdit className="h-3.5 w-3.5" />
                Request Revisions
              </Button>

              <Button
                type="button"
                variant="gradient"
                size="sm"
                disabled={isSubmitting || Boolean(isSubmitter)}
                onClick={() => handlePostAction("approval_note")}
                title={
                  isSubmitter
                    ? "You cannot approve your own deliverable."
                    : "Approve this deliverable version"
                }
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Sign Off &amp; Approve
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
