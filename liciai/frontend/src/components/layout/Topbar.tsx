import { Menu, Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";

interface TopbarProps {
  onOpenSidebar: () => void;
  breadcrumb?: string;
  action?: React.ReactNode;
}

export function Topbar({ onOpenSidebar, breadcrumb, action }: TopbarProps) {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("efetiva_theme");
    const isDark = saved ? saved === "dark" : true;
    setDark(isDark);
    document.documentElement.classList.toggle("light", !isDark);
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("light", !next);
    localStorage.setItem("efetiva_theme", next ? "dark" : "light");
  }

  return (
    <header className="header-bg sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[var(--line)] px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenSidebar}
          className="md:hidden rounded-xl p-2 text-[var(--text)] hover:bg-[var(--panel-soft)]"
          aria-label="Abrir menu"
        >
          <Menu className="h-6 w-6" />
        </button>

        {breadcrumb && (
          <div className="hidden sm:flex items-center gap-2 text-sm font-extrabold">
            <span className="text-[var(--muted)]">Plataforma</span>
            <span className="text-[var(--muted)]">/</span>
            <span className="text-[var(--text)]">{breadcrumb}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={toggleTheme}
          className="rounded-xl p-2.5 text-[var(--text)] hover:bg-[var(--panel-soft)]"
          aria-label="Trocar tema"
        >
          {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        {action}
      </div>
    </header>
  );
}
