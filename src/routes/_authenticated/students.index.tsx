import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import { createStudent, getStudents, importStudents, updateStudent } from "@/lib/erp.functions";
import { useErp } from "@/components/erp/AppShell";
import { Card, PageHeader } from "@/components/erp/parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { downloadCSV } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/students/")({
  component: StudentsPage,
});

const FIELDS = [
  ["admission_no", "Admission no *"],
  ["sr_number", "SR number"],
  ["name", "Student name *"],
  ["father_name", "Father name"],
  ["mother_name", "Mother / guardian"],
  ["class_name", "Class *"],
  ["section", "Section"],
  ["contact", "Mobile"],
  ["whatsapp", "WhatsApp"],
  ["dob", "Date of birth"],
  ["gender", "Gender"],
  ["admission_date", "Admission date"],
  ["address", "Address"],
] as const;
type FKey = (typeof FIELDS)[number][0];
type Form = Record<FKey, string> & { status: string };
const emptyForm = (): Form =>
  ({ ...Object.fromEntries(FIELDS.map(([k]) => [k, ""])), status: "active" }) as Form;
const CSV_COLS = FIELDS.map(([k]) => k);

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cur = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cur); cur = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cur); cur = "";
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
    } else cur += c;
  }
  row.push(cur);
  if (row.some((x) => x.trim())) rows.push(row);
  return rows;
}

function StudentsPage() {
  const { activeSession, can, isFinance } = useErp();
  const canEdit = isFinance || can("students");
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [className, setClassName] = useState<string>("all");
  const [section, setSection] = useState<string>("all");

  const fetchStudents = useServerFn(getStudents);
  const { data } = useSuspenseQuery(
    queryOptions({
      queryKey: ["students", activeSession?.id],
      queryFn: () => fetchStudents({ data: { sessionId: activeSession?.id } }),
    })
  );
  const all = (data as any[]) ?? [];
  const classes = useMemo(() => [...new Set(all.map((s) => s.class_name))].sort(), [all]);
  const sections = useMemo(() => [...new Set(all.map((s) => s.section).filter(Boolean))].sort() as string[], [all]);
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return all.filter(
      (s) =>
        (className === "all" || s.class_name === className) &&
        (section === "all" || s.section === section) &&
        (!t || [s.name, s.admission_no, s.sr_number, s.father_name, s.contact].some((v) => String(v ?? "").toLowerCase().includes(t)))
    );
  }, [all, q, className, section]);

  // add / edit
  const [editId, setEditId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(emptyForm());
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const createFn = useServerFn(createStudent);
  const updateFn = useServerFn(updateStudent);
  const saveMut = useMutation({
    mutationFn: async () => {
      if (!activeSession) throw new Error("No academic session selected");
      const base = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim() || null])) as any;
      if (editId) return updateFn({ data: { ...base, status: form.status, id: editId, session_id: activeSession.id } });
      return createFn({ data: { ...base, session_id: activeSession.id, transport_required: false } });
    },
    onSuccess: () => {
      setMsg(editId ? "Student updated." : "Student added.");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["students"] });
      qc.invalidateQueries({ queryKey: ["student"] });
    },
    onError: (e: any) => setError(e.message),
  });
  const openAdd = () => { setEditId(null); setForm(emptyForm()); setError(null); setOpen(true); };
  const openEdit = (s: any) => {
    setEditId(s.id);
    setForm({ ...(Object.fromEntries(FIELDS.map(([k]) => [k, s[k] ?? ""])) as any), status: s.status ?? "active" });
    setError(null);
    setOpen(true);
  };

  // import
  const [impOpen, setImpOpen] = useState(false);
  const [preview, setPreview] = useState<{ row: any; errors: string[] }[]>([]);
  const importFn = useServerFn(importStudents);
  const impMut = useMutation({
    mutationFn: () =>
      importFn({ data: { session_id: activeSession!.id, rows: preview.filter((p) => !p.errors.length).map((p) => p.row) } }),
    onSuccess: (r: any) => {
      setMsg(`Imported ${r.inserted} students.${r.skipped.length ? ` Skipped duplicates: ${r.skipped.join(", ")}` : ""}`);
      setImpOpen(false);
      setPreview([]);
      qc.invalidateQueries({ queryKey: ["students"] });
    },
    onError: (e: any) => setError(e.message),
  });
  const onFile = async (file: File) => {
    const rows = parseCSV(await file.text());
    const header = (rows[0] ?? []).map((h) => h.trim().toLowerCase().replace(/[^a-z_]/g, "_"));
    const existing = new Set(all.map((s) => String(s.admission_no).toLowerCase()));
    const inFile = new Set<string>();
    setPreview(
      rows.slice(1).map((r) => {
        const row: any = {};
        header.forEach((h, i) => { if ((CSV_COLS as readonly string[]).includes(h)) row[h] = (r[i] ?? "").trim() || null; });
        const errors: string[] = [];
        if (!row.admission_no) errors.push("Admission no missing");
        if (!row.name) errors.push("Name missing");
        if (!row.class_name) errors.push("Class missing");
        for (const d of ["dob", "admission_date"]) if (row[d] && !/^\d{4}-\d{2}-\d{2}$/.test(row[d])) errors.push(`${d} must be YYYY-MM-DD`);
        const k = String(row.admission_no ?? "").toLowerCase();
        if (k && existing.has(k)) errors.push("Already exists");
        else if (k && inFile.has(k)) errors.push("Duplicate in file");
        if (k) inFile.add(k);
        return { row, errors };
      })
    );
  };
  const validCount = preview.filter((p) => !p.errors.length).length;

  const exportCSV = () =>
    downloadCSV(`students-${activeSession?.name ?? "all"}.csv`, [
      [...CSV_COLS, "status"],
      ...list.map((s) => [...CSV_COLS.map((k) => s[k] ?? ""), s.status]),
    ]);

  return (
    <div className="min-w-0">
      <PageHeader title="Students" subtitle={`${list.length} of ${all.length}${activeSession ? ` · ${activeSession.name}` : ""}`} />
      <div className="mb-3 flex flex-wrap gap-2">
        {canEdit && <Button size="sm" onClick={openAdd}>+ Add student</Button>}
        {canEdit && <Button size="sm" variant="outline" onClick={() => { setPreview([]); setError(null); setImpOpen(true); }}>Import CSV</Button>}
        <Button size="sm" variant="outline" onClick={exportCSV}>Export CSV</Button>
      </div>
      {msg && <p className="mb-3 rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary">{msg}</p>}
      <div className="mb-3 space-y-2">
        <Input placeholder="Search name, admission/SR no, father, mobile…" value={q} onChange={(e) => setQ(e.target.value)} inputMode="search" />
        <div className="flex gap-2">
          <Select value={className} onValueChange={setClassName}>
            <SelectTrigger className="h-9 min-w-0 flex-1 text-sm"><SelectValue placeholder="Class" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All classes</SelectItem>
              {classes.map((c) => <SelectItem key={c} value={c}>Class {c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={section} onValueChange={setSection}>
            <SelectTrigger className="h-9 min-w-0 flex-1 text-sm"><SelectValue placeholder="Section" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sections</SelectItem>
              {sections.map((s) => <SelectItem key={s} value={s}>Section {s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="divide-y p-0">
        {list.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No students match your search.</p>}
        {list.map((s) => (
          <div key={s.id} className="flex items-center gap-2 pr-2 hover:bg-accent/50">
            <Link to="/students/$studentId" params={{ studentId: s.id }} className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {s.name?.[0]?.toUpperCase() ?? "?"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{s.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  #{s.admission_no} · Class {s.class_name}{s.section ? `-${s.section}` : ""} · {s.father_name ?? "—"}
                </p>
              </div>
              {s.status !== "active" && <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] capitalize">{s.status}</span>}
            </Link>
            {canEdit && (
              <button aria-label="Edit student" onClick={() => openEdit(s)} className="shrink-0 rounded-md p-2 text-muted-foreground hover:bg-accent">
                <Pencil className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] w-[calc(100vw-1.5rem)] max-w-md overflow-y-auto rounded-2xl">
          <DialogHeader><DialogTitle>{editId ? "Edit student" : "Add student"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {FIELDS.map(([k, label]) => (
              <div key={k} className={"min-w-0 space-y-1.5 " + (k === "address" ? "sm:col-span-2" : "")}>
                <Label>{label}</Label>
                <Input
                  type={k === "dob" || k === "admission_date" ? "date" : "text"}
                  inputMode={k === "contact" || k === "whatsapp" ? "tel" : undefined}
                  value={form[k]}
                  onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                />
              </div>
            ))}
            {editId && (
              <div className="min-w-0 space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["active", "inactive", "left", "passed"].map((x) => <SelectItem key={x} value={x} className="capitalize">{x}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              disabled={!form.admission_no.trim() || !form.name.trim() || !form.class_name.trim() || saveMut.isPending}
              onClick={() => { setError(null); saveMut.mutate(); }}
            >
              {saveMut.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={impOpen} onOpenChange={setImpOpen}>
        <DialogContent className="max-h-[90vh] w-[calc(100vw-1.5rem)] max-w-lg overflow-y-auto rounded-2xl">
          <DialogHeader><DialogTitle>Import students (CSV)</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground">
            Into session <b>{activeSession?.name}</b>. Required: admission_no, name, class_name. Dates as YYYY-MM-DD. Existing admission numbers are skipped, never overwritten.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => downloadCSV("students-sample.csv", [CSV_COLS as unknown as string[], ["A-1001", "SR-55", "Ravi Kumar", "Suresh Kumar", "Sunita Devi", "5", "A", "9876543210", "9876543210", "2015-04-12", "Male", "2026-04-01", "Doomra"]])}>
              Download sample
            </Button>
            <Input type="file" accept=".csv,text/csv" className="h-9 min-w-0 flex-1" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
          </div>
          {preview.length > 0 && (
            <>
              <p className="text-sm"><b>{validCount}</b> valid · <b className="text-destructive">{preview.length - validCount}</b> with errors</p>
              <div className="max-h-64 divide-y overflow-y-auto rounded-lg border">
                {preview.map((p, i) => (
                  <div key={i} className={"px-3 py-2 text-xs " + (p.errors.length ? "bg-destructive/5" : "")}>
                    <p className="truncate font-medium">Row {i + 2}: {p.row.name ?? "—"} · #{p.row.admission_no ?? "—"} · Class {p.row.class_name ?? "—"}</p>
                    {p.errors.length > 0 && <p className="text-destructive">{p.errors.join("; ")}</p>}
                  </div>
                ))}
              </div>
            </>
          )}
          {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setImpOpen(false)}>Cancel</Button>
            <Button disabled={!validCount || !activeSession || impMut.isPending} onClick={() => { setError(null); impMut.mutate(); }}>
              {impMut.isPending ? "Importing…" : `Import ${validCount} students`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
