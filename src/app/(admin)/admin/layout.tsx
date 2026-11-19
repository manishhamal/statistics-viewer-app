import type { ReactNode } from "react";
import { getCurator } from "@/server/auth/session";
import AdminNav from "@/components/admin/AdminNav";

// Shows the curator bar on every /admin page for active curators (not on the
// login page, where there is no curator session yet).
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const curator = await getCurator();
  return (
    <>
      {curator && <AdminNav email={curator.email} role={curator.role} />}
      {children}
    </>
  );
}
