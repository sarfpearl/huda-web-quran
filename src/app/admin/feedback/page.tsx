import type { Metadata } from "next";
import { FeedbackInbox } from "@/components/admin/FeedbackInbox";

export const metadata: Metadata = {
  title: "Feedback · Admin",
  robots: { index: false, follow: false },
};

export default function AdminFeedbackPage() {
  return <FeedbackInbox />;
}
