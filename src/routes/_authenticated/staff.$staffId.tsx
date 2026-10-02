import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { getMyAttendance, getStaffDetail, payStaff } from "@/lib/erp.functions";
import { useErp } from "@/components/erp/AppShell";
import { Card, MoneyStat, PageHeader, SectionTitle, StatusBadge } from "@/components/erp/parts";
import { ReceiptDialog, ReceiptLine } from "@/components/erp/Receipt";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fmtDate, fmtMoney, todayISO } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/staff/$staffId")({
  component: StaffDetailPage,
});

const MODES = ["Cash", "UPI", "Bank Transfer", "Cheque", "Other"];

function StaffDetailPage() {
  const { staffId } = Route.useParams();
  const { userId, isFinance, isAdmin, activeSession } = useErp();
  const qc = useQueryClient();

  const fetchDetail = useServerFn(getStaffDetail);
  const { data } = useSuspenseQuery(
    queryOptions({ queryKey: ["staff", staffId], queryFn: () => fetchDetail({ data: { id: staffId } }) })
  );

  // Own attendance for staff viewing their own profile
  const fetchMyAtt = useServerFn(getMyAttendance);
  const attQ = useQuery(
    queryOptions({
      queryKey: ["myAttendance", activeSession?.id, staffId],
      queryFn: () => fetchMyAttendance({ data: { sessionId: activeSession?.id, staffId } }),
      enabled: data.staff?.user_id === userId || !isFinance,
    })
  );

  const s: any = data.staff;
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [mode, setMode] = useState("Cash");
  const [remarks, setRemarks] = useState("");
  const [receipt, setReceipt] = useState<any>(null);

  const mut = useMutation({
    mutationFn: () =>
      payStaff({
        data: {
          staff_id: staffId,
          session_id: s.session_id ?? activeSession?.id ?? null,
          amount: Number(amount),
          payment_date: date,
          payment_mode: mode,
          remarks: remarks || null,
        },
      }),
    onSuccess: (row: any) => {
      setReceipt({ ...row, amount: Number(amount), date, mode, name: s.name });
      setOpen(false);
      setAmount("");
      setRemarks("");
      setError(null);
      qc.invalidateQueries({ queryKey: ["staff", staffId] });
      qc.invalidateQueries({ queryKey: ["staffList"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
    },
    onError: (e: any) => setError(e.message),
  });

  if (!s) return <p className="p-6 text-center text-sm text-muted-foreground">Staff not found.</p>;

  return (
    <div>
      <PageHeader
        title={s.name}
        subtitle={`${s.designation ?? "Staff"} · ${s.staff_code ?? ""}`}
      />

      <Card className="mb-4 p-4">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <Info label="Status" value={<StatusBadge status={s.archived ? "archived" : s.status} />} />
          <Info label="Department" value={s.department ?? "—"} />
          <Info label="Contact" value={s.contact ?? "—"} />
          <Info label="Joined" value={s.joining_date ? fmtDate(s.joining_date) : "—"} />
        </div>
      </Card>

      {isFinance && (
        <>
          <div className="grid grid-cols-3 gap-2.5">
            <MoneyStat label="Monthly salary" value={s.monthly_salary} />
            <MoneyStat label="Paid" value={data.totalPaid} tone="success" />
            <MoneyStat label="Due" value={data.salaryDue} tone={data.salaryDue > 0.009 ? "danger" : "success"} />
          </div>
          <div className="mt-4">
            <Button
              onClick={() => {
                setAmount(String(Math.max(0, Math.round(data.salaryDue))));
                setOpen(true);
              }}
            >
              Record salary payment
            </Button>
          </div>
        </>
      )}

      <SectionTitle>Payments</SectionTitle>
      <Card className="divide-y p-0">
        {data.payments.length === 0 && <p className="p-4 text-sm text-muted-foreground">No payments recorded.</p>}
        {data.payments.map((p: any) => (
          <div key={p.id} className={"flex items-center gap-3 px-4 py-2.5 " + (p.voided ? "opacity-50" : "")}>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {p.period_month ? fmtDate(p.period_month).slice(3) + " salary" : "Salary"}
                {p.remarks ? ` · ${p.remarks}` : ""}
              </p>
              <p className="text-xs text-muted-foreground">
                {fmtDate(p.payment_date)} · {p.payment_mode}
                {p.voided ? " · REVERSED" : ""}
              </p>
            </div>
            <span className={"shrink-0 text-sm font-semibold tabular-nums " + (p.voided ? "text-muted-foreground" : "text-emerald-600")}>
              {p.voided ? "" : "+"}
              {fmtMoney(p.amount)}
            </span>
          </div>
        ))}
      </Card>

      {attQ.data && attQ.data.length > 0 && (
        <>
          <SectionTitle>Recent attendance</SectionTitle>
          <Card className="divide-y p-0">
            {attQ.data.slice(0, 10).map((a: any) => (
              <div key={a.id} className="flex items-center gap-3 px-4 py-2">
                <span className="text-sm">{fmtDate(a.att_date)}</span>
                <div className="flex-1" />
                <StatusBadge status={a.status} />
                {a.remarks && <span className="truncate text-xs text-muted-foreground">{a.remarks}</span>}
              </div>
            ))}
          </Card>
        </>
      )}

      {error && <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); setError(null); }}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>Salary payment — {s.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Amount (₹)</Label>
                <Input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Payment mode</Label>
              <Select value={mode} onValueChange={setMode}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MODES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Remarks</Label>
              <Input value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="e.g. February salary" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={!amount || Number(amount) <= 0 || mut.isPending} onClick={() => mut.mutate()}>
              {mut.isPending ? "Saving…" : "Save payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ReceiptDialog open={!!receipt} onOpenChange={() => setReceipt(null)} title="Salary Receipt">
        {receipt && (
          <div>
            <ReceiptLine label="Staff" value={receipt.name} />
            <ReceiptLine label="Date" value={fmtDate(receipt.date)} />
            <ReceiptLine label="Mode" value={receipt.mode} />
            <div className="mt-2 border-t pt-2">
              <ReceiptLine label="Amount paid" value={<span className="text-base font-bold">{fmtMoney(receipt.amount)}</span>} />
            </div>
          </div>
        )}
      </ReceiptDialog>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
