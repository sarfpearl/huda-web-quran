import { redirect } from "next/navigation";

// Only live (Supabase-backed) admin tools are shown for now; the demo Bayan
// dashboard is hidden, so /admin opens comment moderation.
export default function AdminIndex() {
  redirect("/admin/comments");
}
