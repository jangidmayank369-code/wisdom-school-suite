import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { addMaintenance, getMaintenance } from "@/lib/erp.functions";
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
import { fmtDate, fmtMoney, todayISO } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/maintenance")({
  component: MaintenancePage,
});

const MODES = ["Cash", "UPI", "Bank Transfer", "Cheque", "Other"];
const CATS = ["Plumbing", "Electrical", "Painting", "Furniture", "Cleaning", "Civil Work", "Other"];

function MaintenancePage() {
  const { activeSession, isAdmin, isFinance } = useErp();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const fetchM = useServerFn(getMaintenance);
  const { data } = useSuspenseQuery(
    queryOptions({
      queryKey: ["maintenance", activeSession?.id],
      queryFn: () => fetchM({ data: { sessionId: activeSession?.id } }),
    })
  );
  const items = (data as any[]) ?? [];
  const total = items.filter((i) => !i.voided).reduce((a, i) => a + Number(i.amount), 0);

  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    title: "",
    category: "Other",
    amount: "",
    expense_date: todayISO(),
    location: "",
    vendor: "",
    bill_no: "",
    payment_mode: "Cash",
    description: "",
    remarks: "",
  });

  const fetchAdd = useServerFn(addMaintenance);
  const mut = useMutation({
    mutationFn: () => fetchAdd({ data: { ...f, amount: Number(f.amount), session_id: activeSession?.id ?? null } }),
    onSuccess: () => {
      setOpen(false);
      setF({ ...f, title: "", amount: "", bill_no: "", description: "", remarks: "" });
      setError(null);
      qc.invalidateQueries({ queryKey: ["maintenance"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
sc      },
    onError: (e: any) => setError(e.message),
  });

  return (
    <div>
      <PageHeader title="Maintenance" subtitle={activeSession ? activeSession.name : undefined} />

      <div className="grid grid-cols-2 gap-2.5">
        <MoneyStat label="Works this session" value={items.filter((i) => !i.voided).length} plain />
        <MoneyStat label="Total spent" value={total} tone="danger" />
      </div>

      {(isFinance || isAdmin) && (
        <Button className="mt-4" onClick={() => setOpen(true)}>
          + Record maintenance work
        </Button>
      )}

      <SectionTitle>Records</SectionTitle>
      <div className="space-y-2.5">
        {items.length === 0 && <Card className="p-4 text-sm text-muted-foreground">No maintenance records yet.</Card>}
        {items.map((m) => (
          <Card key={m.id} className={"p-4 " + (m.voided ? "opacity-50" : "")}>
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{m.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {fmtDate(m.expense_date)} · {m.category}
                  {m.location ? ` · ${m.location}` : ""}
                  {m.vendor ? ` · ${m.vendor}` : ""}
                  {m.bill_no ? ` · Bill ${m.bill_no}` : ""}
                </p>
              </div>
              <span className="shrink-0 text-sm font-bold tabular-nums text-destructive">−{fmtMoney(m.amount)}</span>
            </div>
            {m.description && <p className="mt-1 text-xs text-muted-foreground">{m.description}</p>}
            {m.voided && <p className="mt-1 text-xs font-medium text-destructive">REVERSED</p>}
          </Card>
        ))}
      </div>

      {error && <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); setError(null); }}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader><DialogTitle>Maintenance work</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Work title *</Label>
              <Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={f.category} onValueChange={(v) => setF({ ...f, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Amount (₹) *</Label>
                <Input type="number" inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={f.expense_date} onChange={(e) => setF({ ...f, expense_date: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Location</Label>
                <Input value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Vendor</Label>
                <Input value={f.vendor} onChange={(e) => setF({ ...f, vendor: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Bill no.</Label>
                <Input value={f.bill_no} onChange={(e) => setF({ ...f, bill_no: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Payment mode</Label>
              <Select value={f.payment_mode} onValueChange={(v) => setF({ ...f, payment_mode: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MODES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={!f.title || !f.amount || Number(f.amount) <= 0 || mut.isPending} onClick={() => mut.mutate()}>
              {mut.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
