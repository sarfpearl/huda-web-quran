import type { Metadata } from "next";
import { CommentsModeration } from "@/components/admin/CommentsModeration";

export const metadata: Metadata = {
  title: "Comments · Admin",
  robots: { index: false, follow: false },
};

export default function AdminCommentsPage() {
  return <CommentsModeration />;
}
