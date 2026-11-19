import { redirect } from "next/navigation";

// /admin has no page of its own; send curators to the review queue.
// Middleware sends anyone who is not a signed-in curator to /admin/login first.
export default function AdminIndexPage() {
  redirect("/admin/review");
}
