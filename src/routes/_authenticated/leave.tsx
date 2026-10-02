import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { getLeaveRequests, reviewLeave, submitLeave } from "@/lib/erp.functions";
import { useErp } from "@/components/erp/AppShell";
import { Card, PageHeader, SectionTitle, StatusBadge } from "@/components/erp/parts";
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
import { fmtDate, todayISO } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/leave")({
  component: LeavePage,
});

function LeavePage() {
  const { isAdmin } = useErp();
  const qc = useQueryClient();

  const fetchLeaves = useServerFn(getLeaveRequests);
  const { data } = useSuspenseQuery(queryOptions({ queryKey: ["leaves"], queryFn: () => fetchLeaves() }));
  const leaves = (data as any[]) ?? [];
  const pending = leaves.filter((l) => l.status === "pending");

  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(todayISO());
  const [reason, setReason] = useState("");
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fetchSubmit = useServerFn(submitLeave);
  const subMut = useMutation({
    mutationFn: () =>
      fetchSubmit({ data: { from_date: from, to_date: to, reason, remarks: remarks || null } }),
    onSuccess: () => {
      setOpen(false);
      setReason("");
      setRemarks("");
      setError(null);
      qc.invalidateQueries({ queryKey: ["leaves"] });
    },
    onError: (e: any) => setError(e.message),
  });

  const fetchReview = useServerFn(reviewLeave);
  const revMut = useMutation({
    mutationFn: (p: { id: string; status: string; admin_remarks?: string | null }) => fetchReview({ data: p }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leaves"] }),
    onError: (e: any) => setError(e.message),
  });

  return (
    <div>
      <PageHeader
        title={isAdmin ? "Leave requests" : "My leaves"}
        subtitle={isAdmin ? `${pending.length} pending` : undefined}
      />
      <Button className="mb-4 w-full md:w-auto" onClick={() => setOpen(true)}>
        + Apply for leave
      </Button>

      <SectionTitle>{isAdmin ? "All requests" : "My requests"}</SectionTitle>
      <div className="space-y-2.5">
        {leaves.length === 0 && <Card className="p-4 text-sm text-muted-foreground">No leave requests.</Card>}
        {leaves.map((l) => (
          <Card key={l.id} className="p-4">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {l.staff?.name ?? "Me"} · {fmtDate(l.from_date)} → {fmtDate(l.to_date)}
                </p>
                <p className="truncate text-xs text-muted-foreground">{l.reason}</p>
              </div>
              <StatusBadge status={l.status} />
            </div>
            {l.remarks && <p className="mt-1 text-xs text-muted-foreground">Remarks: {l.remarks}</p>}
            {l.status !== "pending" && l.reviewed_by_name && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                {l.status === "approved" ? "Approved" : "Rejected"} by {l.reviewed_by_name}
                {l.admin_remarks ? ` — ${l.admin_remarks}` : ""}
              </p>
            )}
            {isAdmin && l.status === "pending" && (
              <div className="mt-3 flex gap-2">
                <Button size="sm" className="flex-1" disabled={revMut.isPending} onClick={() => revMut.mutate({ id: l.id, status: "approved" })}>
                  Approve
                </Button>
                <Button size="sm" variant="outline" className="flex-1" disabled={revMut.isPending} onClick={() => revMut.mutate({ id: l.id, status: "rejected" })}>
                  Reject
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>

      {error && <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); setError(null); }}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>Apply for leave</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>From</Label>
                <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>To</Label>
                <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Reason *</Label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Remarks</Label>
              <Input value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={!reason || subMut.isPending} onClick={() => subMut.mutate()}>
              {subMut.isPending ? "Submitting…" : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
