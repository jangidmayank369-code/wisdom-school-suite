import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  addStudentCharge,
  collectFee,
  getFeeCategories,
  getStudentDetail,
  voidFeePayment,
} from "@/lib/erp.functions";
import { useErp } from "@/components/erp/AppShell";
import { Card, MoneyStat, PageHeader, SectionTitle, StatCard, StatusBadge } from "@/components/erp/parts";
import { ReceiptDialog, ReceiptLine } from "@/components/erp/Receipt";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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

export const Route = createFileRoute("/_authenticated/students/$studentId")({
  component: StudentDetailPage,
});

const MODES = ["Cash", "UPI", "Bank Transfer", "Cheque", "Other"];

function StudentDetailPage() {
  const { studentId } = Route.useParams();
  const { activeSession, isFinance, isAdmin } = useErp();
  const qc = useQueryClient();

  const fetchDetail = useServerFn(getStudentDetail);
  const { data } = useSuspenseQuery(
    queryOptions({ queryKey: ["student", studentId], queryFn: () => fetchDetail({ data: { id: studentId } }) })
  );

  const fetchCats = useServerFn(getFeeCategories);
  const catsQ = useQuery(queryOptions({ queryKey: ["feeCategories"], queryFn: () => fetchCats() }));
  const categories = (catsQ.data as any[]) ?? [];

  const [payOpen, setPayOpen] = useState(false);
  const [chargeOpen, setChargeOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [mode, setMode] = useState("Cash");
  const [category, setCategory] = useState("");
  const [remarks, setRemarks] = useState("");
  const [overpay, setOverpay] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const [chCategory, setChCategory] = useState("");
  const [chAmount, setChAmount] = useState("");
  const [chRemarks, setChRemarks] = useState("");

  const s: any = data.student;
  const vehicle: any = (s as any)?.vehicles;
  const balance = data.balance;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["student", studentId] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    qc.invalidateQueries({ queryKey: ["pendingFees"] });
  };

  const payMut = useMutation({
    mutationFn: () =>
      collectFee({
        data: {
          student_id: studentId,
          session_id: s.session_id,
          amount: Number(amount),
          payment_date: date,
          payment_mode: mode,
          category: category,
          remarks: remarks || null,
          allow_overpay: overpay,
        },
      }),
    onSuccess: (row: any) => {
      setReceipt({ ...row, amount: Number(amount), date, mode, category });
      setPayOpen(false);
      setAmount("");
      setRemarks("");
      setOverpay(false);
      setError(null);
      invalidate();
    },
    onError: (e: any) => setError(e.message),
  });

  const chargeMut = useMutation({
    mutationFn: () =>
      addStudentCharge({
        data: {
          student_id: studentId,
          session_id: s.session_id,
          category_id: chCategory,
          amount: Number(chAmount),
          remarks: chRemarks || null,
        },
      }),
    onSuccess: () => {
      setChargeOpen(false);
      setChAmount("");
      setChRemarks("");
      invalidate();
    },
    onError: (e: any) => setError(e.message),
  });

  const voidMut = useMutation({
    mutationFn: (id: string) => voidFeePayment({ data: { id } }),
    onSuccess: invalidate,
    onError: (e: any) => setError(e.message),
  });

  if (!s) return <p className="p-6 text-center text-sm text-muted-foreground">Student not found.</p>;

  return (
    <div>
      <PageHeader title={s.name} subtitle={`Admission #${s.admission_no}${s.sr_number ? ` · SR ${s.sr_number}` : ""}`} />

      <Card className="mb-4 p-4">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <Info label="Class" value={`Class ${s.class_name}${s.section ? `-${s.section}` : ""}`} />
          <Info label="Status" value={<StatusBadge status={s.status} />} />
          <Info label="Father" value={s.father_name ?? "—"} />
          <Info label="Mother" value={s.mother_name ?? "—"} />
          <Info label="Contact" value={s.contact ?? "—"} />
          <Info
            label="WhatsApp"
            value={
              s.whatsapp ? (
                <a
                  className="text-primary underline"
                  href={`https://wa.me/${s.whatsapp.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {s.whatsapp}
                </a>
              ) : (
                "—"
              )
            }
          />
          <Info label="DOB" value={s.dob ? fmtDate(s.dob) : "—"} />
          <Info label="Admitted" value={s.admission_date ? fmtDate(s.admission_date) : "—"} />
          <Info
            label="Transport"
            value={s.transport_required ? (vehicle ? `${vehicle.vehicle_number} · ${vehicle.route_name}` : "Required") : "No"}
          />
          <Info label="Address" value={s.address ?? "—"} />
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-2.5">
        <MoneyStat label="Total charges" value={data.totalCharges} />
        <MoneyStat label="Paid" value={data.totalPaid} tone="success" />
        <MoneyStat label="Balance" value={balance} tone={balance > 0.009 ? "danger" : "success"} />
      </div>

      {isFinance && (
        <div className="mt-4 flex gap-2">
          <Button className="flex-1" onClick={() => { setAmount(String(Math.max(0, balance))); setCategory(categories[0]?.name ?? ""); setPayOpen(true); }}>
            Collect fee
          </Button>
          {isAdmin && (
            <Button variant="outline" className="flex-1" onClick={() => { setChCategory(categories[0]?.id ?? ""); setChargeOpen(true); }}>
              Add charge
            </Button>
          )}
        </div>
      )}

      <SectionTitle>Charges &amp; fee structure</SectionTitle>
      <Card className="divide-y p-0">
        {data.charges.length === 0 && <p className="p-4 text-sm text-muted-foreground">No charges added.</p>}
        {data.charges.map((c: any) => (
          <div key={c.id} className="flex items-center gap-3 px-4 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{c.fee_categories?.name ?? "Charge"}</p>
              <p className="truncate text-xs text-muted-foreground">{c.remarks ?? ""}</p>
            </div>
            <span className="text-sm font-semibold tabular-nums">{fmtMoney(c.amount)}</span>
          </div>
        ))}
      </Card>

      <SectionTitle>Payment history</SectionTitle>
      <Card className="divide-y p-0">
        {data.payments.length === 0 && <p className="p-4 text-sm text-muted-foreground">No payments yet.</p>}
        {data.payments.map((p: any) => (
          <div key={p.id} className={"flex items-center gap-3 px-4 py-2.5 " + (p.voided ? "opacity-50" : "")}>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {p.receipt_no ?? "—"} · {p.category}
              </p>
              <p className="text-xs text-muted-foreground">
                {fmtDate(p.payment_date)} · {p.payment_mode}
                {p.voided ? " · REVERSED" : ""}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="text-sm font-semibold tabular-nums text-emerald-600">+{fmtMoney(p.amount)}</span>
              {isFinance && !p.voided && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-destructive"
                  onClick={() => {
                    if (confirm("Reverse this payment? The receipt will be marked as reversed.")) voidMut.mutate(p.id);
                  }}
                >
                  Reverse
                </Button>
              )}
            </div>
          </div>
        ))}
      </Card>

      {error && <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      {/* Collect payment */}
      <Dialog open={payOpen} onOpenChange={(v) => { setPayOpen(v); setError(null); }}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>Collect fee — {s.name}</DialogTitle>
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
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{categories.map((c: any) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Remarks</Label>
              <Input value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional" />
            </div>
            {isAdmin && (
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Checkbox checked={overpay} onCheckedChange={(v) => setOverpay(!!v)} />
                Allow amount above pending balance (Admin only)
              </label>
            )}
            <p className="text-xs text-muted-foreground">Pending balance: {fmtMoney(balance)}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(false)}>Cancel</Button>
            <Button
              disabled={!amount || Number(amount) <= 0 || !category || payMut.isPending}
              onClick={() => payMut.mutate()}
            >
              {payMut.isPending ? "Saving…" : "Save payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add charge */}
      <Dialog open={chargeOpen} onOpenChange={(v) => { setChargeOpen(v); setError(null); }}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>Add charge — {s.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={chCategory} onValueChange={setChCategory}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Amount (₹)</Label>
                <Input type="number" inputMode="decimal" value={chAmount} onChange={(e) => setChAmount(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Remarks</Label>
                <Input value={chRemarks} onChange={(e) => setChRemarks(e.target.value)} placeholder="Optional" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChargeOpen(false)}>Cancel</Button>
            <Button disabled={!chCategory || !chAmount || Number(chAmount) <= 0 || chargeMut.isPending} onClick={() => chargeMut.mutate()}>
              {chargeMut.isPending ? "Saving…" : "Add charge"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt */}
      <ReceiptDialog open={!!receipt} onOpenChange={() => setReceipt(null)} title={`Receipt ${receipt?.receipt_no ?? ""}`}>
        {receipt && (
          <div>
            <ReceiptLine label="Receipt no." value={receipt.receipt_no} />
            <ReceiptLine label="Student" value={s.name} />
            <ReceiptLine label="Class" value={`Class ${s.class_name}${s.section ? `-${s.section}` : ""}`} />
            <ReceiptLine label="Date" value={fmtDate(receipt.date)} />
            <ReceiptLine label="Category" value={receipt.category} />
            <ReceiptLine label="Mode" value={receipt.mode} />
            <div className="mt-2 border-t pt-2">
              <ReceiptLine label="Amount received" value={<span className="text-base font-bold">{fmtMoney(receipt.amount)}</span>} />
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
