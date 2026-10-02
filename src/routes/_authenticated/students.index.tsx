import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { getStudents } from "@/lib/erp.functions";
import { useErp } from "@/components/erp/AppShell";
import { Card, PageHeader } from "@/components/erp/parts";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/students/")({
  component: StudentsPage,
});

function StudentsPage() {
  const { activeSession } = useErp();
  const [q, setQ] = useState("");
  const [className, setClassName] = useState<string>("all");
  const [section, setSection] = useState<string>("all");

  const fetchStudents = useServerFn(getStudents);
  const { data } = useSuspenseQuery(
    queryOptions({
      queryKey: ["students", activeSession?.id, q, className, section],
      queryFn: () =>
        fetchStudents({
          data: {
            sessionId: activeSession?.id,
            q: q.trim() || undefined,
            className: className === "all" ? undefined : className,
            section: section === "all" ? undefined : section,
          },
        }),
    })
  );

  const classes = useMemo(() => [...new Set((data as any[]).map((s) => s.class_name))].sort(), [data]);
  const sections = useMemo(
    () => [...new Set((data as any[]).map((s) => s.section).filter(Boolean))].sort() as string[],
    [data]
  );

  return (
    <div>
      <PageHeader title="Students" subtitle={`${(data as any[]).length} students${activeSession ? ` · ${activeSession.name}` : ""}`} />
      <div className="mb-3 space-y-2">
        <Input
          placeholder="Search name, admission no, father's name…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          inputMode="search"
        />
        <div className="flex gap-2">
          <Select value={className} onValueChange={setClassName}>
            <SelectTrigger className="h-9 flex-1 text-sm">
              <SelectValue placeholder="Class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All classes</SelectItem>
              {classes.map((c) => (
                <SelectItem key={c} value={c}>
                  Class {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={section} onValueChange={setSection}>
            <SelectTrigger className="h-9 flex-1 text-sm">
              <SelectValue placeholder="Section" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sections</SelectItem>
              {sections.map((s) => (
                <SelectItem key={s} value={s}>
                  Section {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="divide-y p-0">
        {(data as any[]).length === 0 && (
          <p className="p-6 text-center text-sm text-muted-foreground">No students match your search.</p>
        )}
        {(data as any[]).map((s) => (
          <Link
            key={s.id}
            to="/students/$studentId"
            params={{ studentId: s.id }}
            className="flex items-center gap-3 px-4 py-3 hover:bg-accent/50"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {s.name?.[0]?.toUpperCase() ?? "?"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{s.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                #{s.admission_no} · Class {s.class_name}
                {s.section ? `-${s.section}` : ""} · Father: {s.father_name ?? "—"}
              </p>
            </div>
            {s.transport_required && (
              <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                Transport
              </span>
            )}
          </Link>
        ))}
      </Card>
    </div>
  );
}
