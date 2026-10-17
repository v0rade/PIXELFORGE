"use client";

import * as React from "react";
import type { AssetCategory, Project, ProjectPriority, ProjectStatus, Visibility } from "@/types";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import {
  createProjectSchema,
  PROJECT_CATEGORIES,
  PROJECT_PRIORITIES,
  PROJECT_STATUSES,
  PROJECT_VISIBILITIES,
} from "@/lib/validation/projects";

export interface ProjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project | null;
  onSuccess: (project: Project) => void;
}

export function ProjectFormDialog({
  open,
  onOpenChange,
  project,
  onSuccess,
}: ProjectFormDialogProps) {
  const isEditing = Boolean(project);

  const [title, setTitle] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [brief, setBrief] = React.useState("");
  const [clientName, setClientName] = React.useState("");
  const [category, setCategory] = React.useState<AssetCategory>("Brand Identity");
  const [status, setStatus] = React.useState<ProjectStatus>("draft");
  const [priority, setPriority] = React.useState<ProjectPriority>("medium");
  const [visibility, setVisibility] = React.useState<Visibility>("private");
  const [featured, setFeatured] = React.useState(false);
  const [startDate, setStartDate] = React.useState("");
  const [dueDate, setDueDate] = React.useState("");
  const [coverUrl, setCoverUrl] = React.useState("");

  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Sync state when project changes or dialog opens
  React.useEffect(() => {
    if (project) {
      setTitle(project.title);
      setSlug(project.slug);
      setDescription(project.description || "");
      setBrief(project.brief || "");
      setClientName(project.clientName || "");
      setCategory(project.category);
      setStatus(project.status);
      setPriority(project.priority);
      setVisibility(project.visibility);
      setFeatured(project.featured);
      setStartDate(project.startDate || "");
      setDueDate(project.dueDate || "");
      setCoverUrl(project.coverUrl || "");
    } else {
      setTitle("");
      setSlug("");
      setDescription("");
      setBrief("");
      setClientName("");
      setCategory("Brand Identity");
      setStatus("in_progress");
      setPriority("medium");
      setVisibility("private");
      setFeatured(false);
      setStartDate(new Date().toISOString().slice(0, 10));
      setDueDate("");
      setCoverUrl("/placeholders/asset-brand-system.svg");
    }
    setFieldErrors({});
    setServerError(null);
  }, [project, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setServerError(null);

    const payload = {
      title,
      slug: slug.trim() ? slug.trim() : undefined,
      description,
      brief,
      category,
      clientName: clientName.trim() || undefined,
      status,
      priority,
      visibility,
      featured,
      startDate: startDate || null,
      dueDate: dueDate || null,
      coverUrl: coverUrl.trim() || undefined,
    };

    const parsed = createProjectSchema.safeParse(payload);
    if (!parsed.success) {
      const errMap: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "");
        if (key && !errMap[key]) {
          errMap[key] = issue.message;
        }
      }
      setFieldErrors(errMap);
      return;
    }

    setIsSubmitting(true);
    try {
      const url = isEditing && project
        ? `/api/v1/projects/${project.id}`
        : "/api/v1/projects";
      const method = isEditing ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resData = await response.json();

      if (!response.ok) {
        setServerError(
          resData?.error?.message || "Failed to save project. Please check fields."
        );
        return;
      }

      onSuccess(resData.data.project);
      onOpenChange(false);
    } catch {
      setServerError("Network error while submitting project.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? `Edit Project: ${project?.title}` : "Initialize Studio Project"}
      description="Configure creative brief, scheduling, priority, and visibility policies."
      maxWidth="lg"
    >
      {serverError && (
        <div
          role="alert"
          className="mb-4 rounded-md border border-status-error/40 bg-status-error/10 p-3 text-xs text-status-error"
        >
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="title">Project Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Chronos OS Telemetry Kit"
              error={fieldErrors.title}
              required
            />
          </div>

          <div>
            <Label htmlFor="slug">Custom URL Slug (Optional)</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="chronos-os-telemetry"
              error={fieldErrors.slug}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="category">Category</Label>
            <Select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value as AssetCategory)}
            >
              {PROJECT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="status">Project Status</Label>
            <Select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as ProjectStatus)}
            >
              {PROJECT_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st === "completed"
                    ? "Completed / Approved"
                    : st.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="priority">Priority</Label>
            <Select
              id="priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as ProjectPriority)}
            >
              {PROJECT_PRIORITIES.map((pr) => (
                <option key={pr} value={pr}>
                  {pr.toUpperCase()}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="clientName">Client or Organization</Label>
            <Input
              id="clientName"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="e.g. Synthesis Cultural Forum"
            />
          </div>

          <div>
            <Label htmlFor="visibility">Visibility Policy</Label>
            <Select
              id="visibility"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as Visibility)}
            >
              {PROJECT_VISIBILITIES.map((vis) => (
                <option key={vis} value={vis}>
                  {vis === "public" ? "Public (Portfolio Case Study)" : "Private (Authenticated Studio Only)"}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              error={fieldErrors.startDate}
            />
          </div>

          <div>
            <Label htmlFor="dueDate">Target Due Date</Label>
            <Input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              error={fieldErrors.dueDate}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="description">Executive Summary</Label>
          <Textarea
            id="description"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief high-level summary of the visual objectives..."
            error={fieldErrors.description}
          />
        </div>

        <div>
          <Label htmlFor="brief">Creative Brief &amp; Requirements</Label>
          <Textarea
            id="brief"
            rows={4}
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            placeholder="Detail technical requirements, grid standards, typography pairings, and deliverable targets..."
            error={fieldErrors.brief}
          />
        </div>

        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="featured"
            checked={featured}
            onChange={(e) => setFeatured(e.target.checked)}
            className="h-4 w-4 rounded border-border bg-background-secondary text-accent-primary focus:ring-accent-primary"
          />
          <label htmlFor="featured" className="text-xs text-foreground cursor-pointer">
            Feature this project on the studio landing page gallery
          </label>
        </div>

        <div className="flex justify-end gap-2.5 border-t border-border pt-4">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" variant="gradient" isLoading={isSubmitting}>
            {isEditing ? "Save Project Changes" : "Initialize Project"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
