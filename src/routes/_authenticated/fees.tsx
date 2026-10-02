import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { getFeePaymentsList, getPendingFees } from "@/lib/erp.functions";
import { useErp } from "@/components/erp/AppShell";
import { Card, MoneyStat, PageHeader, SectionTitle } from "@/components/erp/parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { downloadCSV, fmtDate, fmtMoney, todayISO } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/fees")({
  component: FeesPage,
});

function FeesPage() {
  const { activeSession, isFinance } = useErp();
  const [tab, setTab] = useState<"history" | "pending">("history");
  const [from, setFrom] = useState(todayISO().slice(0, 8) + "01");
  const [to, setTo] = useState(todayISO());

  const fetchPayments = useServerFn(getFeePaymentsList);
  const payQ = useSuspenseQuery(
    queryOptions({
      queryKey: ["feePayments", activeSession?.id, from, to],
      queryFn: () => fetchPayments({ data: { sessionId: activeSession?.id, from, to } }),
    })
  );
  const payments = (payQ.data as any[]) ?? [];

  const fetchPending = useServerFn(getPendingFees);
  const pendQ = useSuspenseQuery(
    queryOptions({
      queryKey: ["pendingFees", activeSession?.id],
      queryFn: () => fetchPending({ data: { sessionId: activeSession?.id } }),
    })
  );
  const pending = pendQ.data as any;

  const totals = useMemo(() => {
    const active = payments.filter((p) => !p.voided);
    return {
      count: active.length,
      amount: active.reduce((a, p) => a + Number(p.amount), 0),
      cash: active.filter((p) => p.payment_mode === "Cash").reduce((a, p) => a + Number(p.amount), 0),
      digital: active
        .filter((p) => p.payment_mode !== "Cash")
        .reduce((a, p) => a + Number(p.amount), 0),
    };
  }, [payments]);

  const exportHistory = () => {
    downloadCSV(
      `fee-receipts-${from}-to-${to}.csv`,
      [
        ["Date", "Receipt", "Student", "Admission No", "Class", "Category", "Mode", "Amount", "Status", "Remarks"],
        ...payments.map((p: any) => [
          p.payment_date,
          p.receipt_no ?? "",
          p.students?.name ?? "",
          p.students?.admission_no ?? "",
          p.students ? `Class ${p.students.class_name}${p.students.section ? "-" + p.students.section : ""}` : "",
          p.category,
          p.payment_mode,
          String(p.amount),
          p.voided ? "REVERSED" : "OK",
          p.remarks ?? "",
        ]),
      ]
    );
  };

  const exportPending = () => {
    downloadCSV(
      "pending-fees.csv",
      [
        ["Admission No", "Student", "Class", "Charges", "Paid", "Pending"],
        ...(pending.rows as any[]).map((r) => [
          r.admission_no,
          r.name,
          `Class ${r.class_name}${r.section ? "-" + r.section : ""}`,
          String(r.charges),
          String(r.paid),
          String(r.balance),
        ]),
        ["", "", "TOTAL", String(pending.totalCharges), String(pending.totalPaid), String(pending.totalPending)],
      ]
    );
  };

  if (!isFinance) {
    return (
      <div>
        <PageHeader title="Fees" />
        <Card className="p-6 text-center text-sm text-muted-foreground">
          Fee accounts are visible to Admin and Accountant only.
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Fees" subtitle={activeSession ? activeSession.name : undefined} />

      <div className="mb-4 flex gap-1.5">
        {(["history", "pending"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={
              "rounded-full px-4 py-1.5 text-xs font-medium capitalize " +
              (tab === t ? "bg-primary text-primary-foreground" : "border bg-card text-muted-foreground")
            }
          >
            {t === "history" ? "Receipts" : "Pending report"}
          </button>
        ))}
      </div>

      {tab === "history" ? (
        <>
          <div className="mb-3 flex items-end gap-2">
            <div className="flex-1 space-y-1">
              <label className="text-xs text-muted-foreground">From</label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9" />
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-xs text-muted-foreground">To</label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9" />
            </div>
            <Button variant="outline" className="h-9" onClick={exportHistory}>
              Export
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <MoneyStat label="Receipts" value={totals.count} plain />
            <MoneyStat label="Collected" value={totals.amount} tone="success" />
            <MoneyStat label="Cash / Digital" value={totals.cash} hint={`Digital ${fmtMoney(totals.digital)}`} />
          </div>

          <SectionTitle>Receipts</SectionTitle>
          <Card className="divide-y p-0">
            {payments.length === 0 && <p className="p-4 text-sm text-muted-foreground">No receipts in this period.</p>}
            {payments.map((p: any) => (
              <div key={p.id} className={"flex items-center gap-3 px-4 py-2.5 " + (p.voided ? "opacity-50" : "")}>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.students?.name ?? "—"}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {p.receipt_no ?? ""} · {fmtDate(p.payment_date)} · {p.payment_mode} · {p.category}
                    {p.voided ? " · REVERSED" : ""}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-emerald-600">
                  {p.voided ? "−" : "+"}
                  {fmtMoney(p.amount)}
                </span>
              </div>
            ))}
          </Card>
        </>
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Students with a pending balance</p>
            <Button variant="outline" size="sm" onClick={exportPending}>
              Export CSV
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            <MoneyStat label="Students" value={pending.rows.length} plain />
            <MoneyStat label="Total charged" value={pending.totalCharges} />
            <MoneyStat label="Total pending" value={pending.totalPending} tone="danger" />
          </div>
          <SectionTitle>Pending by student</SectionTitle>
          <Card className="divide-y p-0">
            {(pending.rows as any[]).length === 0 && (
              <p className="p-4 text-sm text-muted-foreground">No pending fees. 🎉</p>
            )}
            {(pending.rows as any[]).map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{r.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    #{r.admission_no} · Class {r.class_name}
                    {r.section ? `-${r.section}` : ""}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold tabular-nums text-destructive">{fmtMoney(r.balance)}</p>
                  <p className="text-[11px] text-muted-foreground tabular-nums">paid {fmtMoney(r.paid)}</p>
                </div>
              </div>
            ))}
          </Card>
        </>
      )}
    </div>
  );
}
