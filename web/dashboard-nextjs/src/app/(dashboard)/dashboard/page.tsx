import { redirect } from "next/navigation";

/** Removed from nav — keep redirect so old bookmarks still work. */
export default function CommandDashboardRedirect() {
  redirect("/");
}
