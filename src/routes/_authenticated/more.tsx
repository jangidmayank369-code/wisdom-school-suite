import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { MORE_LINKS, useErp } from "@/components/erp/AppShell";
import { Card, PageHeader } from "@/components/erp/parts";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/more")({
  component: MorePage,
});

function MorePage() {
  const { profile, role, can } = useErp();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);

  const links = MORE_LINKS.filter((l) => can(l.module));

  const signOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  return (
    <div>
      <PageHeader title="More" />

      <Card className="mb-4 flex items-center gap-3 p-4">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
          {profile?.full_name?.[0]?.toUpperCase() ?? "?"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{profile?.full_name}</p>
          <p className="text-xs capitalize text-muted-foreground">{role} · {profile?.username}</p>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3">
        {links.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className="rounded-2xl border bg-card px-4 py-4 hover:bg-accent/50"
          >
            <p className="text-sm font-semibold">{l.label}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{l.desc}</p>
          </Link>
        ))}
      </div>

      <Button variant="outline" className="mt-6 w-full" disabled={signingOut} onClick={signOut}>
        {signingOut ? "Signing out…" : "Sign out"}
      </Button>
      <p className="mt-6 text-center text-xs text-muted-foreground">Wisdom Public School · ERP &amp; Accounts</p>
    </div>
  );
}
