import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { createStaff, getStaffList } from "@/lib/erp.functions";
import { useErp } from "@/components/erp/AppShell";
import { Card, PageHeader, StatusBadge } from "@/components/erp/parts";
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
import { fmtMoney } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/staff/")({
  component: StaffPage,
});

const PAYMENT_TYPES = ["monthly", "daily"];

function StaffPage() {
  const { isFinance, isAdmin } = useErp();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    staff_code: "",
    designation: "",
    department: "",
    contact: "",
    joining_date: "",
    monthly_salary: "",
    payment_type: "monthly",
  });

  const fetchStaff = useServerFn(getStaffList);
  const { data } = useSuspenseQuery(queryOptions({ queryKey: ["staffList", q], queryFn: () => fetchStaff({ data: { q } }) }));
  const staff = (data as any[]) ?? [];

  const mut = useCreateStaff(() => setOpen(false), setError);

  return (
    <div>
      <PageHeader title="Staff" subtitle={`${staff.length} staff members`} />
      <Input
        className="mb-3"
        placeholder="Search staff…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        inputMode="search"
      />

      {isFinance && (
        <div className="mb-3 flex items-center justify-between">
          <Link to="/payroll" className="text-sm font-medium text-primary underline">
            Open payroll →
          </Link>
          {isAdmin && (
            <Button onClick={() => setOpen(true)} size="sm">
              + Add staff
            </Button>
          )}
        </div>
      )}

      <Card className="divide-y p-0">
        {staff.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No staff found.</p>}
        {staff.map((s) => (
          <Link
            key={s.id}
            to="/staff/$staffId"
            params={{ staffId: s.id }}
            className="flex items-center gap-3 px-4 py-3 hover:bg-accent/50"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {s.name?.[0]?.toUpperCase() ?? "?"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{s.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {s.designation ?? s.staff_code}
                {isFinance ? ` · ${fmtMoney(s.monthly_salary)}/mo` : ""}
              </p>
            </div>
            <div className="shrink-0">
              <StatusBadge status={s.archived ? "archived" : s.status} />
            </div>
          </Link>
        ))}
      </Card>

      {error && <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); setError(null); }}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>Add staff member</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Staff code</Label>
                <Input value={form.staff_code} onChange={(e) => setForm({ ...form, staff_code: e.target.value })} placeholder="Auto" />
              </div>
              <div className="space-y-1.5">
                <Label>Designation</Label>
                <Input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Department</Label>
                <Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Contact</Label>
                <Input inputMode="tel" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Joining date</Label>
              <Input type="date" value={form.joining_date} onChange={(e) => setForm({ ...form, joining_date: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Monthly salary (₹)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={form.monthly_salary}
                  onChange={(e) => setForm({ ...form, monthly_salary: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Payment type</Label>
                <Select value={form.payment_type} onValueChange={(v) => setForm({ ...form, payment_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t} className="capitalize">
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={!form.name || !form.monthly_salary || mut.isPending} onClick={() => mut.mutate()}>
              {mut.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useMutation, useQueryClient } from "@tanstack/react-query";

function useCreateStaff(onDone: () => void, setError: (e: string | null) => void) {
  const qc = useQueryClient();
  const fn = useServerFn(createStaff);
  return useMutation({
    mutationFn: (input: any) => fn({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staffList"] });
      onDone();
    },
    onError: (e: any) => setError(e.message),
  });
}
