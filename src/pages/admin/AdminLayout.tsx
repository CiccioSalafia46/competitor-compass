import { NavLink, Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, Building2, ScrollText, Plug, Shield,
  ArrowLeft, AlertTriangle, KeyRound, Server, CreditCard,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { DarkModeToggle } from "@/components/DarkModeToggle";

type NavItem = {
  to: string;
  icon: LucideIcon;
  label: string;
  end?: boolean;
};

type NavSection = {
  label: string;
  items: NavItem[];
};

const navSections: NavSection[] = [
  {
    label: "Platform",
    items: [
      { to: "/admin", icon: LayoutDashboard, label: "Overview", end: true },
      { to: "/admin/health", icon: Server, label: "System Health" },
    ],
  },
  {
    label: "Management",
    items: [
      { to: "/admin/users", icon: Users, label: "Users" },
      { to: "/admin/workspaces", icon: Building2, label: "Workspaces" },
      { to: "/admin/issues", icon: AlertTriangle, label: "Issues" },
      { to: "/admin/logs", icon: ScrollText, label: "Audit Logs" },
    ],
  },
  {
    label: "Operations",
    items: [
      { to: "/admin/integrations", icon: Plug, label: "Integrations" },
      { to: "/admin/billing", icon: CreditCard, label: "Billing" },
    ],
  },
  {
    label: "Configuration",
    items: [
      { to: "/admin/secrets", icon: KeyRound, label: "Secrets & Config" },
    ],
  },
];

export default function AdminLayout() {
  return (
    <div className="min-h-screen flex bg-background">
      {/* ─── Sidebar ─────────────────────────────────────────────── */}
      <aside className="w-[220px] shrink-0 border-r bg-card flex flex-col">

        {/* Brand */}
        <div className="flex h-14 items-center gap-2.5 border-b px-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm shadow-primary/30">
            <Shield className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-foreground leading-none">Admin Console</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Internal Operations</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          {navSections.map((section) => (
            <div key={section.label}>
              <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/50 select-none">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] transition-all duration-100",
                        isActive
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon className={cn("h-3.5 w-3.5 shrink-0", isActive ? "text-primary" : "")} />
                        {item.label}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t p-2 space-y-0.5">
          <NavLink
            to="/dashboard"
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[13px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
            Back to App
          </NavLink>
          <div className="flex items-center justify-between px-2.5 py-1.5">
            <span className="text-[12px] text-muted-foreground">Theme</span>
            <DarkModeToggle />
          </div>
        </div>
      </aside>

      {/* ─── Main Content ─────────────────────────────────────────── */}
      <main className="flex-1 min-w-0 overflow-auto bg-background">
        <Outlet />
      </main>
    </div>
  );
}
