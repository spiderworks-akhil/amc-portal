import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

// ── Types ──

interface TimelineProps {
  children: ReactNode
  className?: string
}

interface TimelineItemProps {
  children: ReactNode
  isLast?: boolean
  className?: string
}

interface TimelineDotProps {
  variant?: "default" | "active" | "muted"
  className?: string
}

// ── Timeline Container ──

export function Timeline({ children, className }: TimelineProps) {
  return <div className={cn("relative", className)}>{children}</div>
}

// ── Timeline Item ──

export function TimelineItem({ children, isLast = false, className }: TimelineItemProps) {
  return (
    <div className={cn("group relative flex items-start gap-3", className)}>
      {!isLast && (
        <div className="absolute left-[7px] top-[22px] bottom-0 w-px bg-gradient-to-b from-border/60 to-transparent" />
      )}
      {children}
    </div>
  )
}

// ── Timeline Dot ──

export function TimelineDot({ variant = "default", className }: TimelineDotProps) {
  return (
    <div className="relative z-10 flex shrink-0 items-center justify-center">
      <div
        className={cn(
          "size-[14px] rounded-full ring-2 ring-background transition-colors",
          variant === "default" && "bg-primary/40 group-hover:bg-primary/60",
          variant === "active" && "bg-primary",
          variant === "muted" && "bg-border/50",
          className,
        )}
      />
    </div>
  )
}

// ── Timeline Content ──

export function TimelineContent({ children, className }: TimelineProps) {
  return <div className={cn("min-w-0 flex-1 -mt-0.5", className)}>{children}</div>
}
