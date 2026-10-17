"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, FolderOpen, Search } from "lucide-react";
import { DEMO_PROJECTS } from "@/lib/demo/data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/skeleton";

const CATEGORIES = [
  "All",
  "Brand Identity",
  "UI Visual Design",
  "Digital Campaigns",
  "Social Media Design",
  "Marketing Collateral",
] as const;

export default function PublicPortfolioPage() {
  const [selectedCategory, setSelectedCategory] = React.useState<string>("All");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [sortBy, setSortBy] = React.useState<"featured" | "newest">("featured");

  // Only published projects appear on /portfolio
  const publishedProjects = React.useMemo(
    () => DEMO_PROJECTS.filter((p) => p.visibility === "public"),
    []
  );

  const filteredProjects = React.useMemo(() => {
    return publishedProjects
      .filter((project) => {
        const matchesCategory =
          selectedCategory === "All" || project.category === selectedCategory;
        const q = searchQuery.trim().toLowerCase();
        const matchesQuery =
          !q ||
          project.title.toLowerCase().includes(q) ||
          project.description.toLowerCase().includes(q) ||
          project.tools.some((t) => t.toLowerCase().includes(q));
        return matchesCategory && matchesQuery;
      })
      .sort((a, b) => {
        if (sortBy === "featured") {
          if (a.featured !== b.featured) return a.featured ? -1 : 1;
        }
        return (
          new Date(b.publishedAt ?? b.createdAt).getTime() -
          new Date(a.publishedAt ?? a.createdAt).getTime()
        );
      });
  }, [publishedProjects, selectedCategory, searchQuery, sortBy]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="border-b border-border pb-10">
        <p className="font-mono text-xs uppercase tracking-widest text-accent-primary">
          PUBLIC ARCHIVE // PUBLISHED WORKS
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl">
          Selected Visual Systems
        </h1>
        <p className="mt-3 max-w-2xl text-sm sm:text-base text-foreground-muted leading-relaxed">
          Browse published brand architectures, interface design systems, and
          production artifacts. Private client works in progress remain hidden
          behind workspace authorization.
        </p>

        <div className="mt-8 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          {/* Category Filter Pills */}
          <div
            role="tablist"
            aria-label="Filter portfolio by category"
            className="flex flex-wrap items-center gap-2"
          >
            {CATEGORIES.map((category) => {
              const active = selectedCategory === category;
              return (
                <button
                  key={category}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSelectedCategory(category)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors border ${
                    active
                      ? "border-accent-primary bg-accent-primary/15 text-accent-primary"
                      : "border-border bg-background-card text-foreground-muted hover:text-foreground"
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative min-w-[240px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground-muted" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search title or tools..."
                aria-label="Search portfolio projects"
                className="h-9 w-full rounded-md border border-border bg-background-secondary pl-9 pr-3 text-xs text-foreground placeholder:text-foreground-muted focus:border-accent-primary focus:outline-none"
              />
            </div>

            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as "featured" | "newest")
              }
              aria-label="Sort portfolio projects"
              className="h-9 rounded-md border border-border bg-background-secondary px-3 text-xs text-foreground focus:border-accent-primary focus:outline-none"
            >
              <option value="featured">Sort: Featured First</option>
              <option value="newest">Sort: Newest Published</option>
            </select>
          </div>
        </div>
      </div>

      {filteredProjects.length === 0 ? (
        <div className="mt-12">
          <EmptyState
            icon={<FolderOpen className="h-6 w-6" />}
            title="No matching published projects"
            description="No public case studies matched your current search or category filter."
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedCategory("All");
                  setSearchQuery("");
                }}
              >
                Reset Filters
              </Button>
            }
          />
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-2">
          {filteredProjects.map((project) => (
            <Link
              key={project.id}
              href={`/portfolio/${project.slug}`}
              className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary rounded-xl"
            >
              <Card interactive className="overflow-hidden h-full flex flex-col">
                <div className="relative aspect-[16/10] w-full overflow-hidden border-b border-border bg-background">
                  <Image
                    src={project.coverUrl}
                    alt={project.title}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                  <div className="absolute left-4 top-4 flex items-center gap-2">
                    <Badge variant="primary">{project.category}</Badge>
                    {project.featured && (
                      <Badge variant="cyan">Featured</Badge>
                    )}
                  </div>
                </div>
                <CardContent className="flex flex-1 flex-col justify-between p-6 pt-6">
                  <div>
                    <div className="flex items-center justify-between text-xs font-mono text-foreground-muted">
                      <span>{project.clientName}</span>
                      <span>{project.tools.join(" · ")}</span>
                    </div>
                    <h2 className="mt-2 text-xl font-bold text-foreground group-hover:text-accent-primary transition-colors">
                      {project.title}
                    </h2>
                    <p className="mt-2 text-sm text-foreground-muted leading-relaxed">
                      {project.description}
                    </p>
                  </div>

                  <div className="mt-6 flex items-center justify-between border-t border-border pt-4 text-xs">
                    <span className="font-mono text-foreground-muted">
                      SLUG // /{project.slug}
                    </span>
                    <span className="inline-flex items-center gap-1 font-medium text-accent-primary">
                      Read Case Study
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
