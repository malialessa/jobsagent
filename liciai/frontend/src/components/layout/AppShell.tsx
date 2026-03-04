import { useEffect, useState } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { useAuth } from "@/lib/auth";

interface AppShellProps {
  breadcrumb?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

export function AppShell({ breadcrumb, action, children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = "/login.html";
    }
  }, [loading, user]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg)]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--line)] border-t-[var(--gold)]" />
          <span className="text-sm font-semibold text-[var(--muted)]">Carregando…</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-[var(--bg)]">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-1 min-w-0 flex-col">
        <Topbar
          onOpenSidebar={() => setSidebarOpen(true)}
          breadcrumb={breadcrumb}
          action={action}
        />
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

