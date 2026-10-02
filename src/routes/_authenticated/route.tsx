import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getBootstrap } from "@/lib/erp.functions";
import { AppShell, type Bootstrap } from "@/components/erp/AppShell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const fetchBootstrap = useServerFn(getBootstrap);
  const { data } = useSuspenseQuery(
    queryOptions({ queryKey: ["bootstrap"], queryFn: fetchBootstrap })
  );
  return <AppShell bootstrap={data as Bootstrap}>{<Outlet />}</AppShell>;
}
