import Link from "next/link";
import { ArrowRight, ArrowUpRight, Compass, Layers, Sparkles } from "lucide-react";
import { DEMO_CREATIVE_PROCESS, DEMO_DESIGNER_PROFILE } from "@/lib/demo/data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 space-y-16">
      {/* Designer Profile Header */}
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 items-start">
        <div className="lg:col-span-4">
          <Card className="p-6 text-center space-y-4">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-2xl bg-forge-gradient font-mono text-3xl font-extrabold text-[#09090F] shadow-forge-glow-primary">
              SV
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {DEMO_DESIGNER_PROFILE.displayName}
              </h1>
              <p className="font-mono text-xs text-accent-secondary mt-1">
                @{DEMO_DESIGNER_PROFILE.username} · {DEMO_DESIGNER_PROFILE.location}
              </p>
            </div>
            <p className="text-xs text-foreground-muted">
              {DEMO_DESIGNER_PROFILE.roleTitle}
            </p>
            <div className="pt-2">
              <Badge variant="success">
                {DEMO_DESIGNER_PROFILE.availabilityStatus}
              </Badge>
            </div>
            <div className="flex flex-wrap justify-center gap-2 border-t border-border pt-4">
              {Object.entries(DEMO_DESIGNER_PROFILE.socialLinks).map(
                ([platform, url]) => (
                  <a
                    key={platform}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded border border-border bg-background-secondary px-2.5 py-1 text-xs capitalize text-foreground-muted hover:text-accent-primary"
                  >
                    {platform}
                    <ArrowUpRight className="h-3 w-3" />
                  </a>
                )
              )}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-8 space-y-8">
          <Card className="p-6 sm:p-8 space-y-4">
            <p className="font-mono text-xs uppercase tracking-widest text-accent-primary">
              DESIGNER PROFILE // BIOGRAPHY
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
              Modular Visual Systems &amp; Technical Craft
            </h2>
            <p className="text-sm sm:text-base text-foreground-muted leading-relaxed">
              {DEMO_DESIGNER_PROFILE.bio}
            </p>
            <p className="text-sm text-foreground-muted leading-relaxed">
              All profile details, featured case studies, and service offerings
              displayed on this page are managed directly from the owner&apos;s
              PIXELFORGE Portfolio Editor workspace.
            </p>
          </Card>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Card className="p-6">
              <div className="flex items-center gap-2 text-accent-primary">
                <Compass className="h-4 w-4" />
                <h3 className="font-mono text-xs uppercase tracking-wider">
                  Creative Interests
                </h3>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {DEMO_DESIGNER_PROFILE.creativeInterests.map((interest) => (
                  <Badge key={interest} variant="default">
                    {interest}
                  </Badge>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-2 text-accent-secondary">
                <Layers className="h-4 w-4" />
                <h3 className="font-mono text-xs uppercase tracking-wider">
                  Skills &amp; Tools
                </h3>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {DEMO_DESIGNER_PROFILE.skillsAndTools.map((tool) => (
                  <Badge key={tool.name} variant="mono">
                    {tool.name} ({tool.category})
                  </Badge>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Work Process */}
      <div className="space-y-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-accent-secondary">
            WORKFLOW // METHODOLOGY
          </p>
          <h2 className="mt-1 text-2xl font-bold text-foreground">
            Collaborative Studio Process
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {DEMO_CREATIVE_PROCESS.map((step) => (
            <Card key={step.step} className="p-5">
              <span className="font-mono text-lg font-bold text-accent-primary">
                {step.step} · {step.phase}
              </span>
              <h3 className="mt-2 text-sm font-semibold text-foreground">
                {step.title}
              </h3>
              <p className="mt-1.5 text-xs text-foreground-muted leading-relaxed">
                {step.description}
              </p>
            </Card>
          ))}
        </div>
      </div>

      {/* Contact CTA */}
      <Card className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border-accent-primary/35 p-8">
        <div>
          <h2 className="text-xl font-bold text-foreground">
            Commission a New Visual System
          </h2>
          <p className="mt-1 text-sm text-foreground-muted">
            Initiate a project brief or edit this public profile inside the
            Studio Workspace.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/contact">
            <Button variant="primary">
              Contact Studio
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/dashboard/portfolio">
            <Button variant="outline">
              <Sparkles className="h-4 w-4 text-accent-primary" />
              Edit Profile in Studio
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
