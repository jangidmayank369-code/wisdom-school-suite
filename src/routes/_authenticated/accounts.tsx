import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { addManualTransaction, getTransactions } from "@/lib/erp.functions";
import { useErp } from "@/components/erp/AppShell";
import { Card, MoneyStat, PageHeader, SectionTitle } from "@/components/erp/parts";
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
import { downloadCSV, fmtDate, fmtMoney, todayISO } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/accounts")({
  component: AccountsPage,
});

const MODES = ["Cash", "UPI", "Bank Transfer", "Cheque", "Other"];
const INCOME_CATS = ["Other Income", "Donation", "Transport Income", "Fee", "Grant", "Other"];
const EXPENSE_CATS = ["Staff Salary", "Driver Salary", "Fuel", "Maintenance", "Transport", "Stationery", "Electricity", "Water", "Rent", "Purchase", "Other"];

function AccountsPage() {
  const { activeSession, isFinance } = useErp();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState(todayISO().slice(0, 8) + "01");
  const [to, setTo] = useState(todayISO());
  const [type, setType] = useState("all");

  const fetchT = useServerFn(getTransactions);
  const { data } = useSuspenseQuery(
    queryOptions({
      queryKey: ["transactions", activeSession?.id, from, to, type],
      queryFn: () => fetchT({ data: { sessionId: activeSession?.id, from, to, type: type === "all" ? undefined : type } }),
    })
  );
  const txns = (data as any[]) ?? [];

  const totals = useMemo(() => {
    const inc = txns.filter((t) => !t.voided && t.type === "income").reduce((a, t) => a + Number(t.amount), 0);
    const exp = txns.filter((t) => !t.voided && t.type === "expense").reduce((a, t) => a + Number(t.amount), 0);
    return { inc, exp, net: inc - exp };
  }, [txns]);

  const exportCSV = () => {
    downloadCSV(
      `accounts-${from}-to-${to}.csv`,
      [
        ["Date", "Type", "Category", "Mode", "Description", "Reference", "Source", "Amount"],
        ...txns.map((t) => [
          t.txn_date,
          t.type,
          t.category,
          t.payment_mode,
          t.description ?? "",
          t.reference ?? "",
          t.source,
          String(t.amount) + (t.voided ? " (REVERSED)" : ""),
        ]),
      ]
    );
  };

  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    type: "expense",
    category: "Other",
    amount: "",
    txn_date: todayISO(),
    payment_mode: "Cash",
    description: "",
    reference: "",
  });

  const fetchAdd = useServerFn(addManualTransaction);
  const mut = useMutation({
    mutationFn: () => fetchAdd({ data: { ...f, amount: Number(f.amount), session_id: activeSession?.id ?? null } }),
    onSuccess: () => {
      setOpen(false);
      setF({ ...f, amount: "", description: "", reference: "" });
      setError(null);
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: any) => setError(e.message),
  });

  if (!isFinance) {
    return (
      <div>
        <PageHeader title="Accounts" />
        <Card className="p-6 text-center text-sm text-muted-foreground">
          School accounts are visible to Admin and Accountant only.
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Accounts" subtitle={activeSession ? activeSession.name : undefined} />

      <div className="grid grid-cols-3 gap-2.5">
        <MoneyStat label="Income" value={totals.inc} tone="success" />
        <MoneyStat label="Expense" value={totals.exp} tone="danger" />
        <MoneyStat label="Net" value={totals.net} tone={totals.net >= 0 ? "primary" : "danger"} />
      </div>

      <div className="mt-4 flex items-end gap-2">
        <div className="flex-1 space-y-1">
          <label className="text-xs text-muted-foreground">From</label>
          <Input type="date" className="h-9" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="flex-1 space-y-1">
          <label className="text-xs text-muted-foreground">To</label>
          <Input type="date" className="h-9" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <Button variant="outline" className="h-9" onClick={exportCSV}>Export</Button>
      </div>
      <div className="mt-2 flex gap-1.5">
        {[
          { v: "all", l: "All" },
          { v: "income", l: "Income" },
          { v: "expense", l: "Expense" },
        ].map((o) => (
          <button
            key={o.v}
            onClick={() => setType(o.v)}
            className={
              "rounded-full px-3 py-1 text-xs font-medium " +
              (type === o.v ? "bg-primary text-primary-foreground" : "border bg-card text-muted-foreground")
            }
          >
            {o.l}
          </button>
        ))}
        <div className="flex-1" />
        <Button size="sm" onClick={() => setOpen(true)}>+ Manual entry</Button>
      </div>

      <SectionTitle>Ledger</SectionTitle>
      <Card className="divide-y p-0">
        {txns.length === 0 && <p className="p-4 text-sm text-muted-foreground">No transactions in this period.</p>}
        {txns.map((t) => (
          <div key={t.id} className={"flex items-center gap-3 px-4 py-2.5 " + (t.voided ? "opacity-50" : "")}>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {t.category}
                <span className="ml-1.5 rounded bg-muted px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground capitalize">
                  {t.source}
                </span>
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {fmtDate(t.txn_date)} · {t.payment_mode}
                {t.description ? ` · ${t.description}` : ""}
                {t.voided ? " · REVERSED" : ""}
              </p>
            </div>
            <span className={"shrink-0 text-sm font-semibold tabular-nums " + (t.type === "income" ? "text-emerald-600" : "text-destructive")}>
              {t.type === "income" ? "+" : "−"}
              {fmtMoney(t.amount)}
            </span>
          </div>
        ))}
      </Card>

      {error && <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); setError(null); }}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader><DialogTitle>Manual entry</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select
                  value={f.type}
                  onValueChange={(v) => setF({ ...f, type: v, category: v === "income" ? INCOME_CATS[0] : EXPENSE_CATS[0] })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={f.category} onValueChange={(v) => setF({ ...f, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(f.type === "income" ? INCOME_CATS : EXPENSE_CATS).map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Amount (₹) *</Label>
                <Input type="number" inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={f.txn_date} onChange={(e) => setF({ ...f, txn_date: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Mode</Label>
                <Select value={f.payment_mode} onValueChange={(v) => setF({ ...f, payment_mode: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MODES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Reference / Bill</Label>
                <Input value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={!f.amount || Number(f.amount) <= 0 || mut.isPending} onClick={() => mut.mutate()}>
              {mut.isPending ? "Saving…" : "Save entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
