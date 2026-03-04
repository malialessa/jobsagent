import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Settings,
  ClipboardList,
  CreditCard,
  X,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

const NAV = [
  { to: "/radar",     icon: LayoutDashboard, label: "Dashboard" },
  { to: "/documentos",icon: FileText,        label: "Documentos (IA)" },
  { to: "/perfil",    icon: Settings,        label: "Perfil & Radar" },
  { to: "/plano",     icon: ClipboardList,   label: "Plano de execução" },
  { to: "/planos",    icon: CreditCard,      label: "Planos & Billing" },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { user } = useAuth();
  const initials = user?.displayName
    ? user.displayName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? "?";
  const displayName = user?.displayName || user?.email?.split("@")[0] || "Usuário";

  return (
    <>
      {/* Overlay mobile */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed md:static inset-y-0 left-0 z-50 flex w-56 flex-col border-r transition-transform duration-300 ease-out",
          "border-[var(--line)] bg-[var(--panel)]",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Header */}
        <div className="flex h-12 items-center gap-2.5 border-b border-[var(--line)] px-4">
          {/* Logo */}
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg shrink-0"
            style={{ background: "var(--panel-gold)", boxShadow: "inset 0 0 0 1px rgba(228,164,20,.4)" }}
          >
            <svg viewBox="0 0 28 28" className="h-4 w-4" fill="none">
              <rect x="0"  y="18" width="5" height="10" rx="1.5" fill="#E4A414" />
              <rect x="7"  y="12" width="5" height="16" rx="1.5" fill="#7D6445" />
              <rect x="14" y="6"  width="5" height="22" rx="1.5" fill="#6A01BB" />
              <rect x="21" y="0"  width="5" height="28" rx="1.5" fill="#E4A414" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-extrabold text-[var(--text)] leading-tight">Efetiva</div>
            <div className="text-[10px] font-semibold text-[var(--muted)] truncate">Plataforma de licitações</div>
          </div>
          <button
            onClick={onClose}
            className="md:hidden p-1.5 rounded-lg text-[var(--text)] hover:bg-[var(--panel-soft)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-3">
          <div className="mb-2 px-2 text-[9px] font-extrabold uppercase tracking-widest text-[var(--muted)]">Menu</div>
          <div className="space-y-0.5">
            {NAV.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold transition-colors",
                    isActive
                      ? "bg-[var(--panel-gold)] text-[var(--gold)]"
                      : "text-[var(--muted)] hover:bg-[var(--panel-soft)] hover:text-[var(--text)]"
                  )
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* User */}
        <div className="border-t border-[var(--line)] p-3">
          <div className="flex items-center gap-2 px-1">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-[10px] font-extrabold text-white">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-extrabold text-[var(--text)]">{displayName}</div>
              <div className="truncate text-[10px] font-semibold text-[var(--muted)]">{user?.email ?? ""}</div>
            </div>
            <button
              onClick={() => signOut(auth)}
              title="Sair"
              className="shrink-0 text-[var(--muted)] hover:text-red-400 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
