import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Archive,
  ArchiveRestore,
  Calendar,
  Edit2,
  ExternalLink,
  Layers,
  MoreVertical,
  Trash2,
  User,
} from "lucide-react";
import type { Project } from "@/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  PriorityBadge,
  ProjectStatusBadge,
  VisibilityBadge,
} from "@/components/shared/status-badge";
import { formatDate } from "@/lib/utils/format";

export interface ProjectCardProps {
  project: Project;
  onEdit?: (project: Project) => void;
  onArchiveToggle?: (project: Project) => void;
  onDelete?: (project: Project) => void;
}

export function ProjectCard({
  project,
  onEdit,
  onArchiveToggle,
  onDelete,
}: ProjectCardProps) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const isArchived = project.status === "archived";

  return (
    <Card
      interactive
      className="overflow-hidden flex flex-col justify-between group transition-all duration-200 border-border bg-background-card"
    >
      <div>
        {/* Cover Image & Badges */}
        <div className="relative aspect-[16/10] w-full bg-background border-b border-border overflow-hidden">
          <Image
            src={project.coverUrl || "/placeholders/asset-brand-system.svg"}
            alt={project.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
          <div className="absolute left-3 top-3 flex items-center gap-1.5 flex-wrap">
            <ProjectStatusBadge status={project.status} />
            <PriorityBadge priority={project.priority} />
          </div>
          <div className="absolute right-3 top-3 flex items-center gap-1.5">
            <VisibilityBadge visibility={project.visibility} />
            {project.featured && <Badge variant="cyan">Featured</Badge>}
          </div>

          {/* Quick Action Overlay on Hover */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Link
              href={`/dashboard/projects/${project.id}`}
              className="inline-flex items-center gap-1.5 rounded-md bg-accent-primary px-3 py-1.5 text-xs font-semibold text-[#09090F] hover:opacity-90 shadow-forge-sm"
            >
              Open Workspace
            </Link>
          </div>
        </div>

        {/* Project Details */}
        <div className="p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span className="font-mono text-[11px] text-accent-secondary uppercase tracking-wider block truncate">
                {project.category}
              </span>
              <Link
                href={`/dashboard/projects/${project.id}`}
                className="mt-1 block text-base font-bold text-foreground hover:text-accent-primary transition-colors line-clamp-1"
              >
                {project.title}
              </Link>
            </div>

            {/* Overflow Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                className="rounded p-1 text-foreground-muted hover:bg-background-elevated hover:text-foreground"
                aria-label="Project actions menu"
              >
                <MoreVertical className="h-4 w-4" />
              </button>

              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-6 z-50 w-44 rounded-md border border-border-strong bg-background-card p-1 shadow-forge-card text-xs">
                    <Link
                      href={`/dashboard/projects/${project.id}`}
                      className="flex items-center gap-2 rounded px-2.5 py-1.5 text-foreground hover:bg-background-elevated"
                      onClick={() => setMenuOpen(false)}
                    >
                      <Layers className="h-3.5 w-3.5 text-accent-secondary" />
                      View Details
                    </Link>

                    {onEdit && (
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          onEdit(project);
                        }}
                        className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-foreground hover:bg-background-elevated"
                      >
                        <Edit2 className="h-3.5 w-3.5 text-accent-primary" />
                        Edit Project
                      </button>
                    )}

                    {onArchiveToggle && (
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          onArchiveToggle(project);
                        }}
                        className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-foreground hover:bg-background-elevated"
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
                      </button>
                    )}

                    {onDelete && (
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          onDelete(project);
                        }}
                        className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-status-error hover:bg-status-error/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete Project
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          <p className="mt-2 text-xs text-foreground-muted line-clamp-2 leading-relaxed">
            {project.description || project.brief || "No description provided."}
          </p>

          {/* Meta Attributes */}
          <div className="mt-4 space-y-2 border-t border-border pt-3 text-xs">
            {project.clientName && (
              <div className="flex items-center gap-1.5 text-foreground-muted truncate">
                <User className="h-3.5 w-3.5 text-accent-primary shrink-0" />
                <span className="truncate">{project.clientName}</span>
              </div>
            )}

            <div className="flex items-center justify-between text-foreground-muted font-mono text-[11px]">
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Due {formatDate(project.dueDate)}
              </span>
              <span>
                {project.deliverablesCount} deliverable
                {project.deliverablesCount === 1 ? "" : "s"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer link to public case study if public */}
      <div className="flex items-center justify-between border-t border-border px-5 py-2.5 bg-background-secondary/40 text-xs">
        <span className="font-mono text-[10px] text-foreground-muted truncate">
          /{project.slug}
        </span>
        {project.visibility === "public" ? (
          <Link
            href={`/portfolio/${project.slug}`}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-accent-primary hover:underline"
          >
            Public Preview
            <ExternalLink className="h-3 w-3" />
          </Link>
        ) : (
          <span className="font-mono text-[10px] text-foreground-muted">
            Private Workspace
          </span>
        )}
      </div>
    </Card>
  );
}
