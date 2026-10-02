import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  getFeePaymentsList,
  getMyAttendance,
  getPayrollMonth,
  getPendingFees,
  getTransactions,
} from "@/lib/erp.functions";
import { useErp } from "@/components/erp/AppShell";
import { Card, PageHeader, SectionTitle } from "@/components/erp/parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { downloadCSV, fmtMoney, todayISO } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/reports")({
  component: ReportsPage,
});

function ReportsPage() {
  const { activeSession, role, can, isFinance } = useErp();
  const today = todayISO();
  const [monthFrom, setMonthFrom] = useState(today.slice(0, 8) + "01");
  const [monthTo, setMonthTo] = useState(today);

  const fetchPending = useServerFn(getPendingFees);
  const pending = useQuery(
    queryOpts(["rep-pending", activeSession?.id], () =>
      fetchPending({ data: { sessionId: activeSession?.id } })
    )
  );

  const fetchTx = useServerFn(getTransactions);
  const tx = useQuery(
    queryOpts(["rep-tx", activeSession?.id, monthFrom, monthTo], () =>
      fetchTx({ data: { sessionId: activeSession?.id, from: monthFrom, to: monthTo } })
    )
  );

  const fetchPay = useServerFn(getPayrollMonth);
  const payroll = useQuery(
    queryOpts(["rep-payroll", activeSession?.id, today.slice(0, 7)], () =>
      fetchPay({ data: { sessionId: activeSession?.id, month: today.slice(0, 7) + "-01" } })
    )
  );

  const fetchFees = useServerFn(getFeePaymentsList);
  const receipts = useQuery(
    queryOpts(["rep-receipts", activeSession?.id, monthFrom, monthTo], () =>
      fetchFees({ data: { sessionId: activeSession?.id, from: monthFrom, to: monthTo } })
    )
  );

  const fetchAtt = useServerFn(getMyAttendance);
  const att = useQuery(
    queryOpts(["rep-att", today.slice(0, 7)], () => fetchAtt({ data: { month: today.slice(0, 7) } }))
  );

  const exportPending = () => {
    const d = pending.data as any;
    if (!d) return;
    downloadCSV("report-pending-fees.csv", [
      ["Admission No", "Student", "Class", "Charges", "Paid", "Pending"],
      ...d.rows.map((r: any) => [r.admission_no, r.name, `Class ${r.class_name}${r.section ? "-" + r.section : ""}`, String(r.charges), String(r.paid), String(r.balance)]),
      ["", "", "TOTAL", String(d.totalCharges), String(d.totalPaid), String(d.totalPending)],
    ]);
  };

  const exportCollection = () => {
    const rows = ((receipts.data as any[]) ?? []).filter((p) => !p.voided);
    downloadCSV(`report-collection-${monthFrom}-to-${monthTo}.csv`, [
      ["Date", "Receipt", "Student", "Class", "Category", "Mode", "Amount"],
      ...rows.map((p) => [
        p.payment_date,
        p.receipt_no ?? "",
        p.students?.name ?? "",
        p.students ? `Class ${p.students.class_name}${p.students.section ? "-" + p.students.section : ""}` : "",
        p.category,
        p.payment_mode,
        String(p.amount),
      ]),
      ["", "", "", "", "", "TOTAL", String(rows.reduce((a, p) => a + Number(p.amount), 0))],
    ]);
  };

  const exportIncomeExpense = () => {
    const rows = (((tx.data as any)?.rows ?? []) as any[]).filter((t) => !t.voided);
    const inc = rows.filter((t) => t.type === "income");
    const exp = rows.filter((t) => t.type === "expense");
    downloadCSV(`report-income-expense-${monthFrom}-to-${monthTo}.csv`, [
      ["INCOME"],
      ["Date", "Category", "Mode", "Description", "Amount"],
      ...inc.map((t) => [t.txn_date, t.category, t.payment_mode, t.description ?? "", String(t.amount)]),
      ["", "", "", "TOTAL INCOME", String(inc.reduce((a, t) => a + Number(t.amount), 0))],
      [""],
      ["EXPENSE"],
      ["Date", "Category", "Mode", "Description", "Amount"],
      ...exp.map((t) => [t.txn_date, t.category, t.payment_mode, t.description ?? "", String(t.amount)]),
      ["", "", "", "TOTAL EXPENSE", String(exp.reduce((a, t) => a + Number(t.amount), 0))],
      [""],
      ["", "", "", "NET", String(inc.reduce((a, t) => a + Number(t.amount), 0) - exp.reduce((a, t) => a + Number(t.amount), 0))],
    ]);
  };

  const exportPayroll = () => {
    const rows = (payroll.data as any[]) ?? [];
    downloadCSV(`report-payroll-${today.slice(0, 7)}.csv`, [
      ["Staff", "Designation", "Monthly Salary", "Present", "Absent", "Half Days", "Leave", "Paid Days", "Computed Salary", "Paid", "Due"],
      ...rows.map((r) => {
        const computed = r.saved ? Number(r.saved.computed_salary) : r.computed;
        const paidDays = r.saved ? Number(r.saved.paid_days) : r.paidDays;
        const due = Math.max(0, computed - Number(r.paidMonth ?? 0));
        return [
          r.staff.name,
          r.staff.designation ?? "",
          String(r.staff.monthly_salary),
          String(r.present),
          String(r.absent),
          String(r.half),
          String(r.leave),
          String(paidDays),
          String(computed),
          String(r.paidMonth ?? 0),
          String(due),
        ];
      }),
      ["", "", "", "", "", "", "", "", "TOTAL", String(rows.reduce((a, r) => a + (r.saved ? Number(r.saved.computed_salary) : r.computed), 0)), String(rows.reduce((a, r) => a + Number(r.paidMonth ?? 0), 0))],
    ]);
  };

  const exportMyAttendance = () => {
    downloadCSV(`report-my-attendance-${monthFrom}-to-${monthTo}.csv`, [
      ["Date", "Status", "Marked By", "Remarks"],
      ...attRows.map((a) => [a.att_date, a.status, a.marked_by_name ?? "", a.remarks ?? ""]),
    ]);
  };

  const pendingData = pending.data as any;

  const attRows = (((att.data as any)?.records ?? []) as any[]).filter(
    (a) => a.att_date >= monthFrom && a.att_date <= monthTo
  );

  return (
    <div>
      <PageHeader title="Reports" subtitle="Download CSV files you can open in Excel" />

      <div className="mb-4 flex items-end gap-2">
        <div className="flex-1 space-y-1">
          <label className="text-xs text-muted-foreground">From</label>
          <Input type="date" className="h-9" value={monthFrom} onChange={(e) => setMonthFrom(e.target.value)} />
        </div>
        <div className="flex-1 space-y-1">
          <label className="text-xs text-muted-foreground">To</label>
          <Input type="date" className="h-9" value={monthTo} onChange={(e) => setMonthTo(e.target.value)} />
        </div>
      </div>

      {can("students") && (
        <>
          <SectionTitle>Fee reports</SectionTitle>
          <div className="grid gap-2.5 md:grid-cols-2">
            <ReportCard
              title="Pending fees"
              desc={
                pendingData
                  ? `${pendingData.rows.length} students · ${fmtMoney(pendingData.totalPending)} pending`
                  : "Loading…"
              }
              onExport={exportPending}
              loading={!pendingData}
            />
            <ReportCard
              title="Fee collection"
              desc={`Receipts ${monthFrom} → ${monthTo}`}
              onExport={exportCollection}
            />
          </div>
        </>
      )}

      {can("accounts") && (
        <>
          <SectionTitle>Accounts</SectionTitle>
          <div className="grid gap-2.5 md:grid-cols-2">
            <ReportCard
              title="Income & expense summary"
              desc={
                tx.data
                  ? `${(((tx.data as any)?.rows ?? []) as any[]).filter((t) => !t.voided).length} transactions in range`
                  : "Loading…"
              }
              onExport={exportIncomeExpense}
            />
          </div>
        </>
      )}

      {can("payroll") && (
        <>
          <SectionTitle>Staff & payroll</SectionTitle>
          <div className="grid gap-2.5 md:grid-cols-2">
            <ReportCard
              title={`Payroll — ${today.slice(0, 7)}`}
              desc={payroll.data ? `${(payroll.data as any[]).length} staff members` : "Loading…"}
              onExport={exportPayroll}
            />
          </div>
        </>
      )}

      {(role === "staff" || attRows.length > 0) && (
        <>
          <SectionTitle>My attendance</SectionTitle>
          <div className="grid gap-2.5 md:grid-cols-2">
            <ReportCard
              title="My attendance report"
              desc={`Entries ${monthFrom} → ${monthTo}`}
              onExport={exportMyAttendance}
            />
          </div>
        </>
      )}

      {!can("students") && !can("payroll") && role !== "staff" && (
        <Card className="p-6 text-center text-sm text-muted-foreground">No reports available for your role.</Card>
      )}
    </div>
  );
}

function queryOpts(key: unknown[], fn: () => Promise<unknown>) {
  return { queryKey: key, queryFn: fn, staleTime: 30_000 };
}

function ReportCard({
  title,
  desc,
  onExport,
  loading,
}: {
  title: string;
  desc: string;
  onExport: () => void;
  loading?: boolean;
}) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{desc}</p>
      </div>
      <Button size="sm" variant="outline" disabled={loading} onClick={onExport}>
        CSV
      </Button>
    </Card>
  );
}
