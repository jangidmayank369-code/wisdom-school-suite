import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { addKmLog, addTransportExpense, createVehicle, getTransport } from "@/lib/erp.functions";
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

export const Route = createFileRoute("/_authenticated/transport")({
  component: TransportPage,
});

const MODES = ["Cash", "UPI", "Bank Transfer", "Cheque", "Other"];
const EXPENSE_CATS = ["Fuel", "Driver Salary", "Repair", "Insurance", "Other"];

function TransportPage() {
  const { activeSession, isFinance } = useErp();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const fetchT = useServerFn(getTransport);
  const { data } = useSuspenseQuery(
    queryOptions({
      queryKey: ["transport"],
      queryFn: () => fetchT(),
    })
  );
  const t = data as any;
  const inSession = (x: any) => !activeSession || !x.session_id || x.session_id === activeSession.id;
  const exps = ((t?.expenses ?? []) as any[]).filter((x) => !x.voided && inSession(x));
  const kms = ((t?.kmLogs ?? []) as any[]).filter((k) => inSession(k));
  const expenseTotal = exps.reduce((a, x) => a + Number(x.amount), 0);
  const totalKm = kms.reduce((a, k) => a + Number(k.km), 0);
  const fuelEstimate = kms.reduce((a, k) => a + Number(k.km) * Number(k.rate_per_km), 0);

  // Vehicle dialog
  const [vOpen, setVOpen] = useState(false);
  const [v, setV] = useState({ vehicle_number: "", route_name: "", driver_name: "", driver_contact: "", capacity: "" });
  const fetchCV = useServerFn(createVehicle);
  const cvMut = useMutation({
    mutationFn: () => fetchCV({ data: { ...v, capacity: v.capacity ? Number(v.capacity) : null } }),
    onSuccess: () => { setVOpen(false); setV({ vehicle_number: "", route_name: "", driver_name: "", driver_contact: "", capacity: "" }); qc.invalidateQueries({ queryKey: ["transport"] }); },
    onError: (e: any) => setError(e.message),
  });

  // Expense dialog
  const [eOpen, setEOpen] = useState(false);
  const [e, setE] = useState({ vehicle_id: "", category: "Fuel", amount: "", expense_date: todayISO(), payment_mode: "Cash", vendor: "", remarks: "" });
  const fetchAE = useServerFn(addTransportExpense);
  const aeMut = useMutation({
    mutationFn: () => fetchAE({ data: { ...e, vehicle_id: e.vehicle_id || null, amount: Number(e.amount), session_id: activeSession?.id ?? null } }),
    onSuccess: () => { setEOpen(false); setE({ ...e, amount: "", remarks: "" }); qc.invalidateQueries({ queryKey: ["transport"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); },
    onError: (e: any) => setError(e.message),
  });

  // KM log dialog
  const [kOpen, setKOpen] = useState(false);
  const [k, setK] = useState({ staff_id: "", vehicle_id: "", log_date: todayISO(), km: "", rate_per_km: "", remarks: "" });
  const fetchKM = useServerFn(addKmLog);
  const kmMut = useMutation({
    mutationFn: () => fetchKM({ data: { ...k, km: Number(k.km), rate_per_km: Number(k.rate_per_km), vehicle_id: k.vehicle_id || null, session_id: activeSession?.id ?? null } }),
    onSuccess: () => { setKOpen(false); setK({ ...k, km: "", remarks: "" }); qc.invalidateQueries({ queryKey: ["transport"] }); },
    onError: (e: any) => setError(e.message),
  });

  return (
    <div>
      <PageHeader title="Transport" subtitle={activeSession ? activeSession.name : undefined} />

      <div className="grid grid-cols-2 gap-2.5">
        <MoneyStat label="Vehicles" value={(t?.vehicles ?? []).length} plain />
        <MoneyStat label="Fuel cost (est.)" value={fuelEstimate} tone="warning" />
        <MoneyStat label="KM logged" value={totalKm} plain />
        <MoneyStat label="Session expenses" value={expenseTotal} tone="danger" />
      </div>

      {isFinance && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => { setE({ ...e, vehicle_id: t.vehicles[0]?.id ?? "" }); setEOpen(true); }}>+ Expense</Button>
          <Button size="sm" variant="outline" onClick={() => { setK({ ...k, staff_id: t.drivers[0]?.id ?? "", vehicle_id: t.vehicles[0]?.id ?? "" }); setKOpen(true); }}>+ KM log</Button>
          <Button size="sm" variant="outline" onClick={() => setVOpen(true)}>+ Vehicle</Button>
        </div>
      )}

      <SectionTitle>Vehicles &amp; drivers</SectionTitle>
      <div className="grid gap-2.5 md:grid-cols-2">
        {(t?.vehicles ?? []).length === 0 && <Card className="p-4 text-sm text-muted-foreground">No vehicles yet.</Card>}
        {(t?.vehicles ?? []).map((veh: any) => (
          <Card key={veh.id} className="p-4">
            <div className="flex items-center gap-2">
              <p className="flex-1 text-sm font-bold">{veh.vehicle_number}</p>
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">{veh.route_name}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Driver: {veh.driver_name ?? "—"}{veh.driver_contact ? ` · ${veh.driver_contact}` : ""}
              {veh.capacity ? ` · ${veh.capacity} seats` : ""}
            </p>
          </Card>
        ))}
      </div>

      {kms.length > 0 && (
        <>
          <SectionTitle>Driver KM &amp; fuel</SectionTitle>
          <div className="space-y-2">
            {(t?.drivers ?? []).map((d: any) => {
              const dk = kms.filter((k) => k.staff_id === d.id);
              if (dk.length === 0) return null;
              const dKm = dk.reduce((a, k) => a + Number(k.km), 0);
              const dCost = dk.reduce((a, k) => a + Number(k.km) * Number(k.rate_per_km), 0);
              const rate = Number(dk[0]?.rate_per_km ?? 0);
              return (
                <Card key={d.id} className="flex items-center gap-3 p-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{d.name}</p>
                    <p className="text-xs text-muted-foreground">{dKm} KM @ ₹{rate}/KM</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Est. fuel cost</p>
                    <p className="text-sm font-bold tabular-nums">{fmtMoney(dCost)}</p>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      <SectionTitle>Recent expenses</SectionTitle>
      <Card className="divide-y p-0">
        {exps.length === 0 && <p className="p-4 text-sm text-muted-foreground">No transport expenses yet.</p>}
        {exps.map((x: any) => (
          <div key={x.id} className={"flex items-center gap-3 px-4 py-2.5 " + (x.voided ? "opacity-50" : "")}>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {x.category}{x.vehicles?.vehicle_number ? ` · ${x.vehicles.vehicle_number}` : ""}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {fmtDate(x.expense_date)} · {x.payment_mode}{x.remarks ? ` · ${x.remarks}` : ""}
              </p>
            </div>
            <span className="shrink-0 text-sm font-semibold tabular-nums text-destructive">−{fmtMoney(x.amount)}</span>
          </div>
        ))}
      </Card>

      {error && <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      <Dialog open={vOpen} onOpenChange={(v2) => { setVOpen(v2); setError(null); }}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader><DialogTitle>Add vehicle</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Vehicle no. *"><Input value={v.vehicle_number} onChange={(ev) => setV({ ...v, vehicle_number: ev.target.value })} /></Field>
              <Field label="Route *"><Input value={v.route_name} onChange={(ev) => setV({ ...v, route_name: ev.target.value })} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Driver name"><Input value={v.driver_name} onChange={(ev) => setV({ ...v, driver_name: ev.target.value })} /></Field>
              <Field label="Driver contact"><Input inputMode="tel" value={v.driver_contact} onChange={(ev) => setV({ ...v, driver_contact: ev.target.value })} /></Field>
            </div>
            <Field label="Capacity"><Input type="number" inputMode="numeric" value={v.capacity} onChange={(ev) => setV({ ...v, capacity: ev.target.value })} /></Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVOpen(false)}>Cancel</Button>
            <Button disabled={!v.vehicle_number || !v.route_name || cvMut.isPending} onClick={() => cvMut.mutate()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={eOpen} onOpenChange={(v2) => { setEOpen(v2); setError(null); }}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader><DialogTitle>Transport expense</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Vehicle">
                <Select value={e.vehicle_id} onValueChange={(val) => setE({ ...e, vehicle_id: val })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{t.vehicles.map((veh: any) => <SelectItem key={veh.id} value={veh.id}>{veh.vehicle_number}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Category">
                <Select value={e.category} onValueChange={(val) => setE({ ...e, category: val })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{EXPENSE_CATS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Amount (₹) *"><Input type="number" inputMode="decimal" value={e.amount} onChange={(ev) => setE({ ...e, amount: ev.target.value })} /></Field>
              <Field label="Date"><Input type="date" value={e.expense_date} onChange={(ev) => setE({ ...e, expense_date: ev.target.value })} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Mode">
                <Select value={e.payment_mode} onValueChange={(val) => setE({ ...e, payment_mode: val })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MODES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Vendor"><Input value={e.vendor} onChange={(ev) => setE({ ...e, vendor: ev.target.value })} /></Field>
            </div>
            <Field label="Remarks"><Input value={e.remarks} onChange={(ev) => setE({ ...e, remarks: ev.target.value })} /></Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEOpen(false)}>Cancel</Button>
            <Button disabled={!e.amount || Number(e.amount) <= 0 || aeMut.isPending} onClick={() => aeMut.mutate()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={kOpen} onOpenChange={(v2) => { setKOpen(v2); setError(null); }}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader><DialogTitle>Daily KM log</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Driver *">
                <Select value={k.staff_id} onValueChange={(val) => setK({ ...k, staff_id: val })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{(t?.drivers ?? []).map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Vehicle">
                <Select value={k.vehicle_id} onValueChange={(val) => setK({ ...k, vehicle_id: val })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{t.vehicles.map((veh: any) => <SelectItem key={veh.id} value={veh.id}>{veh.vehicle_number}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Date"><Input type="date" value={k.log_date} onChange={(ev) => setK({ ...k, log_date: ev.target.value })} /></Field>
              <Field label="KM *"><Input type="number" inputMode="decimal" value={k.km} onChange={(ev) => setK({ ...k, km: ev.target.value })} /></Field>
              <Field label="Rate/KM *"><Input type="number" inputMode="decimal" value={k.rate_per_km} onChange={(ev) => setK({ ...k, rate_per_km: ev.target.value })} /></Field>
            </div>
            <Field label="Remarks"><Input value={k.remarks} onChange={(ev) => setK({ ...k, remarks: ev.target.value })} /></Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setKOpen(false)}>Cancel</Button>
            <Button disabled={!k.staff_id || !k.km || !k.rate_per_km || kmMut.isPending} onClick={() => kmMut.mutate()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
