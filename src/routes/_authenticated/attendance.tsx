import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { getAttendanceDay, getMyAttendance, markAttendance } from "@/lib/erp.functions";
import { useErp } from "@/components/erp/AppShell";
import { Card, PageHeader, SectionTitle, StatusBadge } from "@/components/erp/parts";
import { Input } from "@/components/ui/input";
import { fmtDate, todayISO } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/attendance")({
  component: AttendancePage,
});

const STATUSES = [
  { value: "present", label: "P" },
  { value: "absent", label: "A" },
  { value: "half_day", label: "½" },
  { value: "leave", label: "L" },
];

function AttendancePage() {
  const { activeSession, isAdmin, role } = useErp();
  const [date, setDate] = useState(todayISO());
  const qc = useQueryClient();

  const fetchDay = useServerFn(getAttendanceDay);
  const { data } = useSuspenseQuery(
    queryOptions({
      queryKey: ["attendanceDay", activeSession?.id, date],
      queryFn: () => fetchDay({ data: { sessionId: activeSession?.id, date } }),
      enabled: isAdmin,
    })
  );

  const fetchMine = useServerFn(getMyAttendance);
  const mine = useSuspenseQuery(
    queryOptions({
      queryKey: ["myAttendance", activeSession?.id, date],
      queryFn: () => fetchMine({ data: { sessionId: activeSession?.id, date } }),
    })
  );

  const fetchMark = useServerFn(markAttendance);
  const mut = useMutation({
    mutationFn: (payload: { staff_id: string; status: string }) =>
      fetchMark({ data: { ...payload, att_date: date, session_id: activeSession?.id ?? null } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["attendanceDay"] });
      qc.invalidateQueries({ queryKey: ["myAttendance"] });
      qc.invalidateQueries({ queryKey: ["payrollMonth"] });
    },
  });

  if (!isAdmin) {
    // Staff: read-only own attendance
    const rows = (mine.data as any[]) ?? [];
    const counts = rows.reduce<Record<string, number>>((acc, a) => {
      acc[a.status] = (acc[a.status] ?? 0) + 1;
      return acc;
    }, {});
    return (
      <div>
        <PageHeader title="My attendance" subtitle={activeSession ? activeSession.name : undefined} />
        <div className="mb-4 grid grid-cols-4 gap-2 text-center">
          {STATUSES.map((st) => (
            <div key={st.value} className="rounded-xl border bg-card py-2">
              <p className="text-lg font-bold tabular-nums">{counts[st.value] ?? 0}</p>
              <p className="text-[10px] text-muted-foreground">{st.label === "½" ? "Half days" : st.label === "L" ? "Leaves" : st.label === "P" ? "Present" : "Absent"}</p>
            </div>
          ))}
        </div>
        <Card className="divide-y p-0">
          {rows.length === 0 && <p className="p-4 text-sm text-muted-foreground">No attendance marked yet.</p>}
          {rows
            .slice()
            .reverse()
            .map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="text-sm">{fmtDate(a.att_date)}</span>
                <div className="flex-1" />
                <StatusBadge status={a.status} />
              </div>
            ))}
        </Card>
      </div>
    );
  }

  const rows = (data as any[]) ?? [];
  const marked = rows.filter((r) => r.status).length;

  return (
    <div>
      <PageHeader
        title="Staff attendance"
        subtitle={`${marked}/${rows.length} marked${role !== "admin" ? " · view only" : ""}`}
      />
      <Input type="date" className="mb-4" value={date} onChange={(e) => setDate(e.target.value)} />

      <SectionTitle>Mark attendance</SectionTitle>
      <div className="space-y-2">
        {rows.length === 0 && <Card className="p-4 text-sm text-muted-foreground">No active staff.</Card>}
        {rows.map((r) => (
          <Card key={r.staff_id} className="flex items-center gap-3 p-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{r.name}</p>
              {r.status && r.marked_by_name && (
                <p className="truncate text-[11px] text-muted-foreground">
                  {r.status.replace("_", " ")} · {r.marked_by_name}
                </p>
              )}
            </div>
            <div className="flex gap-1.5">
              {STATUSES.map((st) => {
                const active = r.status === st.value;
                return (
                  <button
                    key={st.value}
                    disabled={mut.isPending}
                    onClick={() => mut.mutate({ staff_id: r.staff_id, status: st.value })}
                    className={
                      "h-9 w-9 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 " +
                      (active
                        ? "bg-primary text-primary-foreground"
                        : "border bg-card text-muted-foreground hover:bg-accent")
                    }
                    title={st.value.replace("_", " ")}
                  >
                    {st.label}
                  </button>
                );
              })}
            </div>
          </Card>
        ))}
      </div>
      {mut.isError && (
        <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {(mut.error as Error).message}
        </p>
      )}
      {role !== "admin" && (
        <p className="mt-3 text-center text-xs text-muted-foreground">Only Admin can mark attendance.</p>
      )}
    </div>
  );
}
