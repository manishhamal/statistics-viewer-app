import { redirect } from "next/navigation";

// /admin has no page of its own; send curators to their tasks.
// Middleware sends anyone who is not a signed-in curator to /admin/login first.
export default function AdminIndexPage() {
  redirect("/admin/tasks");
}
