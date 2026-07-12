import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-[80px] w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm text-foreground transition-colors outline-none placeholder:text-muted-foreground/50 focus-visible:border-brand/50 focus-visible:ring-1 focus-visible:ring-brand/30 disabled:cursor-not-allowed disabled:bg-muted/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20 md:text-sm dark:bg-background dark:disabled:bg-muted/50 resize-y",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
