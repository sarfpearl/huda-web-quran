import type { Metadata } from "next";
import { DashboardView } from "@/components/admin/DashboardView";

export const metadata: Metadata = {
  title: "Dashboard · Admin",
  robots: { index: false, follow: false },
};

export default function AdminDashboardPage() {
  return <DashboardView />;
}
