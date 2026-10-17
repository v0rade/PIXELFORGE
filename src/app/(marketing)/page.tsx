import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  FolderGit2,
  Layers,
  Lock,
  Sparkles,
  Terminal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  DEMO_ASSETS,
  DEMO_CREATIVE_PROCESS,
  DEMO_DESIGNER_PROFILE,
  DEMO_PROJECTS,
  DEMO_SERVICES,
} from "@/lib/demo/data";
import { formatFileSize } from "@/lib/utils/format";

export default function LandingPage() {
  // Dynamically query published & featured projects from the data layer
  const publishedProjects = DEMO_PROJECTS.filter(
    (project) => project.visibility === "public"
  );
  const featuredProjects = publishedProjects.filter(
    (project) => project.featured
  );
  const publicAssets = DEMO_ASSETS.filter(
    (asset) => asset.visibility === "public"
  ).slice(0, 4);

  return (
    <div className="relative overflow-hidden">
      {/* Ambient top glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[620px] bg-forge-glow"
      />

      {/* 1. HERO SECTION */}
      <section className="relative border-b border-border forge-grid-bg py-20 sm:py-28 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2.5 rounded-full border border-accent-primary/35 bg-background-card/90 px-3.5 py-1.5 shadow-forge-sm">
                <span className="h-2 w-2 rounded-full bg-accent-secondary animate-pulse" />
                <span className="font-mono text-xs uppercase tracking-widest text-foreground">
                  PIXELFORGE // CRAFT IDEAS. FORGE VISUALS.
                </span>
              </div>

              <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl lg:text-[64px] lg:leading-[1.06]">
                Ideas Into{" "}
                <span className="bg-forge-gradient bg-clip-text text-transparent">
                  Visual Experiences.
                </span>
              </h1>

              <p className="max-w-2xl text-base sm:text-lg text-foreground-muted leading-relaxed">
                A modern creative workspace where designers organize visual
                assets, manage projects, collaborate with clients on versioned
                deliverables, and publish high-craft portfolios from a single
                source of truth.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link href="/portfolio">
                  <Button variant="gradient" size="lg">
                    Explore Portfolio
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/dashboard">
                  <Button variant="outline" size="lg">
                    <Sparkles className="h-4 w-4 text-accent-primary" />
                    Enter Creative Studio
                  </Button>
                </Link>
              </div>

              <div className="grid grid-cols-3 gap-4 border-t border-border pt-8 max-w-xl">
                <div>
                  <p className="font-mono text-2xl font-bold text-foreground">
                    {publishedProjects.length}
                  </p>
                  <p className="font-mono text-xs uppercase tracking-wider text-foreground-muted mt-0.5">
                    Published Case Studies
                  </p>
                </div>
                <div>
                  <p className="font-mono text-2xl font-bold text-accent-primary">
                    {DEMO_ASSETS.length}
                  </p>
                  <p className="font-mono text-xs uppercase tracking-wider text-foreground-muted mt-0.5">
                    Indexed Studio Assets
                  </p>
                </div>
                <div>
                  <p className="font-mono text-2xl font-bold text-accent-secondary">
                    100%
                  </p>
                  <p className="font-mono text-xs uppercase tracking-wider text-foreground-muted mt-0.5">
                    Versioned Approvals
                  </p>
                </div>
              </div>
            </div>

            {/* Hero Interactive Studio Preview Card */}
            <div className="lg:col-span-5">
              <div className="rounded-xl border border-border-strong bg-background-card p-3 shadow-forge-card">
                <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-status-error/80" />
                    <span className="h-2.5 w-2.5 rounded-full bg-status-warning/80" />
                    <span className="h-2.5 w-2.5 rounded-full bg-status-success/80" />
                  </div>
                  <span className="font-mono text-[11px] text-foreground-muted">
                    WORKSPACE // ASSET_PREVIEW.SVG
                  </span>
                  <Badge variant="cyan">LIVE</Badge>
                </div>

                <div className="relative mt-2.5 aspect-[3/2] w-full overflow-hidden rounded-lg border border-border bg-background">
                  <Image
                    src="/placeholders/asset-brand-system.svg"
                    alt="Aether Modular Brand Identity Sheet"
                    fill
                    priority
                    className="object-cover"
                  />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2.5 p-1">
                  <div className="rounded-md border border-border bg-background-secondary p-3">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-foreground-muted">
                      ACTIVE DELIVERABLE
                    </p>
                    <p className="mt-1 text-xs font-semibold text-foreground truncate">
                      Aether Brand Manual v4
                    </p>
                    <p className="mt-1 font-mono text-[11px] text-status-success">
                      ● APPROVED FOR RELEASE
                    </p>
                  </div>
                  <div className="rounded-md border border-border bg-background-secondary p-3">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-foreground-muted">
                      STORAGE SECURITY
                    </p>
                    <p className="mt-1 text-xs font-semibold text-foreground truncate">
                      Signed URLs + RLS
                    </p>
                    <p className="mt-1 font-mono text-[11px] text-accent-secondary">
                      ● BUCKET: PRIVATE
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. FEATURED WORK GALLERY (Editorial Large Cards) */}
      <section className="border-b border-border py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-accent-primary">
                01 // FEATURED WORK GALLERY
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Editorial Visual Systems
              </h2>
              <p className="mt-2 max-w-2xl text-sm sm:text-base text-foreground-muted">
                Dynamically populated from published studio case studies. Each
                project links directly to its full creative brief, process, and
                public asset gallery.
              </p>
            </div>
            <Link href="/portfolio">
              <Button variant="outline">
                View Full Portfolio ({publishedProjects.length})
                <ArrowUpRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-2">
            {featuredProjects.map((project, index) => (
              <Link
                key={project.id}
                href={`/portfolio/${project.slug}`}
                className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary rounded-xl"
              >
                <Card
                  interactive
                  className="overflow-hidden h-full flex flex-col border-border bg-background-card"
                >
                  <div className="relative aspect-[16/10] w-full overflow-hidden border-b border-border bg-background">
                    <Image
                      src={project.coverUrl}
                      alt={project.title}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                    <div className="absolute left-4 top-4 flex items-center gap-2">
                      <Badge variant="primary">{project.category}</Badge>
                      <Badge variant="mono">0{index + 1}</Badge>
                    </div>
                  </div>
                  <CardContent className="flex flex-1 flex-col justify-between p-6 pt-6">
                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-mono text-xs text-foreground-muted">
                          {project.clientName}
                        </span>
                        <span className="font-mono text-xs text-accent-secondary">
                          {project.tools.join(" · ")}
                        </span>
                      </div>
                      <h3 className="mt-2 text-xl font-bold tracking-tight text-foreground group-hover:text-accent-primary transition-colors">
                        {project.title}
                      </h3>
                      <p className="mt-2 text-sm text-foreground-muted leading-relaxed">
                        {project.description}
                      </p>
                    </div>

                    <div className="mt-6 flex items-center justify-between border-t border-border pt-4 text-xs">
                      <span className="font-mono text-foreground-muted">
                        DELIVERABLES: {project.deliverablesCount} VERSIONS
                      </span>
                      <span className="inline-flex items-center gap-1 font-medium text-accent-primary">
                        Inspect Case Study
                        <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 3. SERVICES SECTION */}
      <section
        id="services"
        className="border-b border-border bg-background-secondary py-20 sm:py-24"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="font-mono text-xs uppercase tracking-widest text-accent-secondary">
              02 // CAPABILITIES &amp; SERVICES
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Engineered for Creative Discipline
            </h2>
            <p className="mt-3 text-sm sm:text-base text-foreground-muted leading-relaxed">
              Structured design capabilities spanning foundational brand
              architecture, digital product interfaces, and print-ready
              production collateral.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {DEMO_SERVICES.map((service) => (
              <Card
                key={service.id}
                interactive
                className="flex flex-col justify-between p-6"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-accent-primary">
                      SERVICE // {service.number}
                    </span>
                    <Layers className="h-4 w-4 text-accent-secondary" />
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-foreground">
                    {service.title}
                  </h3>
                  <p className="mt-2 text-sm text-foreground-muted leading-relaxed">
                    {service.summary}
                  </p>
                </div>

                <ul className="mt-6 space-y-2 border-t border-border pt-4">
                  {service.deliverables.map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-2 text-xs text-foreground-muted"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-status-success shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}

            {/* Studio Platform Card */}
            <Card className="flex flex-col justify-between border-accent-primary/35 bg-gradient-to-b from-accent-primary/10 to-background-card p-6">
              <div>
                <Badge variant="primary">CLIENT PORTAL INCLUDED</Badge>
                <h3 className="mt-4 text-lg font-bold text-foreground">
                  Dedicated Workspace &amp; Revision Tracking
                </h3>
                <p className="mt-2 text-sm text-foreground-muted leading-relaxed">
                  Every commission includes private access to PIXELFORGE for
                  reviewing deliverable versions, leaving timestamped feedback,
                  and downloading master files.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-border">
                <Link href="/dashboard">
                  <Button variant="primary" className="w-full">
                    Preview Studio Workspace
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* 4. CREATIVE PROCESS SECTION (Discover, Design, Refine, Deliver) */}
      <section id="process" className="border-b border-border py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="font-mono text-xs uppercase tracking-widest text-accent-primary">
              03 // CREATIVE PROCESS
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              From Initial Brief to Signed Master
            </h2>
            <p className="mt-3 text-sm sm:text-base text-foreground-muted leading-relaxed">
              Four structured stages keep creative exploration transparent and
              every revision auditable.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {DEMO_CREATIVE_PROCESS.map((item) => (
              <Card
                key={item.step}
                className="relative flex flex-col justify-between p-6"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-2xl font-extrabold text-accent-secondary">
                      {item.step}
                    </span>
                    <Badge variant="outline">{item.phase}</Badge>
                  </div>
                  <h3 className="mt-4 text-base font-bold text-foreground">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm text-foreground-muted leading-relaxed">
                    {item.description}
                  </p>
                </div>
                <div className="mt-6 border-t border-border pt-3">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-foreground-muted">
                    KEY OUTPUT
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-accent-primary">
                    {item.artifact}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 5. SELECTED PROJECT HIGHLIGHTS & PUBLIC ASSET SAMPLES */}
      <section className="border-b border-border bg-background-secondary py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-accent-secondary">
                04 // SELECTED HIGHLIGHTS &amp; SPECIMENS
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Public Asset Repository Preview
              </h2>
              <p className="mt-2 max-w-2xl text-sm sm:text-base text-foreground-muted">
                Inspect technical metadata, vector specimens, and public assets
                managed inside the PIXELFORGE Asset Library.
              </p>
            </div>
            <Link href="/dashboard/assets">
              <Button variant="secondary">
                <FolderGit2 className="h-4 w-4" />
                Open Asset Library
              </Button>
            </Link>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {publicAssets.map((asset) => (
              <Card
                key={asset.id}
                interactive
                className="overflow-hidden flex flex-col"
              >
                <div className="relative aspect-[3/2] w-full bg-background border-b border-border">
                  <Image
                    src={asset.previewUrl}
                    alt={asset.name}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute right-2.5 top-2.5">
                    <Badge variant="mono">{asset.format}</Badge>
                  </div>
                </div>
                <div className="flex flex-1 flex-col justify-between p-4">
                  <div>
                    <p className="font-mono text-[11px] text-accent-primary">
                      {asset.category}
                    </p>
                    <h3 className="mt-1 text-sm font-semibold text-foreground line-clamp-1">
                      {asset.name}
                    </h3>
                    <p className="mt-1 text-xs text-foreground-muted line-clamp-2">
                      {asset.description}
                    </p>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-border pt-3 font-mono text-[11px] text-foreground-muted">
                    <span>{formatFileSize(asset.fileSize)}</span>
                    <span>
                      {asset.width}×{asset.height}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 6. CONTACT CTA */}
      <section className="relative py-20 sm:py-28">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-border-strong bg-background-card p-8 sm:p-12 lg:p-16 shadow-forge-card relative overflow-hidden">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent-primary/15 blur-3xl"
            />
            <div className="relative z-10 flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
              <div className="max-w-xl space-y-3">
                <div className="inline-flex items-center gap-2 font-mono text-xs text-status-success">
                  <span className="h-2 w-2 rounded-full bg-status-success" />
                  {DEMO_DESIGNER_PROFILE.availabilityStatus}
                </div>
                <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                  Ready to Forge Your Next Visual System?
                </h2>
                <p className="text-sm sm:text-base text-foreground-muted leading-relaxed">
                  Submit a project inquiry with your timeline and creative scope,
                  or step directly into the PIXELFORGE Studio Workspace to
                  explore the asset library and project workflows.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3.5 w-full lg:w-auto">
                <Link href="/contact">
                  <Button variant="gradient" size="lg" className="w-full sm:w-auto">
                    Start Project Inquiry
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/dashboard">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto">
                    <Terminal className="h-4 w-4 text-accent-secondary" />
                    Launch Studio Demo
                  </Button>
                </Link>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-6 border-t border-border pt-6 font-mono text-xs text-foreground-muted">
              <span className="inline-flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-accent-primary" />
                ROW-LEVEL SECURITY ARCHITECTURE
              </span>
              <span>● PRIVATE CLIENT INVITATIONS</span>
              <span>● VERSIONED DELIVERABLE APPROVALS</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
