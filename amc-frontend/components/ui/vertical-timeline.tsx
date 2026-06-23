import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface TimelineProps {
  children: ReactNode
  className?: string
}

interface TimelineItemProps {
  children: ReactNode
  className?: string
}

interface TimelineDotProps {
  variant?: "default" | "active" | "muted"
  className?: string
}

export function Timeline({ children, className }: TimelineProps) {
  return (
    <div className={cn("relative", className)}>
      {/* Persistent vertical line running full height */}
      <div className="absolute left-[11px] top-2 bottom-2 w-px bg-gradient-to-b from-primary/15 via-primary/10 to-transparent" />
      {children}
    </div>
  )
}

export function TimelineItem({ children, className }: TimelineItemProps) {
  return (
    <div className={cn("group relative flex items-start gap-4 pb-1", className)}>
      {children}
    </div>
  )
}

export function TimelineDot({ variant = "default", className }: TimelineDotProps) {
  return (
    <div className="relative z-10 flex shrink-0 items-center justify-center">
      <div
        className={cn(
          "size-[10px] rounded-full ring-[3px] ring-background transition-colors duration-200",
          variant === "default" && "bg-primary/35",
          variant === "active" && "bg-primary shadow-xs shadow-primary/20",
          variant === "muted" && "bg-muted-foreground/20",
          className,
        )}
      />
    </div>
  )
}

export function TimelineContent({ children, className }: TimelineProps) {
  return <div className={cn("min-w-0 flex-1 pb-5", className)}>{children}</div>
}
