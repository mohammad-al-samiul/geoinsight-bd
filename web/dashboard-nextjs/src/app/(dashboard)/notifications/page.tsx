import { NotificationCenter } from "@/components/layout/notification-center";

export default function NotificationsPage() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/80 bg-background/70 p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Monitor critical events, severity, and the latest alerts in one place.
        </p>
      </div>
      <div className="rounded-2xl border border-border/80 bg-background/70 p-4 shadow-sm">
        <NotificationCenter inline fullScreenLoading />
      </div>
    </div>
  );
}
