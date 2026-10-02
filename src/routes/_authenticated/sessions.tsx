import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { activateSession, createSession, getSessions } from "@/lib/erp.functions";
import { useErp } from "@/components/erp/AppShell";
import { Card, PageHeader, SectionTitle } from "@/components/erp/parts";
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
import { fmtDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/sessions")({
  component: SessionsPage,
});

function SessionsPage() {
  const { isAdmin } = useErp();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const fetchS = useServerFn(getSessions);
  const { data } = useSuspenseQuery(
    queryOptions({ queryKey: ["sessions"], queryFn: () => fetchS() })
  );
  const sessions = (data as any[]) ?? [];

  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", start_date: "", end_date: "" });

  const fetchCS = useServerFn(createSession);
  const csMut = useMutation({
    mutationFn: () => fetchCS({ data: f }),
    onSuccess: () => {
      setOpen(false);
      setF({ name: "", start_date: "", end_date: "" });
      setError(null);
      qc.invalidateQueries({ queryKey: ["sessions"] });
      qc.invalidateQueries({ queryKey: ["bootstrap"] });
    },
    onError: (e: any) => setError(e.message),
  });

  const fetchAct = useServerFn(activateSession);
  const actMut = useMutation({
    mutationFn: (id: string) => fetchAct({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sessions"] });
      qc.invalidateQueries({ queryKey: ["bootstrap"] });
    },
    onError: (e: any) => setError(e.message),
  });

  return (
    <div>
      <PageHeader
        title="Academic sessions"
        subtitle="Student records, fees and payroll always belong to the session they were created in."
      />

      {isAdmin && (
        <Button className="mb-4" onClick={() => setOpen(true)}>
          + New session
        </Button>
      )}

      <SectionTitle>All sessions</SectionTitle>
      <div className="space-y-2.5">
        {sessions.length === 0 && <Card className="p-4 text-sm text-muted-foreground">No sessions yet.</Card>}
        {sessions.map((s) => (
          <Card key={s.id} className={"p-4 " + (s.archived ? "opacity-60" : "")}>
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">
                  {s.name}
                  {s.is_active && (
                    <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                      ACTIVE
                    </span>
                  )}
                  {s.archived && (
                    <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      ARCHIVED
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {fmtDate(s.start_date)} – {fmtDate(s.end_date)}
                </p>
              </div>
              {isAdmin && !s.is_active && !s.archived && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={actMut.isPending}
                  onClick={() => actMut.mutate(s.id)}
                >
                  {actMut.isPending ? "…" : "Set active"}
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {error && <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); setError(null); }}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader><DialogTitle>New session</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. 2026-27" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start *</Label>
                <Input type="date" value={f.start_date} onChange={(e) => setF({ ...f, start_date: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>End *</Label>
                <Input type="date" value={f.end_date} onChange={(e) => setF({ ...f, end_date: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={!f.name || !f.start_date || !f.end_date || csMut.isPending} onClick={() => csMut.mutate()}>
              {csMut.isPending ? "Saving…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
