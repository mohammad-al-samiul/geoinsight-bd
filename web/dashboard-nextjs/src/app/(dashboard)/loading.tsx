import { RouteSkeleton } from "@/components/ui/skeleton";

/** Soft in-chrome route transition — never a full-screen splash. */
export default function DashboardLoading() {
  return <RouteSkeleton />;
}
