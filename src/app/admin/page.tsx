import type { Metadata } from "next";
import { AdminDashboard } from "./AdminDashboard";

// Never index the admin page in search engines
export const metadata: Metadata = {
  title: "Admin — Elden Smash",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminDashboard />;
}
