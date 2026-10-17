import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowUpRight, CheckCircle2, Layers } from "lucide-react";
import { DEMO_ASSETS, DEMO_PROJECTS } from "@/lib/demo/data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDate, formatFileSize } from "@/lib/utils/format";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = DEMO_PROJECTS.find(
    (p) => p.slug === slug && p.visibility === "public"
  );
  if (!project) {
    return { title: "Case Study Not Found" };
  }
  return {
    title: project.title,
    description: project.description,
  };
}

export default async function PublicProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = DEMO_PROJECTS.find(
    (p) => p.slug === slug && p.visibility === "public"
  );

  if (!project) {
    notFound();
  }

  const galleryAssets = DEMO_ASSETS.filter(
    (asset) =>
      project.galleryAssetIds.includes(asset.id) &&
      asset.visibility === "public"
  );

  const relatedProjects = DEMO_PROJECTS.filter(
    (p) => p.visibility === "public" && p.id !== project.id
  ).slice(0, 2);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <Link
        href="/portfolio"
        className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-foreground-muted hover:text-accent-primary transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Portfolio
      </Link>

      <div className="mt-6 flex flex-wrap items-center gap-2.5">
        <Badge variant="primary">{project.category}</Badge>
        {project.featured && <Badge variant="cyan">Featured Case Study</Badge>}
        {project.publishedAt && (
          <Badge variant="mono">
            PUBLISHED {formatDate(project.publishedAt)}
          </Badge>
        )}
      </div>

      <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl">
        {project.title}
      </h1>
      <p className="mt-4 max-w-3xl text-base sm:text-lg text-foreground-muted leading-relaxed">
        {project.description}
      </p>

      <div className="relative mt-8 aspect-[16/10] w-full overflow-hidden rounded-xl border border-border-strong bg-background-card shadow-forge-card">
        <Image
          src={project.coverUrl}
          alt={project.title}
          fill
          priority
          className="object-cover"
        />
      </div>

      <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-12">
        <div className="lg:col-span-8 space-y-8">
          <Card className="p-6 sm:p-8">
            <p className="font-mono text-xs uppercase tracking-widest text-accent-primary">
              01 // CREATIVE BRIEF
            </p>
            <h2 className="mt-2 text-xl font-bold text-foreground">
              Context &amp; Objectives
            </h2>
            <p className="mt-3 text-sm sm:text-base text-foreground-muted leading-relaxed">
              {project.brief}
            </p>
          </Card>

          <Card className="p-6 sm:p-8">
            <p className="font-mono text-xs uppercase tracking-widest text-accent-secondary">
              02 // DESIGN PROCESS
            </p>
            <h2 className="mt-2 text-xl font-bold text-foreground">
              System Architecture &amp; Execution
            </h2>
            <p className="mt-3 text-sm sm:text-base text-foreground-muted leading-relaxed">
              {project.designProcess}
            </p>
          </Card>

          {project.outcome && (
            <Card className="border-status-success/30 bg-status-success/5 p-6 sm:p-8">
              <div className="flex items-center gap-2 text-status-success">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-mono text-xs uppercase tracking-widest">
                  03 // DELIVERED OUTCOME
                </span>
              </div>
              <p className="mt-3 text-sm sm:text-base text-foreground leading-relaxed">
                {project.outcome}
              </p>
            </Card>
          )}

          {/* Project Gallery */}
          {galleryAssets.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-foreground">
                Public Asset Specimens ({galleryAssets.length})
              </h2>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {galleryAssets.map((asset) => (
                  <Card key={asset.id} className="overflow-hidden">
                    <div className="relative aspect-[3/2] w-full bg-background border-b border-border">
                      <Image
                        src={asset.previewUrl}
                        alt={asset.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <Badge variant="mono">{asset.format}</Badge>
                        <span className="font-mono text-xs text-foreground-muted">
                          {formatFileSize(asset.fileSize)}
                        </span>
                      </div>
                      <h3 className="mt-2 text-sm font-semibold text-foreground">
                        {asset.name}
                      </h3>
                      <p className="mt-1 text-xs text-foreground-muted">
                        {asset.description}
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-4 space-y-6">
          <Card className="p-6 space-y-5">
            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-foreground-muted">
                CLIENT / CONCEPT
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {project.clientName}
              </p>
            </div>
            <div className="border-t border-border pt-4">
              <p className="font-mono text-xs uppercase tracking-wider text-foreground-muted">
                DISCIPLINE
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {project.category}
              </p>
            </div>
            <div className="border-t border-border pt-4">
              <p className="font-mono text-xs uppercase tracking-wider text-foreground-muted">
                TOOLS &amp; TECHNOLOGIES
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {project.tools.map((tool) => (
                  <Badge key={tool} variant="outline">
                    <Layers className="h-3 w-3 text-accent-primary" />
                    {tool}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="border-t border-border pt-4">
              <Link href="/contact">
                <Button variant="primary" className="w-full">
                  Inquire About Similar Work
                  <ArrowUpRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </Card>

          {relatedProjects.length > 0 && (
            <Card className="p-6 space-y-4">
              <h3 className="font-mono text-xs uppercase tracking-wider text-foreground-muted">
                Related Published Projects
              </h3>
              <div className="space-y-3">
                {relatedProjects.map((rel) => (
                  <Link
                    key={rel.id}
                    href={`/portfolio/${rel.slug}`}
                    className="block rounded-md border border-border bg-background-secondary p-3 hover:border-accent-primary/40 transition-colors"
                  >
                    <p className="text-xs font-mono text-accent-secondary">
                      {rel.category}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {rel.title}
                    </p>
                  </Link>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
