import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { createUser, getUsers, setUserActive, setUserModules } from "@/lib/erp.functions";
import { MODULES, useErp } from "@/components/erp/AppShell";
import { Card, PageHeader, SectionTitle } from "@/components/erp/parts";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

export const Route = createFileRoute("/_authenticated/users")({
  component: UsersPage,
});

function UsersPage() {
  const { isAdmin } = useErp();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  if (!isAdmin) {
    return (
      <div>
        <PageHeader title="Users" />
        <Card className="p-6 text-center text-sm text-muted-foreground">Only Admin can manage users.</Card>
      </div>
    );
  }
  return <AdminUsers qc={qc} setError={setError} />;
}

function AdminUsers({
  qc,
  setError,
}: {
  qc: ReturnType<typeof useQueryClient>;
  setError: (e: string | null) => void;
}) {
  const fetchU = useServerFn(getUsers);
  const { data } = useSuspenseQuery(queryOptions({ queryKey: ["users"], queryFn: () => fetchU() }));
  const users = ((data as any)?.users ?? []) as any[];

  const fetchActive = useServerFn(setUserActive);
  const activeMut = useMutation({
    mutationFn: (p: { userId: string; active: boolean }) => fetchActive({ data: p }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
    onError: (e: any) => setError(e.message),
  });

  const fetchMods = useServerFn(setUserModules);
  const modsMut = useMutation({
    mutationFn: (p: { userId: string; modules: string[] }) => fetchMods({ data: p }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      setError(null);
    },
    onError: (e: any) => setError(e.message),
  });

  const fetchCreate = useServerFn(createUser);
  const createMut = useMutation({
    mutationFn: (p: any) => fetchCreate({ data: p }),
    onSuccess: () => {
      setOpen(false);
      setForm({ full_name: "", email: "", password: "", role: "staff", modules: [] });
      setError(null);
      qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e: any) => setError(e.message),
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", password: "", role: "staff", modules: [] as string[] });

  const roleOf = (u: any) => (u.roles?.[0] as string) ?? "staff";

  return (
    <div>
      <PageHeader title="Users" subtitle="No public sign-up — accounts are created here only." />
      <Button className="mb-4" onClick={() => setOpen(true)}>
        + Create user
      </Button>

      <SectionTitle>All users</SectionTitle>
      <div className="space-y-2.5">
        {users.map((u) => {
          const role = roleOf(u);
          const mods: string[] = u.modules ?? [];
          return (
            <Card key={u.id} className="p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {(u.full_name ?? u.username ?? "?")[0]?.toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {u.full_name || u.username}
                    {!u.active && (
                      <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                        DISABLED
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{u.username ?? u.id}</p>
                </div>
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold capitalize text-primary">
                  {role}
                </span>
              </div>

              {role === "staff" && (
                <div className="mt-3 border-t pt-3">
                  <p className="mb-2 text-[11px] font-medium text-muted-foreground">
                    Allowed modules (staff can only open these)
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                    {MODULES.map((m) => (
                      <label key={m.module} className="flex items-center gap-1.5 text-xs">
                        <Checkbox
                          checked={mods.includes(m.module)}
                          onCheckedChange={(v) => {
                            const next = v ? [...mods, m.module] : mods.filter((x) => x !== m.module);
                            modsMut.mutate({ userId: u.id, modules: next });
                          }}
                        />
                        {m.label}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  variant={u.active ? "outline" : "default"}
                  disabled={activeMut.isPending}
                  onClick={() => activeMut.mutate({ userId: u.id, active: !u.active })}
                >
                  {u.active ? "Disable account" : "Enable account"}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {error && <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); setError(null); }}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader><DialogTitle>Create user</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Full name *</Label>
              <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input inputMode="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Temporary password * (min 8 chars)</Label>
              <Input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="accountant">Accountant</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.role === "staff" && (
              <div className="space-y-1.5">
                <Label>Modules</Label>
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  {MODULES.map((m) => (
                    <label key={m.module} className="flex items-center gap-1.5 text-xs">
                      <Checkbox
                        checked={form.modules.includes(m.module)}
                        onCheckedChange={(v) =>
                          setForm({
                            ...form,
                            modules: v ? [...form.modules, m.module] : form.modules.filter((x) => x !== m.module),
                          })
                        }
                      />
                      {m.label}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              disabled={!form.full_name || !form.email || form.password.length < 8 || createMut.isPending}
              onClick={() =>
                createMut.mutate({
                  full_name: form.full_name,
                  email: form.email,
                  password: form.password,
                  role: form.role,
                  modules: form.modules,
                })
              }
            >
              {createMut.isPending ? "Creating…" : "Create user"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
