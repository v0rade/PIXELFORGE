"use client";

import * as React from "react";
import Link from "next/link";
import { ExternalLink, Save, Star } from "lucide-react";
import { DEMO_DESIGNER_PROFILE, DEMO_PROJECTS } from "@/lib/demo/data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { VisibilityBadge } from "@/components/shared/status-badge";
import { useToast } from "@/components/ui/toast";

const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "dashboard",
  "login",
  "signup",
  "portfolio",
  "settings",
]);

export default function WorkspacePortfolioEditorPage() {
  const { toast } = useToast();
  const [profile, setProfile] = React.useState(DEMO_DESIGNER_PROFILE);
  const [projects, setProjects] = React.useState(DEMO_PROJECTS);
  const [slugError, setSlugError] = React.useState<string | null>(null);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setSlugError(null);

    const cleanSlug = profile.username.trim().toLowerCase();
    if (
      !/^[a-z0-9-]+$/.test(cleanSlug) ||
      RESERVED_SLUGS.has(cleanSlug) ||
      cleanSlug.length < 3
    ) {
      setSlugError(
        "Invalid or reserved username slug. Use lowercase alphanumeric characters and hyphens (min 3 chars)."
      );
      return;
    }

    toast({
      title: "Public portfolio profile updated",
      description: `Changes saved for @${cleanSlug}.`,
      variant: "success",
    });
  };

  const toggleFeatured = (projectId: string) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId ? { ...p, featured: !p.featured } : p
      )
    );
    toast({
      title: "Featured status updated",
      description: "Homepage gallery order synchronized.",
      variant: "info",
    });
  };

  const togglePublicVisibility = (projectId: string) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId
          ? {
              ...p,
              visibility: p.visibility === "public" ? "private" : "public",
            }
          : p
      )
    );
    toast({
      title: "Project visibility updated",
      description:
        "Only explicitly published projects appear on public routes.",
      variant: "success",
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 border-b border-border pb-6 sm:flex-row sm:items-center">
        <div>
          <Badge variant="cyan">WORKSPACE // PORTFOLIO EDITOR</Badge>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Public Portfolio &amp; Profile Editor
          </h1>
          <p className="mt-1 text-sm text-foreground-muted">
            Configure your public biography, validate your public username slug,
            and curate which projects appear on the public website.
          </p>
        </div>

        <Link href="/portfolio">
          <Button variant="outline">
            Preview Public Portfolio
            <ExternalLink className="h-4 w-4 text-accent-secondary" />
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Public Profile Form */}
        <Card className="lg:col-span-6 p-6">
          <h2 className="text-lg font-bold text-foreground mb-4">
            Public Designer Profile
          </h2>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={profile.displayName}
                onChange={(e) =>
                  setProfile({ ...profile, displayName: e.target.value })
                }
                required
              />
            </div>

            <div>
              <Label htmlFor="username">Public Portfolio Slug</Label>
              <Input
                id="username"
                value={profile.username}
                onChange={(e) =>
                  setProfile({ ...profile, username: e.target.value })
                }
                error={slugError ?? undefined}
                required
              />
            </div>

            <div>
              <Label htmlFor="roleTitle">Role &amp; Discipline Headline</Label>
              <Input
                id="roleTitle"
                value={profile.roleTitle}
                onChange={(e) =>
                  setProfile({ ...profile, roleTitle: e.target.value })
                }
              />
            </div>

            <div>
              <Label htmlFor="availability">Availability Banner</Label>
              <Input
                id="availability"
                value={profile.availabilityStatus}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    availabilityStatus: e.target.value,
                  })
                }
              />
            </div>

            <div>
              <Label htmlFor="bio">Public Biography</Label>
              <Textarea
                id="bio"
                rows={4}
                value={profile.bio}
                onChange={(e) =>
                  setProfile({ ...profile, bio: e.target.value })
                }
              />
            </div>

            <Button type="submit" variant="gradient">
              <Save className="h-4 w-4" />
              Save Public Profile
            </Button>
          </form>
        </Card>

        {/* Featured & Public Project Curation */}
        <Card className="lg:col-span-6 p-6 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">
              Portfolio Project Visibility &amp; Curation
            </h2>
            <p className="text-xs text-foreground-muted mt-1">
              Draft or private projects never appear on public routes until
              explicitly set to Public.
            </p>
          </div>

          <div className="divide-y divide-border">
            {projects.map((proj) => (
              <div
                key={proj.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground truncate">
                      {proj.title}
                    </span>
                    <VisibilityBadge visibility={proj.visibility} />
                  </div>
                  <p className="font-mono text-xs text-foreground-muted mt-0.5">
                    /{proj.slug}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    size="sm"
                    variant={proj.featured ? "secondary" : "outline"}
                    onClick={() => toggleFeatured(proj.id)}
                  >
                    <Star className="h-3.5 w-3.5" />
                    {proj.featured ? "Featured" : "Feature"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => togglePublicVisibility(proj.id)}
                  >
                    {proj.visibility === "public"
                      ? "Unpublish"
                      : "Publish"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
