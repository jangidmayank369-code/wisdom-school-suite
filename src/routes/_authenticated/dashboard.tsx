import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { getDashboard } from "@/lib/erp.functions";
import { useErp } from "@/components/erp/AppShell";
import { Card, MoneyStat, PageHeader, SectionTitle, StatCard } from "@/components/erp/parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fmtDate, fmtMoney, num, todayISO } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

type RangeKey = "today" | "7d" | "month" | "year" | "session" | "custom";

function rangeFor(key: RangeKey, session?: { start_date: string; end_date: string } | null): { from: string; to: string } {
  const now = new Date();
  const t = todayISO();
  switch (key) {
    case "today":
      return { from: t, to: t };
    case "7d": {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      return { from: d.toISOString().slice(0, 10), to: t };
    }
    case "month":
      return { from: t.slice(0, 8) + "01", to: t };
    case "year":
      return { from: t.slice(0, 4) + "-01-01", to: t };
    case "session":
      return { from: session?.start_date ?? t, to: session?.end_date ?? t };
    default:
      return { from: t, to: t };
  }
}

const RANGES: { key: RangeKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7 days" },
  { key: "month", label: "This month" },
  { key: "year", label: "This year" },
  { key: "session", label: "Session" },
  { key: "custom", label: "Custom" },
];

function DashboardPage() {
  const { activeSession, can } = useErp();
  const [rangeKey, setRangeKey] = useState<RangeKey>("month");
  const [customFrom, setCustomFrom] = useState(todayISO().slice(0, 8) + "01");
  const [customTo, setCustomTo] = useState(todayISO());

  const range = rangeKey === "custom" ? { from: customFrom, to: customTo } : rangeFor(rangeKey, activeSession);
  const fetchDashboard = useServerFn(getDashboard);
  const { data } = useSuspenseQuery(
    queryOptions({
      queryKey: ["dashboard", activeSession?.id, range.from, range.to],
      queryFn: () => fetchDashboard({ data: { sessionId: activeSession?.id, from: range.from, to: range.to } }),
    })
  );

  const expensePct = useMemo(() => {
    const total = data.byCategory.reduce((a, c) => a + num(c.amount), 0);
    return (cat: string) => (total ? Math.round((num(cat) / total) * 100) : 0);
  }, [data.byCategory]);

  return (
    <div>
      <PageHeader title="Dashboard" subtitle={`${fmtDate(range.from)} – ${fmtDate(range.to)}`} />

      <div className="mb-4 flex flex-wrap gap-1.5">
        {RANGES.map((r) => (
          <button
            key={r.key}
            onClick={() => setRangeKey(r.key)}
            className={
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors " +
              (rangeKey === r.key
                ? "bg-primary text-primary-foreground"
                : "border bg-card text-muted-foreground hover:bg-accent")
            }
          >
            {r.label}
          </button>
        ))}
      </div>
      {rangeKey === "custom" && (
        <div className="mb-4 flex items-end gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-xs text-muted-foreground">From</label>
            <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs text-muted-foreground">To</label>
            <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <MoneyStat label="Fee collection" value={data.collectionTotal} tone="success" hint={`Today: ${fmtMoney(data.collectionToday)}`} />
        <MoneyStat label="Other income" value={data.incomeOther} />
        <MoneyStat label="Total income" value={data.incomeTotal} tone="primary" />
        <MoneyStat label="Expenses" value={data.expenseTotal} tone="danger" hint={`Today: ${fmtMoney(data.expenseToday)}`} />
        <MoneyStat label="Net (income − expense)" value={data.net} tone={data.net >= 0 ? "success" : "danger"} />
        <MoneyStat label="Pending fees" value={data.pendingFees} tone="warning" hint={`${data.pendingStudents} students`} />
        <MoneyStat label="Salary due (saved payroll)" value={data.salaryDue} tone="warning" hint={`Paid: ${fmtMoney(data.salaryPaid)}`} />
        <StatCard label="Active students" value={String(data.students)} />
      </div>

      {can("accounts") && (
        <>
          <SectionTitle>Expenses by category</SectionTitle>
          <Card className="divide-y p-0">
            {data.byCategory.length === 0 && <p className="p-4 text-sm text-muted-foreground">No expenses in this period.</p>}
            {data.byCategory.map((c) => (
              <div key={c.category} className="flex items-center gap-3 px-4 py-2.5">
                <span className="w-28 shrink-0 truncate text-sm font-medium md:w-40">{c.category}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary/70"
                    style={{ width: `${Math.max(2, expensePct(String(c.amount)))}%` }}
                  />
                </div>
                <span className="w-24 shrink-0 text-right text-sm font-semibold tabular-nums">{fmtMoney(c.amount)}</span>
              </div>
            ))}
          </Card>
        </>
      )}

      <SectionTitle>Recent transactions</SectionTitle>
      <Card className="divide-y p-0">
        {data.recent.length === 0 && <p className="p-4 text-sm text-muted-foreground">No transactions yet.</p>}
        {data.recent.map((t: any) => (
          <div key={t.id} className="flex items-center gap-3 px-4 py-2.5">
            <span
              className={
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold " +
                (t.type === "income" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700")
              }
            >
              {t.type === "income" ? "＋" : "−"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{t.category}</p>
              <p className="truncate text-xs text-muted-foreground">
                {fmtDate(t.txn_date)} · {t.payment_mode}
                {t.description ? ` · ${t.description}` : ""}
              </p>
            </div>
            <span className={"shrink-0 text-sm font-semibold tabular-nums " + (t.type === "income" ? "text-emerald-600" : "text-destructive")}>
              {t.type === "income" ? "+" : "−"}
              {fmtMoney(t.amount)}
            </span>
          </div>
        ))}
      </Card>

      <div className="mt-4 hidden md:block">
        <Button variant="outline" onClick={() => window.location.reload()} className="hidden">
          Refresh
        </Button>
      </div>
    </div>
  );
}
