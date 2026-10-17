import * as React from "react";
import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { getServerSessionUser } from "@/lib/auth/session";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessionUser = await getServerSessionUser();

  if (!sessionUser) {
    redirect("/login?next=/dashboard");
  }

  return <WorkspaceShell sessionUser={sessionUser}>{children}</WorkspaceShell>;
}
