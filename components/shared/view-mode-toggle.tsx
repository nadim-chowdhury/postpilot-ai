"use client";

import { LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";

export type ViewMode = "grid" | "list";

interface ViewModeToggleProps {
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
}

export function ViewModeToggle({ mode, onModeChange }: ViewModeToggleProps) {
  return (
    <div className="flex items-center rounded-lg border border-border/50 bg-background p-0.5">
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={() => onModeChange("grid")}
        className={`rounded-md transition-all duration-150 ${
          mode === "grid"
            ? "bg-accent text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
        title="Grid view"
      >
        <LayoutGrid className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={() => onModeChange("list")}
        className={`rounded-md transition-all duration-150 ${
          mode === "list"
            ? "bg-accent text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
        title="List view"
      >
        <List className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
