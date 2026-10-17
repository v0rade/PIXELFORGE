"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  Bell,
  Briefcase,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FolderKanban,
  Grid,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  Users,
  X,
} from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DEMO_ASSETS,
  DEMO_DESIGNER_PROFILE,
} from "@/lib/demo/data";
import type { AuthenticatedSessionUser } from "@/lib/auth/session";
import type { InAppNotification } from "@/types";
import { cn } from "@/lib/utils/cn";
import { formatFileSize, formatTechnicalTimestamp } from "@/lib/utils/format";
import { useToast } from "@/components/ui/toast";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
}

const WORKSPACE_NAV_ITEMS: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Projects", href: "/dashboard/projects", icon: Briefcase, badge: 6 },
  {
    label: "Asset Library",
    href: "/dashboard/assets",
    icon: ImageIcon,
    badge: 8,
  },
  {
    label: "Collections",
    href: "/dashboard/collections",
    icon: FolderKanban,
    badge: 5,
  },
  { label: "Clients", href: "/dashboard/clients", icon: Users, badge: 4 },
  { label: "Activity", href: "/dashboard/activity", icon: Activity },
  { label: "Portfolio", href: "/dashboard/portfolio", icon: Grid },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function WorkspaceShell({
  children,
  sessionUser,
}: {
  children: React.ReactNode;
  sessionUser?: AuthenticatedSessionUser;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();

  const activeUser = sessionUser ?? {
    id: DEMO_DESIGNER_PROFILE.id,
    email: "sora@pixelforge.studio",
    displayName: DEMO_DESIGNER_PROFILE.displayName,
    username: DEMO_DESIGNER_PROFILE.username,
    role: "owner" as const,
    emailVerified: true,
  };

  const initials = React.useMemo(() => {
    const parts = activeUser.displayName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return activeUser.displayName.slice(0, 2).toUpperCase() || "PF";
  }, [activeUser.displayName]);

  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [notifications, setNotifications] = React.useState<InAppNotification[]>([]);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  const loadNotifications = React.useCallback(async () => {
    try {
      const res = await fetch("/api/v1/notifications");
      const json = await res.json();
      if (res.ok && json.data?.notifications) {
        setNotifications(json.data.notifications);
      }
    } catch {
      // Graceful offline fallback
    }
  }, []);

  React.useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const totalStorageUsed = React.useMemo(
    () => DEMO_ASSETS.reduce((acc, item) => acc + item.fileSize, 0),
    []
  );
  const storageQuotaBytes = 1024 * 1024 * 1024;
  const storagePercent = Math.min(
    100,
    Math.round((totalStorageUsed / storageQuotaBytes) * 100)
  );

  React.useEffect(() => {
    setMobileMenuOpen(false);
    setNotificationsOpen(false);
    setProfileMenuOpen(false);
  }, [pathname]);

  const breadcrumbs = React.useMemo(() => {
    const segments = pathname.split("/").filter(Boolean);
    return segments.map((seg, index) => {
      const href = "/" + segments.slice(0, index + 1).join("/");
      const label =
        seg === "dashboard"
          ? "Workspace"
          : seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      return { label, href };
    });
  }, [pathname]);

  const handleGlobalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    router.push(`/dashboard/assets?q=${encodeURIComponent(trimmed)}`);
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch("/api/v1/notifications/mark-all-read", { method: "POST" });
      setNotifications((prev) =>
        prev.map((item) => ({ ...item, readAt: new Date().toISOString() }))
      );
      toast({
        title: "Notifications cleared",
        description: "All workspace notifications have been marked as read.",
        variant: "success",
      });
    } catch {
      setNotifications((prev) =>
        prev.map((item) => ({ ...item, readAt: new Date().toISOString() }))
      );
    }
  };

  const handleNotificationClick = async (notif: InAppNotification) => {
    if (!notif.readAt) {
      try {
        await fetch(`/api/v1/notifications/${notif.id}`, { method: "PATCH" });
        setNotifications((prev) =>
          prev.map((item) =>
            item.id === notif.id
              ? { ...item, readAt: new Date().toISOString() }
              : item
          )
        );
      } catch {
        // Fallback
      }
    }
    setNotificationsOpen(false);
    if (notif.payload?.actionUrl) {
      router.push(notif.payload.actionUrl);
    }
  };

  const handleSignOut = async () => {
    setIsLoggingOut(true);
    try {
      await fetch("/api/v1/auth/logout", { method: "POST" });
      toast({
        title: "Signed out of PIXELFORGE",
        description: "Your studio session has been terminated.",
        variant: "info",
      });
      router.push("/login");
      router.refresh();
    } finally {
      setIsLoggingOut(false);
    }
  };

  const isNavItemActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      {/* Desktop Collapsible Sidebar */}
      <aside
        aria-label="Workspace Sidebar"
        className={cn(
          "hidden lg:flex flex-col border-r border-border bg-background-secondary transition-all duration-200 shrink-0 sticky top-0 h-screen",
          collapsed ? "w-[76px]" : "w-[264px]"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          <Logo compact={collapsed} href="/dashboard" />
          <button
            type="button"
            onClick={() => setCollapsed((prev) => !prev)}
            className="rounded-md p-1.5 text-foreground-muted hover:bg-background-elevated hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          <nav aria-label="Workspace Navigation" className="space-y-1">
            {WORKSPACE_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isNavItemActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "group flex items-center justify-between rounded-md px-3 py-2.5 text-sm font-medium transition-all",
                    active
                      ? "bg-accent-primary/15 text-accent-primary border border-accent-primary/30 shadow-forge-sm"
                      : "text-foreground-muted hover:bg-background-elevated/70 hover:text-foreground border border-transparent"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0 transition-colors",
                        active
                          ? "text-accent-primary"
                          : "text-foreground-muted group-hover:text-foreground"
                      )}
                    />
                    {!collapsed && (
                      <span className="truncate">{item.label}</span>
                    )}
                  </div>
                  {!collapsed && item.badge !== undefined && (
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 font-mono text-[11px]",
                        active
                          ? "bg-accent-primary/20 text-accent-primary"
                          : "bg-background-card text-foreground-muted"
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {!collapsed && (
            <div className="rounded-lg border border-border bg-background-card p-3.5 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono uppercase tracking-wider text-foreground-muted">
                  Bucket Quota
                </span>
                <span className="font-mono text-accent-secondary">
                  {formatFileSize(totalStorageUsed)} / 1 GB
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-background-secondary">
                <div
                  className="h-full rounded-full bg-forge-gradient transition-all"
                  style={{ width: `${Math.max(8, storagePercent)}%` }}
                />
              </div>
              <p className="font-mono text-[11px] text-foreground-muted">
                BUCKET: creative-assets (PRIVATE)
              </p>
            </div>
          )}
        </div>

        <div className="border-t border-border p-3">
          <Link
            href="/"
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-xs font-medium text-foreground-muted hover:bg-background-elevated hover:text-foreground transition-colors",
              collapsed && "justify-center"
            )}
            title="View Public Landing Page"
          >
            <ExternalLink className="h-4 w-4 shrink-0 text-accent-secondary" />
            {!collapsed && <span>Public Portfolio Site</span>}
          </Link>
        </div>
      </aside>

      {/* Mobile & Tablet Navigation Drawer */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden flex"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Workspace Navigation"
        >
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative z-10 flex w-72 max-w-[85vw] flex-col border-r border-border bg-background-secondary h-full">
            <div className="flex h-16 items-center justify-between border-b border-border px-4">
              <Logo href="/dashboard" />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation drawer"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              {WORKSPACE_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = isNavItemActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center justify-between rounded-md px-3 py-2.5 text-sm font-medium",
                      active
                        ? "bg-accent-primary/15 text-accent-primary border border-accent-primary/30"
                        : "text-foreground-muted hover:bg-background-elevated hover:text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== undefined && (
                      <span className="rounded bg-background-card px-1.5 py-0.5 font-mono text-[11px] text-foreground-muted">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-border p-4 flex items-center justify-between">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 text-xs font-medium text-accent-secondary"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Public Site
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="flex items-center gap-1.5 text-xs font-medium text-status-error"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top Navigation Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border forge-glass px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="lg:hidden shrink-0"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open workspace navigation"
            >
              <Menu className="h-4 w-4" />
            </Button>

            {/* Breadcrumbs */}
            <nav
              aria-label="Breadcrumb"
              className="flex items-center gap-1.5 text-sm overflow-x-auto whitespace-nowrap"
            >
              {breadcrumbs.map((crumb, idx) => {
                const isLast = idx === breadcrumbs.length - 1;
                return (
                  <React.Fragment key={crumb.href}>
                    {idx > 0 && (
                      <span className="font-mono text-xs text-foreground-muted">
                        /
                      </span>
                    )}
                    {isLast ? (
                      <span className="font-medium text-foreground">
                        {crumb.label}
                      </span>
                    ) : (
                      <Link
                        href={crumb.href}
                        className="text-foreground-muted hover:text-foreground transition-colors"
                      >
                        {crumb.label}
                      </Link>
                    )}
                  </React.Fragment>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Global Search */}
            <form
              onSubmit={handleGlobalSearch}
              className="hidden md:flex items-center relative w-64 lg:w-72"
            >
              <Search className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-foreground-muted" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search assets, filenames, tags..."
                aria-label="Search assets"
                className="h-9 w-full rounded-md border border-border bg-background-secondary pl-9 pr-3 text-xs text-foreground placeholder:text-foreground-muted focus:border-accent-primary focus:outline-none"
              />
            </form>

            <ThemeToggle />

            {/* Notifications Menu */}
            <div className="relative">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => {
                  setNotificationsOpen((prev) => !prev);
                  setProfileMenuOpen(false);
                }}
                aria-label="Open notifications"
                aria-expanded={notificationsOpen}
                className="relative"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent-primary px-1 font-mono text-[10px] font-bold text-[#09090F]">
                    {unreadCount}
                  </span>
                )}
              </Button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-lg border border-border-strong bg-background-card p-4 shadow-forge-card z-50">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground">
                        Notifications
                      </h3>
                      <Badge variant="primary">{unreadCount} unread</Badge>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllRead}
                        className="inline-flex items-center gap-1 text-xs text-accent-secondary hover:underline"
                      >
                        <CheckCheck className="h-3.5 w-3.5" />
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="mt-3 max-h-72 overflow-y-auto space-y-2.5">
                    {notifications.length === 0 ? (
                      <p className="text-center text-xs text-foreground-muted py-6">
                        No notifications yet.
                      </p>
                    ) : (
                      notifications.map((event) => {
                        const isUnread = !event.readAt;
                        return (
                          <div
                            key={event.id}
                            onClick={() => handleNotificationClick(event)}
                            className={cn(
                              "rounded-md border p-2.5 text-xs transition-colors cursor-pointer text-left",
                              isUnread
                                ? "border-accent-primary/35 bg-accent-primary/5 hover:bg-accent-primary/10"
                                : "border-border bg-background-secondary/50 hover:bg-background-secondary"
                            )}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-foreground">
                                {event.payload?.summary || event.eventType}
                              </span>
                              {isUnread && (
                                <span className="h-2 w-2 rounded-full bg-accent-primary shrink-0" />
                              )}
                            </div>
                            <p className="mt-1 text-foreground-muted">
                              {event.payload?.detail || ""}
                            </p>
                            <p className="mt-1.5 font-mono text-[10px] text-foreground-muted">
                              {formatTechnicalTimestamp(event.createdAt)}
                            </p>
                          </div>
                        );
                      })
                    )}
                  </div>
                  <div className="mt-3 border-t border-border pt-2.5 text-center">
                    <Link
                      href="/dashboard/activity"
                      onClick={() => setNotificationsOpen(false)}
                      className="text-xs font-medium text-accent-primary hover:underline"
                    >
                      View full activity audit log →
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setProfileMenuOpen((prev) => !prev);
                  setNotificationsOpen(false);
                }}
                aria-expanded={profileMenuOpen}
                aria-label="Open profile menu"
                className="flex items-center gap-2.5 rounded-md border border-border bg-background-card px-2.5 py-1.5 text-left hover:border-accent-primary/40 transition-colors"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded bg-forge-gradient font-mono text-xs font-bold text-[#09090F]">
                  {initials}
                </div>
                <div className="hidden sm:block leading-none">
                  <p className="text-xs font-medium text-foreground">
                    {activeUser.displayName}
                  </p>
                  <p className="font-mono text-[10px] text-accent-secondary mt-0.5 uppercase">
                    {activeUser.role}
                  </p>
                </div>
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-lg border border-border-strong bg-background-card p-2 shadow-forge-card z-50">
                  <div className="border-b border-border px-3 py-2.5">
                    <p className="text-xs font-semibold text-foreground">
                      {activeUser.displayName}
                    </p>
                    <p className="font-mono text-[11px] text-foreground-muted truncate">
                      {activeUser.email}
                    </p>
                    <p className="font-mono text-[10px] text-accent-primary mt-0.5">
                      @{activeUser.username} · {activeUser.role.toUpperCase()}
                    </p>
                  </div>
                  <div className="py-1">
                    <Link
                      href="/dashboard/portfolio"
                      className="flex items-center gap-2 rounded px-3 py-2 text-xs text-foreground hover:bg-background-elevated"
                    >
                      <Grid className="h-3.5 w-3.5 text-accent-primary" />
                      Portfolio Editor
                    </Link>
                    <Link
                      href="/dashboard/settings"
                      className="flex items-center gap-2 rounded px-3 py-2 text-xs text-foreground hover:bg-background-elevated"
                    >
                      <Settings className="h-3.5 w-3.5 text-accent-secondary" />
                      Studio Settings
                    </Link>
                    <Link
                      href="/"
                      className="flex items-center gap-2 rounded px-3 py-2 text-xs text-foreground hover:bg-background-elevated"
                    >
                      <ExternalLink className="h-3.5 w-3.5 text-foreground-muted" />
                      Public Landing Page
                    </Link>
                  </div>
                  <div className="border-t border-border pt-1">
                    <button
                      type="button"
                      disabled={isLoggingOut}
                      onClick={handleSignOut}
                      className="flex w-full items-center gap-2 rounded px-3 py-2 text-xs text-status-error hover:bg-status-error/10 disabled:opacity-50"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      {isLoggingOut ? "Signing out..." : "Sign Out"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Workspace Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
