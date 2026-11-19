import { requireCuratorPage } from "@/server/auth/session";
import SetPasswordForm from "@/components/admin/SetPasswordForm";

export const dynamic = "force-dynamic";

export default async function SetPasswordPage() {
  const curator = await requireCuratorPage();
  return (
    <main className="min-h-[70vh] flex items-center justify-center px-5 py-12">
      <SetPasswordForm email={curator.email} />
    </main>
  );
}
