import { ModuleCinematicLoader } from "@/components/ui/module-motion";

/** Shared route-transition screen before any dashboard module is ready. */
export default function DashboardLoading() {
  return (
    <ModuleCinematicLoader
      bn
      fullScreen
      label="জাতীয় কমান্ড ডেটা সিঙ্ক হচ্ছে…"
    />
  );
}
