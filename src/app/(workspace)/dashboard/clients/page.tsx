"use client";

import * as React from "react";
import {
  Archive,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Inbox,
  KeyRound,
  Mail,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  UserX,
} from "lucide-react";
import type { StudioClient, Project, ContactInquiry } from "@/types";
import type { ProjectInvitationItem } from "@/lib/collaboration/service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input, Label, Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { formatDate, formatTechnicalTimestamp } from "@/lib/utils/format";

export default function WorkspaceClientsPage() {
  const { toast } = useToast();

  const [loading, setLoading] = React.useState(true);
  const [clients, setClients] = React.useState<StudioClient[]>([]);
  const [invitations, setInvitations] = React.useState<ProjectInvitationItem[]>([]);
  const [inquiries, setInquiries] = React.useState<ContactInquiry[]>([]);
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [activeTab, setActiveTab] = React.useState<"all" | "clients" | "invitations" | "inquiries">("all");
  const [inquiryStatusFilter, setInquiryStatusFilter] = React.useState<"all" | "new" | "read" | "archived">("all");

  // Invite modal state
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [company, setCompany] = React.useState("");
  const [role, setRole] = React.useState<"client" | "collaborator">("client");
  const [projectId, setProjectId] = React.useState("");
  const [expiresInDays, setExpiresInDays] = React.useState(7);

  // Success Link modal state
  const [linkModalOpen, setLinkModalOpen] = React.useState(false);
  const [generatedLink, setGeneratedLink] = React.useState("");
  const [copied, setCopied] = React.useState(false);

  // Load data
  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [clientsRes, invRes, projectsRes, inquiriesRes] = await Promise.all([
        fetch("/api/v1/clients"),
        fetch("/api/v1/invitations"),
        fetch("/api/v1/projects"),
        fetch("/api/v1/contact"),
      ]);

      const [clientsJson, invJson, projectsJson, inquiriesJson] = await Promise.all([
        clientsRes.json(),
        invRes.json(),
        projectsRes.json(),
        inquiriesRes.json(),
      ]);

      if (clientsRes.ok && clientsJson.data?.clients) {
        setClients(clientsJson.data.clients);
      }
      if (invRes.ok && invJson.data?.invitations) {
        setInvitations(invJson.data.invitations);
      }
      if (projectsRes.ok && projectsJson.data?.projects) {
        setProjects(projectsJson.data.projects);
        if (projectsJson.data.projects.length > 0 && !projectId) {
          setProjectId(projectsJson.data.projects[0].id);
        }
      }
      if (inquiriesRes.ok && inquiriesJson.data?.inquiries) {
        setInquiries(inquiriesJson.data.inquiries);
      }
    } catch (err: unknown) {
      toast({
        title: "Failed to load collaboration data",
        description: err instanceof Error ? err.message : "Error connecting to server.",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [projectId, toast]);

  const handleUpdateInquiryStatus = async (inquiryId: string, newStatus: "new" | "read" | "archived") => {
    try {
      const res = await fetch(`/api/v1/contact/${inquiryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json?.error?.message || "Failed to update inquiry status.");
      }

      setInquiries((prev) =>
        prev.map((i) => (i.id === inquiryId ? { ...i, status: newStatus } : i))
      );

      toast({
        title: "Inquiry Updated",
        description: `Marked inquiry as ${newStatus}.`,
        variant: "success",
      });
    } catch (err: unknown) {
      toast({
        title: "Update Failed",
        description: err instanceof Error ? err.message : "Could not update inquiry status.",
        variant: "error",
      });
    }
  };

  const handleInviteFromInquiry = (inquiry: ContactInquiry) => {
    setName(inquiry.senderName);
    setEmail(inquiry.senderEmail);
    setCompany(inquiry.subject || "Prospective Client");
    setRole("client");
    setInviteOpen(true);
    if (inquiry.status === "new") {
      void handleUpdateInquiryStatus(inquiry.id, "read");
    }
  };

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleInviteClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !projectId) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/v1/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          email: email.trim(),
          clientName: name.trim() || undefined,
          company: company.trim() || undefined,
          role,
          expiresInDays: Number(expiresInDays),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error?.message || "Failed to create invitation.");
      }

      const rawToken = json.data?.rawToken;
      const fullUrl = `${window.location.origin}/invite/${rawToken}`;

      setGeneratedLink(fullUrl);
      setCopied(false);
      setInviteOpen(false);
      setLinkModalOpen(true);

      // Reset form
      setName("");
      setEmail("");
      setCompany("");

      // Refresh list
      await fetchData();

      toast({
        title: "Cryptographic Invitation Issued",
        description: `Single-use invitation generated for ${email}.`,
        variant: "success",
      });
    } catch (err: unknown) {
      toast({
        title: "Invitation Error",
        description: err instanceof Error ? err.message : "Could not issue invitation.",
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      toast({
        title: "Invitation URL Copied",
        description: "Hashed invitation link copied to clipboard.",
        variant: "success",
      });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast({
        title: "Copy Failed",
        description: "Please copy the URL manually from the box.",
        variant: "warning",
      });
    }
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    if (!confirm("Are you sure you want to revoke this invitation token? The recipient will no longer be able to use it to join.")) {
      return;
    }

    try {
      const res = await fetch(`/api/v1/invitations?id=${encodeURIComponent(invitationId)}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json?.error?.message || "Failed to revoke invitation.");
      }

      setInvitations((prev) =>
        prev.map((inv) =>
          inv.id === invitationId
            ? { ...inv, revokedAt: new Date().toISOString() }
            : inv
        )
      );

      toast({
        title: "Invitation Revoked",
        description: "The token has been marked as revoked and cannot be accepted.",
        variant: "success",
      });
    } catch (err: unknown) {
      toast({
        title: "Revocation Failed",
        description: err instanceof Error ? err.message : "Could not revoke invitation.",
        variant: "error",
      });
    }
  };

  const handleDeleteClient = async (clientId: string, clientName: string) => {
    if (!confirm(`Are you sure you want to remove client record "${clientName}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/v1/clients/${clientId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json?.error?.message || "Failed to delete client.");
      }

      setClients((prev) => prev.filter((c) => c.id !== clientId));

      toast({
        title: "Client Removed",
        description: `${clientName} has been removed from client records.`,
        variant: "success",
      });
    } catch (err: unknown) {
      toast({
        title: "Delete Failed",
        description: err instanceof Error ? err.message : "Could not delete client.",
        variant: "error",
      });
    }
  };

  const filteredClients = clients.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.company.toLowerCase().includes(q)
    );
  });

  const filteredInquiries = inquiries.filter((inq) => {
    const matchesFilter =
      inquiryStatusFilter === "all" || inq.status === inquiryStatusFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      inq.senderName.toLowerCase().includes(q) ||
      inq.senderEmail.toLowerCase().includes(q) ||
      (inq.subject && inq.subject.toLowerCase().includes(q)) ||
      inq.message.toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  const newInquiriesCount = inquiries.filter((i) => i.status === "new").length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-border pb-6 sm:flex-row sm:items-center">
        <div>
          <Badge variant="primary">WORKSPACE // CLIENT PORTAL</Badge>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Clients &amp; Project Invitations
          </h1>
          <p className="mt-1 text-sm text-foreground-muted">
            Manage authorized client collaborators, project-scoped permissions, and expiring single-use invitation tokens.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            title="Refresh collaboration data"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="gradient" onClick={() => setInviteOpen(true)}>
            <Plus className="h-4 w-4" />
            Invite Client to Project
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border/80 pb-3">
        <Button
          type="button"
          size="sm"
          variant={activeTab === "all" ? "primary" : "ghost"}
          onClick={() => setActiveTab("all")}
        >
          All Views
        </Button>
        <Button
          type="button"
          size="sm"
          variant={activeTab === "clients" ? "primary" : "ghost"}
          onClick={() => setActiveTab("clients")}
        >
          <UserCheck className="h-4 w-4 mr-1.5" />
          Clients ({clients.length})
        </Button>
        <Button
          type="button"
          size="sm"
          variant={activeTab === "invitations" ? "primary" : "ghost"}
          onClick={() => setActiveTab("invitations")}
        >
          <KeyRound className="h-4 w-4 mr-1.5" />
          Invitations ({invitations.length})
        </Button>
        <Button
          type="button"
          size="sm"
          variant={activeTab === "inquiries" ? "primary" : "ghost"}
          onClick={() => setActiveTab("inquiries")}
        >
          <Inbox className="h-4 w-4 mr-1.5" />
          Inquiries ({inquiries.length})
          {newInquiriesCount > 0 && (
            <span className="ml-1.5 rounded-full bg-accent-primary px-1.5 py-0.2 text-[10px] font-bold text-background-primary">
              {newInquiriesCount} new
            </span>
          )}
        </Button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search clients, invitations, or inquiries..."
            className="pl-9"
          />
        </div>
      </div>

      {/* Clients Grid */}
      {(activeTab === "all" || activeTab === "clients") && (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            Client Directory ({filteredClients.length})
          </h2>
          <span className="font-mono text-xs text-foreground-muted">
            Scoped Row-Level Security
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="p-6 space-y-4">
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-16 w-full" />
              </Card>
            ))}
          </div>
        ) : filteredClients.length === 0 ? (
          <Card className="p-12 text-center border-dashed border-border/80">
            <UserX className="mx-auto h-10 w-10 text-foreground-muted mb-3" />
            <h3 className="text-base font-semibold text-foreground">
              No clients found
            </h3>
            <p className="mt-1 text-sm text-foreground-muted max-w-md mx-auto">
              {searchQuery
                ? "No client records matched your search query."
                : "Invite your first client to a project workspace to collaborate on deliverables."}
            </p>
            {!searchQuery && (
              <Button
                variant="gradient"
                className="mt-4"
                onClick={() => setInviteOpen(true)}
              >
                <Plus className="h-4 w-4" />
                Invite Client
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {filteredClients.map((client) => {
              const assigned = projects.filter((p) =>
                client.assignedProjectIds.includes(p.id)
              );
              return (
                <Card key={client.id} className="p-6 space-y-4 relative group">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-foreground">
                        {client.name}
                      </h3>
                      <p className="text-xs text-accent-secondary font-mono">
                        {client.company || "Independent Reviewer"}
                      </p>
                      <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-foreground-muted">
                        <Mail className="h-3.5 w-3.5" />
                        {client.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          client.reviewStatus === "approved"
                            ? "success"
                            : client.reviewStatus === "active_collaboration"
                            ? "cyan"
                            : client.reviewStatus === "awaiting_feedback"
                            ? "warning"
                            : "outline"
                        }
                      >
                        {client.reviewStatus.replace("_", " ")}
                      </Badge>
                      <button
                        type="button"
                        onClick={() => handleDeleteClient(client.id, client.name)}
                        className="text-foreground-muted hover:text-status-error transition-colors p-1 rounded"
                        title="Delete client record"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-border pt-4">
                    <p className="font-mono text-[11px] uppercase tracking-wider text-foreground-muted mb-2">
                      Authorized Projects (Scoped RLS Access)
                    </p>
                    {assigned.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {assigned.map((proj) => (
                          <Badge key={proj.id} variant="default">
                            {proj.title}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-foreground-muted italic">
                        No projects currently assigned.
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t border-border pt-3 font-mono text-[11px] text-foreground-muted">
                    <span className="inline-flex items-center gap-1">
                      <UserCheck className="h-3.5 w-3.5 text-status-success" />
                      ADDED {formatDate(client.createdAt)}
                    </span>
                    {client.invitationExpiresAt ? (
                      <span className="text-status-warning">
                        EXPIRES {formatDate(client.invitationExpiresAt)}
                      </span>
                    ) : (
                      <span className="text-accent-primary">ACCESS VERIFIED</span>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
      )}

      {/* Invitations Table */}
      {(activeTab === "all" || activeTab === "invitations") && (
      <div className="space-y-4 pt-4 border-t border-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Single-Use Invitation Tokens ({invitations.length})
            </h2>
            <p className="text-xs text-foreground-muted">
              Security audit log: plaintext tokens are never stored; only cryptographic SHA-256 hashes are persisted.
            </p>
          </div>
        </div>

        {invitations.length === 0 ? (
          <Card className="p-6 text-center text-sm text-foreground-muted">
            No active project invitations recorded yet.
          </Card>
        ) : (
          <Card className="overflow-hidden border border-border">
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-background-secondary/80 text-foreground-muted border-b border-border">
                  <tr>
                    <th className="py-3 px-4 uppercase">Recipient</th>
                    <th className="py-3 px-4 uppercase">Project</th>
                    <th className="py-3 px-4 uppercase">Role</th>
                    <th className="py-3 px-4 uppercase">Status</th>
                    <th className="py-3 px-4 uppercase">Expires</th>
                    <th className="py-3 px-4 uppercase text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {invitations.map((inv) => {
                    const isAccepted = Boolean(inv.acceptedAt);
                    const isRevoked = Boolean(inv.revokedAt);
                    const isExpired = new Date(inv.expiresAt) < new Date();

                    return (
                      <tr key={inv.id} className="hover:bg-background-card/50 transition-colors">
                        <td className="py-3 px-4 text-foreground font-sans font-medium">
                          {inv.email}
                        </td>
                        <td className="py-3 px-4 text-accent-secondary">
                          {inv.projectTitle || "Project Workspace"}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={inv.role === "client" ? "cyan" : "primary"}>
                            {inv.role}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          {isRevoked ? (
                            <Badge variant="outline" className="text-status-error border-status-error/30">
                              Revoked
                            </Badge>
                          ) : isAccepted ? (
                            <Badge variant="success">Accepted</Badge>
                          ) : isExpired ? (
                            <Badge variant="warning">Expired</Badge>
                          ) : (
                            <Badge variant="outline" className="text-status-warning border-status-warning/40">
                              Pending
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 text-foreground-muted">
                          {formatDate(inv.expiresAt)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {!isAccepted && !isRevoked && !isExpired && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-status-error hover:bg-status-error/10 h-7 text-xs"
                              onClick={() => handleRevokeInvitation(inv.id)}
                            >
                              Revoke
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
      )}

      {/* Inbound Contact Inquiries Section */}
      {(activeTab === "all" || activeTab === "inquiries") && (
        <div className="space-y-4 pt-4 border-t border-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-foreground">
                  Inbound Commission &amp; Contact Inquiries ({inquiries.length})
                </h2>
                {newInquiriesCount > 0 && (
                  <Badge variant="cyan">{newInquiriesCount} New</Badge>
                )}
              </div>
              <p className="text-xs text-foreground-muted mt-0.5">
                Prospective client inquiries received through the public portfolio contact form.
              </p>
            </div>

            {/* Inquiries status filter */}
            <div className="flex items-center gap-1.5 self-start">
              {(["all", "new", "read", "archived"] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setInquiryStatusFilter(st)}
                  className={`px-2.5 py-1 text-xs rounded-full capitalize font-mono transition-colors ${
                    inquiryStatusFilter === st
                      ? "bg-accent-primary/20 text-accent-primary border border-accent-primary/40 font-semibold"
                      : "text-foreground-muted hover:text-foreground hover:bg-background-secondary border border-transparent"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Card key={i} className="p-4 space-y-2">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-4 w-2/3" />
                </Card>
              ))}
            </div>
          ) : filteredInquiries.length === 0 ? (
            <Card className="p-8 text-center border-dashed border-border/80">
              <Inbox className="mx-auto h-8 w-8 text-foreground-muted mb-2" />
              <h3 className="text-sm font-semibold text-foreground">
                No inquiries found
              </h3>
              <p className="mt-1 text-xs text-foreground-muted max-w-sm mx-auto">
                {searchQuery || inquiryStatusFilter !== "all"
                  ? "No contact submissions match the current search or status filter."
                  : "Public portfolio inquiries submitted at /contact will appear here."}
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredInquiries.map((inq) => (
                <Card
                  key={inq.id}
                  className={`p-5 space-y-3 border transition-colors ${
                    inq.status === "new"
                      ? "border-accent-primary/50 bg-background-card/90 shadow-sm shadow-accent-primary/5"
                      : "border-border bg-background-card/50"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-primary/10 border border-accent-primary/20 text-accent-primary font-bold text-sm">
                        {inq.senderName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-foreground text-sm">
                            {inq.senderName}
                          </h4>
                          <span className="text-xs text-foreground-muted font-mono">
                            &lt;{inq.senderEmail}&gt;
                          </span>
                          <Badge
                            variant={
                              inq.status === "new"
                                ? "cyan"
                                : inq.status === "read"
                                ? "outline"
                                : "default"
                            }
                            className="capitalize text-[10px] py-0 px-2"
                          >
                            {inq.status}
                          </Badge>
                        </div>
                        {inq.subject && (
                          <p className="text-xs font-mono text-accent-secondary mt-0.5">
                            {inq.subject}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-foreground-muted font-mono shrink-0">
                      <Clock className="h-3 w-3" />
                      <span>{formatTechnicalTimestamp(inq.createdAt)}</span>
                    </div>
                  </div>

                  <p className="text-xs text-foreground-muted bg-background-secondary/60 p-3 rounded-md border border-border/60 leading-relaxed font-sans whitespace-pre-wrap">
                    {inq.message}
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="gradient"
                        className="h-7 text-xs"
                        onClick={() => handleInviteFromInquiry(inq)}
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        Invite as Client
                      </Button>
                      <a
                        href={`mailto:${inq.senderEmail}?subject=Re: ${encodeURIComponent(inq.subject || "PIXELFORGE Studio Inquiry")}`}
                        className="inline-flex items-center gap-1.5 h-7 px-2.5 text-xs font-medium rounded-md border border-border bg-background-secondary text-foreground hover:bg-background-card transition-colors"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        Reply via Email
                      </a>
                    </div>

                    <div className="flex items-center gap-2">
                      {inq.status !== "read" && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-foreground-muted hover:text-foreground"
                          onClick={() => handleUpdateInquiryStatus(inq.id, "read")}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          Mark Read
                        </Button>
                      )}
                      {inq.status !== "new" && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-foreground-muted hover:text-foreground"
                          onClick={() => handleUpdateInquiryStatus(inq.id, "new")}
                        >
                          Mark New
                        </Button>
                      )}
                      {inq.status !== "archived" && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-foreground-muted hover:text-status-error"
                          onClick={() => handleUpdateInquiryStatus(inq.id, "archived")}
                        >
                          <Archive className="h-3.5 w-3.5 mr-1" />
                          Archive
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Invite Form Dialog */}
      <Dialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        title="Invite Client or Collaborator"
        description="Generates a cryptographically random single-use token hashed with SHA-256."
      >
        <form onSubmit={handleInviteClient} className="space-y-4">
          <div>
            <Label htmlFor="cliName">Client Full Name</Label>
            <Input
              id="cliName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dr. Elena Rostova"
            />
          </div>
          <div>
            <Label htmlFor="cliEmail">Client Email Address *</Label>
            <Input
              id="cliEmail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. client@organization.com"
              required
            />
          </div>
          <div>
            <Label htmlFor="cliCompany">Organization / Studio</Label>
            <Input
              id="cliCompany"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g. Horizon Media Lab"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cliRole">Collaboration Role *</Label>
              <Select
                id="cliRole"
                value={role}
                onChange={(e) => setRole(e.target.value as "client" | "collaborator")}
              >
                <option value="client">Client (Review &amp; Sign-Off)</option>
                <option value="collaborator">Collaborator (Asset Contributor)</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="cliExpires">Token Expiration *</Label>
              <Select
                id="cliExpires"
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(Number(e.target.value))}
              >
                <option value={1}>1 Day</option>
                <option value={3}>3 Days</option>
                <option value={7}>7 Days (Default)</option>
                <option value={14}>14 Days</option>
                <option value={30}>30 Days</option>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="cliProject">Target Project Workspace *</Label>
            <Select
              id="cliProject"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              required
            >
              {projects.map((proj) => (
                <option key={proj.id} value={proj.id}>
                  {proj.title}
                </option>
              ))}
            </Select>
          </div>
          <div className="rounded-md border border-border bg-background-secondary p-3 font-mono text-xs text-foreground-muted flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-accent-secondary shrink-0" />
            <span>
              Recipients are scoped via RLS to ONLY this project and its deliverables.
            </span>
          </div>
          <div className="flex justify-end gap-2.5 border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setInviteOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="gradient" disabled={isSubmitting}>
              <KeyRound className="h-4 w-4" />
              {isSubmitting ? "Generating Token..." : "Issue Single-Use Token"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Generated Token Success Dialog */}
      <Dialog
        open={linkModalOpen}
        onOpenChange={setLinkModalOpen}
        title="Single-Use Invitation Generated"
        description="Deliver this link securely to the client. The token is hashed and cannot be retrieved again."
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-border/80 bg-background-secondary p-3 font-mono text-xs break-all text-accent-secondary select-all">
            {generatedLink}
          </div>

          <div className="flex items-center gap-2 text-xs text-status-warning bg-status-warning/10 border border-status-warning/20 p-3 rounded-md">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>
              For zero-trust security, only the SHA-256 hash was persisted. Once closed, this raw URL will not be viewable again.
            </span>
          </div>

          <div className="flex justify-between items-center border-t border-border pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(generatedLink, "_blank")}
            >
              <ExternalLink className="h-4 w-4" />
              Test Open
            </Button>
            <div className="flex gap-2">
              <Button
                variant="gradient"
                onClick={handleCopyLink}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-status-success" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy Invitation URL
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setLinkModalOpen(false)}
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
