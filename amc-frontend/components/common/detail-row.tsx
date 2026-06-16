"use client"

import type { ReactNode } from "react"

interface DetailRowProps {
  icon: ReactNode
  iconBg: string
  label: string
  value: ReactNode
  mono?: boolean
}

export function DetailRow({ icon, iconBg, label, value, mono }: DetailRowProps) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border/40 last:border-0 last:pb-0 first:pt-0">
      <div
        className={`size-8 rounded-lg ${iconBg} flex items-center justify-center shrink-0 mt-0.5`}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <div className={`text-sm ${mono ? "font-mono" : ""}`}>{value}</div>
      </div>
    </div>
  )
}

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description: string
}

export function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <div className="text-center py-10 text-muted-foreground">
      <div className="mx-auto mb-3 opacity-30 [&>svg]:size-8">{icon}</div>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs mt-1">{description}</p>
    </div>
  )
}
