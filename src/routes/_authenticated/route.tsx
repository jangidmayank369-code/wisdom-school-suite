import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { queryOptions } from "@tanstack/react-query";
import { getBootstrap } from "@/lib/erp.functions";
import { useServerFn } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, type Bootstrap } from "@/components/erp/AppShell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: AuthenticatedLayout,
});

const bootstrapOptions = (fn: ReturnType<typeof useServerFn>) =>
  queryOptions({ queryKey: ["bootstrap"], queryFn: fn });

function AuthenticatedLayout() {
  const fetchBootstrap = useServerFn(getBootstrap);
  const { data } = useSuspenseQuery(bootstrapOptions(fetchBootstrap));
  return (
    <AppShell bootstrap={data as Bootstrap}>
      <Outlet />
    </AppShell>
  );
}
