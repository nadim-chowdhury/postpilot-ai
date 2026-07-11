import { Spinner } from "@/components/shared/spinner";

export default function Loading() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" />
        <p className="text-xs text-muted-foreground">Loading…</p>
      </div>
    </div>
  );
}
