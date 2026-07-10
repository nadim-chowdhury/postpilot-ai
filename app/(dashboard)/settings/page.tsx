import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Settings</h2>
        <p className="text-sm text-muted-foreground">
          Configure your app, AI preferences, and scheduling defaults.
        </p>
      </div>

      <div className="rounded-xl border border-border/50 bg-card p-6">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Settings className="h-5 w-5" />
          <p className="text-sm">
            Settings will be available once pages are connected.
          </p>
        </div>
      </div>
    </div>
  );
}
