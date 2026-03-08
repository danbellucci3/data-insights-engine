import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { BarChart3, Upload, MessageSquare, LayoutDashboard, LogOut, Database } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/upload", icon: Upload, label: "Importar Dados" },
  { to: "/dados", icon: Database, label: "Dados" },
  { to: "/chat", icon: MessageSquare, label: "Chat IA" },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { signOut, user } = useAuth();
  const location = useLocation();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary">
            <BarChart3 className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          <span className="text-lg font-bold text-sidebar-primary-foreground">FinAnalytics</span>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {navItems.map(({ to, icon: Icon, label }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                location.pathname === to
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-sidebar-border p-4">
          <div className="mb-3 truncate text-xs text-sidebar-foreground/60">{user?.email}</div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center justify-between border-b bg-card px-4 md:hidden">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <span className="font-bold">FinAnalytics</span>
          </div>
          <div className="flex gap-1">
            {navItems.map(({ to, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={cn(
                  "rounded-lg p-2",
                  location.pathname === to ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
              </Link>
            ))}
            <button onClick={signOut} className="rounded-lg p-2 text-muted-foreground">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
