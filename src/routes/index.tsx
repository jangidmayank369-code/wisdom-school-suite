import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      throw redirect({ to: data.session ? "/dashboard" : "/auth" });
    });
  }, []);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-pulse rounded-full bg-primary/15" />
        <p className="text-sm text-muted-foreground">Loading Wisdom Public School ERP…</p>
      </div>
    </div>
  );
}
