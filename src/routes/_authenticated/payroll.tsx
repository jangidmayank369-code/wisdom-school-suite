import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { getPayrollMonth, savePayroll } from "@/lib/erp.functions";
import { useErp } from "@/components/erp/AppShell";
import { Card, PageHeader, SectionTitle } from "@/components/erp/parts";
import { Button } from "@/components/ui/button";
import { fmtMoney, todayISO } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/payroll")({
  component: PayrollPage,
});

function PayrollPage() {
  const { activeSession, isFinance } = useErp();
  const [month, setMonth] = useState(todayISO().slice(0, 7));
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const qc = useQueryClient();

  const fetchMonth = useServerFn(getPayrollMonth);
  const { data } = useSuspenseQuery(
    queryOptions({
      queryKey: ["payrollMonth", activeSession?.id, month],
      queryFn: () => fetchMonth({ data: { sessionId: activeSession?.id, month: month + "-01" } }),
    })
  );
  const rows = (data as any[]) ?? [];

  const fetchSave = useServerFn(savePayroll);
  const mut = useMutation({
    mutationFn: (payload: {
      staff_id: string;
      working_days: number;
      paid_days: number;
      computed_salary: number;
    }) =>
      fetchSave({
        data: {
          ...payload,
          period_month: month + "-01",
          session_id: activeSession?.id ?? null,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payrollMonth"] });
      setError(null);
    },
    onError: (e: any) => setError(e.message),
    onSettled: () => setSavingId(null),
  });

  const totals = rows.reduce(
    (a, r) => {
      const computed = r.saved ? Number(r.saved.computed_salary) : r.computed;
      const due = Math.max(0, computed - Number(r.paidMonth ?? 0));
      return {
        gross: a.gross + Number(r.staff.monthly_salary),
        computed: a.computed + computed,
        paid: a.paid + Number(r.paidMonth ?? 0),
        due: a.due + due,
      };
    },
    { gross: 0, computed: 0, paid: 0, due: 0 }
  );

  return (
    <div>
      <PageHeader title="Payroll" subtitle="Daily salary = monthly ÷ 30" />

      <div className="mb-4 flex items-end gap-2">
        <div className="flex-1 space-y-1">
          <label className="text-xs text-muted-foreground">Month</label>
          <MonthInput value={month} onChange={setMonth} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <SumBox label="Gross salary" value={fmtMoney(totals.gross)} />
        <SumBox label="Computed salary" value={fmtMoney(totals.computed)} />
        <SumBox label="Paid this month" value={fmtMoney(totals.paid)} />
        <SumBox label="Due" value={fmtMoney(totals.due)} />
      </div>

      <SectionTitle>Staff payroll</SectionTitle>
      <div className="space-y-2.5">
        {rows.length === 0 && <Card className="p-4 text-sm text-muted-foreground">No active staff.</Card>}
        {rows.map((r: any) => {
          const computed = r.saved ? Number(r.saved.computed_salary) : r.computed;
          const paidDays = r.saved ? Number(r.saved.paid_days) : r.paidDays;
          const due = Math.max(0, computed - Number(r.paidMonth ?? 0));
          return (
            <Card key={r.staff.id} className="p-4">
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{r.staff.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {r.staff.designation ?? ""} · {fmtMoney(r.staff.monthly_salary)}/mo · {fmtMoney(r.daily)}/day
                  </p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
                <Box label="Present" value={r.present} tone="text-emerald-600" />
                <Box label="Absent" value={r.absent} tone={r.absent > 4 ? "text-destructive" : undefined} />
                <Box label="Half days" value={r.half} />
                <Box label="Leave" value={r.leave} />
              </div>

              {r.warning && (
                <p className="mt-2 rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-700">
                  Warning: {r.absent} absences this month — review before saving. No deduction is applied automatically.
                </p>
              )}

              <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-muted/50 px-3 py-2">
                <div className="text-xs">
                  <p className="text-muted-foreground">Paid days</p>
                  <p className="text-base font-bold tabular-nums">{paidDays}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">{r.saved ? "Saved salary (locked)" : "Computed salary"}</p>
                  <p className="text-base font-bold tabular-nums">{fmtMoney(computed)}</p>
                </div>
                {!r.saved && isFinance && (
                  <Button
                    size="sm"
                    disabled={mut.isPending}
                    onClick={() => {
                      setSavingId(r.staff.id);
                      mut.mutate({
                        staff_id: r.staff.id,
                        working_days: r.workingDays,
                        paid_days: r.paidDays,
                        computed_salary: r.computed,
                      });
                    }}
                  >
                    {savingId === r.staff.id ? "Saving…" : "Save"}
                  </Button>
                )}
              </div>

              <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                <span>Paid: {fmtMoney(r.paidMonth ?? 0)}</span>
                <span className={(due > 0.009 ? "text-destructive" : "text-emerald-600") + " font-medium"}>
                  Due: {fmtMoney(due)}
                </span>
              </div>
            </Card>
          );
        })}
      </div>

      {error && <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      {!isFinance && (
        <p className="mt-3 text-center text-xs text-muted-foreground">Only Admin and Accountant can save payroll.</p>
      )}
    </div>
  );
}

function MonthInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="month"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="border-input bg-background flex h-9 w-full rounded-lg border px-3 py-1 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
    />
  );
}

function SumBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card px-3 py-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-sm font-bold tabular-nums">{value}</p>
    </div>
  );
}

function Box({ label, value, tone }: { label: string; value: number; tone?: string | undefined }) {
  return (
    <div className="rounded-lg bg-muted/50 py-1.5">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className={"text-sm font-bold tabular-nums " + (tone ?? "")}>{value}</p>
    </div>
  );
}
