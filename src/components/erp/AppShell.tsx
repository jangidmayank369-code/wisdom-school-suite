import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type SessionRow = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  archived: boolean;
};

export type Bootstrap = {
  userId: string;
  sessions: SessionRow[];
  settings: { school_name: string; currency: string } | null;
  profile: { full_name: string; username: string | null; active: boolean } | null;
  roles: string[];
  modules: string[];
  myStaff: { id: string; name: string; designation: string | null; monthly_salary: number } | null;
  email: string;
};

type ErpCtx = {
  bootstrap: Bootstrap;
  profile: Bootstrap["profile"];
  role: "admin" | "accountant" | "staff";
  userId: string;
  isAdmin: boolean;
  isFinance: boolean;
  isStaffOnly: boolean;
  can: (module: string) => boolean;
  activeSession: SessionRow | null;
  setActiveSessionId: (id: string) => void;
  userName: string;
};

const Ctx = createContext<ErpCtx | null>(null);

export function useErp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useErp must be used inside AppShell");
  return ctx;
}

const ACCOUNTANT_MODULES = [
  "dashboard",
  "sessions",
  "students",
  "fees",
  "staff",
  "payroll",
  "transport",
  "maintenance",
  "accounts",
  "reports",
];

const NAV: { to: string; label: string; module: string; icon: ReactNode }[] = [
  {
    to: "/dashboard",
    label: "Dashboard",
    module: "dashboard",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9" rx="1" />
        <rect x="14" y="3" width="7" height="5" rx="1" />
        <rect x="14" y="12" width="7" height="9" rx="1" />
        <rect x="3" y="16" width="7" height="5" rx="1" />
      </svg>
    ),
  },
  {
    to: "/students",
    label: "Students",
    module: "students",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    to: "/fees",
    label: "Fees",
    module: "fees",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M2 10h20" />
      </svg>
    ),
  },
  {
    to: "/staff",
    label: "Staff",
    module: "staff",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    to: "/attendance",
    label: "Attendance",
    module: "attendance",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 2v4M16 2v4" />
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M9 16l2 2 4-4" />
      </svg>
    ),
  },
  {
    to: "/leave",
    label: "Leave",
    module: "leave",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
      </svg>
    ),
  },
  {
    to: "/transport",
    label: "Transport",
    module: "transport",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 6v6M15 6v6M2 12h19.6M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3" />
        <circle cx="7" cy="18" r="2" />
        <path d="M9 18h5" />
        <circle cx="16" cy="18" r="2" />
      </svg>
    ),
  },
  {
    to: "/maintenance",
    label: "Maintenance",
    module: "maintenance",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    ),
  },
  {
    to: "/accounts",
    label: "Accounts",
    module: "accounts",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18" />
        <path d="M7 16v-5M12 16V8M17 16v-3" />
      </svg>
    ),
  },
  {
    to: "/sessions",
    label: "Sessions",
    module: "sessions",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    ),
  },
  {
    to: "/reports",
    label: "Reports",
    module: "reports",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        <path d="M8 9h8M8 13h5" />
      </svg>
    ),
  },
];

const MODULE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  sessions: "Sessions",
  students: "Students",
  fees: "Fees",
  staff: "Staff & Payroll",
  attendance: "Attendance",
  leave: "Leave",
  transport: "Transport",
  maintenance: "Maintenance",
  accounts: "Accounts",
  reports: "Reports",
};

const MODULE_DESCS: Record<string, string> = {
  dashboard: "School-wide collection, expenses and recent activity",
  sessions: "Create academic sessions and set the active one",
  students: "Admissions, student profiles and fee status",
  fees: "Fee collection, receipts and pending dues",
  staff: "Staff profiles, salary payments and monthly payroll",
  attendance: "Mark and review daily staff attendance",
  leave: "Apply for leave and review requests",
  transport: "Vehicles, routes, driver KM and transport expenses",
  maintenance: "School maintenance work and expenses",
  accounts: "Central income and expense ledger",
  reports: "Exportable reports across all modules",
};

export const MODULES: { module: string; label: string; desc: string }[] = [
  "dashboard",
  "students",
  "fees",
  "staff",
  "payroll",
  "attendance",
  "leave",
  "transport",
  "maintenance",
  "accounts",
  "reports",
  "sessions",
].map((m) => ({
  module: m,
  label: MODULE_LABELS[m] ?? m,
  desc: MODULE_DESCS[m] ?? "",
}));

const MORE_LINKS = NAV.filter((n) => !["dashboard", "students", "fees", "staff"].includes(n.module)).map((n) => ({
  to: n.to,
  label: n.label,
  module: n.module,
  desc: MODULE_DESCS[n.module] ?? "",
}));

const BottomIcon = ({ children, active }: { children: ReactNode; active: boolean }) => (
  <span className={active ? "text-primary" : "text-muted-foreground"}>{children}</span>
);

export function AppShell({ bootstrap, children }: { bootstrap: Bootstrap; children: ReactNode }) {
  const roles = bootstrap.roles ?? [];
  const isAdmin = roles.includes("admin");
  const isAccountant = roles.includes("accountant");
  const isFinance = isAdmin || isAccountant;
  const isStaffOnly = !isFinance && roles.includes("staff");
  const qc = useQueryClient();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const can = (module: string) => {
    if (isAdmin) return true;
    if (isAccountant) return ACCOUNTANT_MODULES.includes(module);
    return (bootstrap.modules ?? []).includes(module);
  };

  const initialActive = bootstrap.sessions.find((s) => s.is_active) ?? bootstrap.sessions[0] ?? null;
  const [activeSessionId, setActiveSessionId] = useState<string | null>(initialActive?.id ?? null);

  useEffect(() => {
    if (!activeSessionId && initialActive) setActiveSessionId(initialActive.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialActive?.id]);

  const activeSession = useMemo(
    () => bootstrap.sessions.find((s) => s.id === activeSessionId) ?? initialActive,
    [activeSessionId, bootstrap.sessions, initialActive]
  );

  const ctx: ErpCtx = {
    bootstrap,
    profile: bootstrap.profile,
    role: isAdmin ? "admin" : isAccountant ? "accountant" : "staff",
    userId: bootstrap.userId,
    isAdmin,
    isFinance,
    isStaffOnly,
    can,
    activeSession,
    setActiveSessionId: (id) => setActiveSessionId(id),
    userName: bootstrap.profile?.full_name || bootstrap.email || "User",
  };

  const visibleNav = NAV.filter((n) => {
    if (isStaffOnly) return ["dashboard", "staff", "attendance", "leave"].includes(n.module);
    return can(n.module);
  });
  const bottomNav = visibleNav.slice(0, 4);
  const moreVisible = isStaffOnly ? visibleNav.length > 4 : MORE_LINKS.some((n) => visibleNav.includes(n));

  const signOut = async () => {
    await supabase.auth.signOut();
    qc.clear();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <Ctx.Provider value={ctx}>
      <div className="min-h-screen bg-background pb-20 md:pb-8">
        <header className="sticky top-0 z-40 border-b bg-primary text-primary-foreground shadow-sm">
          <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2.5">
            <Link to="/dashboard" className="flex items-center gap-2.5 min-w-0">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-foreground/15">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                  <path d="M6 12v5c3 3 9 3 12 0v-5" />
                </svg>
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold leading-tight">Wisdom Public School</span>
                <span className="block text-[11px] leading-tight text-primary-foreground/70">ERP &amp; Accounts · Doomra</span>
              </span>
            </Link>
            <div className="ml-auto flex items-center gap-2">
              {bootstrap.sessions.length > 0 && (
                <Select value={activeSession?.id ?? ""} onValueChange={setActiveSessionId}>
                  <SelectTrigger className="h-8 w-[110px] border-primary-foreground/25 bg-primary-foreground/10 text-xs text-primary-foreground [&>svg]:text-primary-foreground/70">
                    <SelectValue placeholder="Session" />
                  </SelectTrigger>
                  <SelectContent>
                    {bootstrap.sessions.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <button
                onClick={signOut}
                className="hidden rounded-lg border border-primary-foreground/25 px-2.5 py-1.5 text-xs font-medium hover:bg-primary-foreground/10 md:block"
              >
                Sign out
              </button>
            </div>
          </div>
          {!isStaffOnly && (
            <nav className="mx-auto hidden max-w-5xl gap-1 overflow-x-auto px-3 pb-2 md:flex">
              {visibleNav.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  className={
                    "whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors " +
                    (pathname.startsWith(n.to)
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "text-primary-foreground/75 hover:bg-primary-foreground/10")
                  }
                >
                  {n.label}
                </Link>
              ))}
              <button
                onClick={signOut}
                className="ml-auto whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium text-primary-foreground/75 hover:bg-primary-foreground/10"
              >
                Sign out ({ctx.userName})
              </button>
            </nav>
          )}
        </header>

        <main className="mx-auto max-w-5xl px-3 py-4 md:px-4 md:py-6">{children}</main>

        {/* Mobile bottom nav */}
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur md:hidden">
          <div className="mx-auto grid max-w-lg grid-cols-5">
            {bottomNav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className={
                  "flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium " +
                  (pathname.startsWith(n.to) ? "text-primary" : "text-muted-foreground")
                }
              >
                <BottomIcon active={pathname.startsWith(n.to)}>{n.icon}</BottomIcon>
                {n.label}
              </Link>
            ))}
            <Link
              to="/more"
              className={
                "flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium " +
                (pathname.startsWith("/more") ? "text-primary" : "text-muted-foreground")
              }
            >
              <BottomIcon active={pathname.startsWith("/more")}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="1" />
                  <circle cx="12" cy="5" r="1" />
                  <circle cx="12" cy="19" r="1" />
                </svg>
              </BottomIcon>
              More
            </Link>
          </div>
        </nav>
      </div>
    </Ctx.Provider>
  );
}

export { MORE_LINKS, MODULES };
