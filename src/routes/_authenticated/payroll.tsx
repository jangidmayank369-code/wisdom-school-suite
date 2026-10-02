import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { getPayrollMonth, savePayroll } from "@/lib/erp.functions";
import { useErp } from "@/components/erp/AppShell";
import { Card, PageHeader, SectionTitle, StatusBadge } from "@/components/erp/parts";
import { Button } from "@/components/ui/button";
import { fmtMoney, todayISO } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/payroll")({
  component: PayrollPage,
});

function PayrollPage() {
  const { activeSession } = useErp();
  const [month, setMonth] = useState(todayISO().slice(0, 7));
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const qc = useQueryClient();

  const fetchMonth = useServerFn(getPayrollMonth);
  const { data } = useSuspenseQuery(
    queryOptions({
      queryKey: ["payrollMonth", activeSession?.id, month],
      queryFn: () => fetchMonth({ data: { sessionId: activeSession?.id, month } }),
    })
  );

  const fetchSave = useServerFn(savePayroll);
  const mut = useMutation({
    mutationFn: (payload: { staff_id: string; paid_days: number }) =>
      fetchSave({ data: { ...payload, month: month + "-01", session_id: activeSession?.id ?? null } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payrollMonth"] });
      setError(null);
    },
    onError: (e: any) => setError(e.message),
    onSettled: () => setSavingId(null),
  });

  const totals = (data as any[]).reduce(
    (a, r) => ({
      gross: a.gross + r.monthly_salary,
      computed: a.computed + (r.saved_computed ?? r.computed),
      paid: a.paid + r.paid_amount,
      due: a.due + r.due,
    }),
    { gross: 0, computed: 0, paid: 0, due: 0 }
  );

  return (
    <div>
      <PageHeader title="Payroll" subtitle="Daily salary = monthly ÷ 30" />

      <div className="mb-4 flex items-end gap-2">
        <div className="flex-1 space-y-1">
          <label className="text-xs text-muted-foreground">Month</label>
          <Input2 value={month} onChange={setMonth} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <SumBox label="Gross salary" value={fmtMoney(totals.gross)} />
        <SumBox label="Computed (saved)" value={fmtMoney(totals.computed)} />
        <SumBox label="Paid this month" value={fmtMoney(totals.paid)} />
        <SumBox label="Due" value={fmtMoney(totals.due)} />
      </div>

      <SectionTitle>Staff payroll</SectionTitle>
      <div className="space-y-2.5">
        {(data as any[]).map((r) => (
          <Card key={r.staff_id} className="p-4">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{r.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {r.designation ?? ""} · {fmtMoney(r.monthly_salary)}/mo · {fmtMoney(r.daily_rate)}/day
                </p>
              </div>
              <StatusBadge status={r.archived ? "archived" : r.status} />
            </div>

            <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
              <Box label="Present" value={r.present} tone="text-emerald-600" />
              <Box label="Absent" value={r.absent} tone={r.absent > 4 ? "text-destructive" : undefined} />
              <Box label="Half days" value={r.half_day} />
              <Box label="Approved leave" value={r.on_leave} />
            </div>

            {r.absent > 4 && (
              <p className="mt-2 rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-700">
                Warning: {r.absent} absences this month — review before saving. No deduction is applied automatically.
              </p>
            )}

            <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-muted/50 px-3 py-2">
              <div className="text-xs">
                <p className="text-muted-foreground">Paid days</p>
                <p className="text-base font-bold tabular-nums">
                  {r.saved_paid_days ?? r.paid_days}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">{r.saved_computed != null ? "Saved salary" : "Computed salary"}</p>
                <p className="text-base font-bold tabular-nums">
                  {fmtMoney(r.saved_computed ?? r.computed)}
                </p>
              </div>
              {r.saved_computed == null && (
                <Button
                  size="sm"
                  disabled={mut.isPending}
                  onClick={() => {
                    setSavingId(r.staff_id);
                    mut.mutate({ staff_id: r.staff_id, paid_days: r.paid_days });
                  }}
                >
                  {savingId === r.staff_id ? "Saving…" : "Save"}
                </Button>
              )}
            </div>

            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>Paid: {fmtMoney(r.paid_amount)}</span>
              <span className={(r.due > 0.009 ? "text-destructive" : "text-emerald-600") + " font-medium"}>
                Due: {fmtMoney(r.due)}
              </span>
            </div>
          </Card>
        ))}
      </div>

      {error && <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}

function Input2({ value, onChange }: { value: string; onChange: (v: string) => void }) {
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

function Box({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-lg bg-muted/50 py-1.5">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className={"text-sm font-bold tabular-nums " + (tone ?? "")}>{value}</p>
    </div>
  );
}
