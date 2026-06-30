import type { ReactNode } from "react";
import { useAdminFlags } from "@loupe/core";
import { NotFound } from "@/features/misc/NotFound/NotFound";

/**
 * Route gate for developer-portal pages. Unlike the public {@link FeatureGate},
 * it reads the page's `admin_*` flag from the **admin-only** flags endpoint, so
 * those flag names never have to ride in the public `/v1/flags` map (keeping the
 * portal's surface invisible to non-admins). Only ever rendered inside
 * AdminLayout, which already 404s non-admins, so the admin query is safe here.
 *
 * Defaults to showing the page while the flags load or if the row doesn't exist
 * yet — a disabled flag (explicit `false`) is the only thing that 404s the page.
 */
export function AdminFeatureGate({ flag, children }: { flag: string; children: ReactNode }) {
  const { data } = useAdminFlags();
  const row = data?.find((f) => f.key === flag);
  const on = !row || row.enabled;
  return <>{on ? children : <NotFound />}</>;
}
