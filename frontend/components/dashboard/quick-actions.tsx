"use client"

import { useRouter } from "next/navigation"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Users, HardDrive, FileText, Globe, Activity } from "lucide-react"

const actions = [
  { label: "Manage Clients", icon: Users, href: "/clients", color: "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400" },
  { label: "View Projects", icon: HardDrive, href: "/projects", color: "bg-violet-50 text-violet-600 dark:bg-violet-950/30 dark:text-violet-400" },
  { label: "Track Contracts", icon: FileText, href: "/contracts", color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400" },
  { label: "Domain Health", icon: Globe, href: "/domains", color: "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400" },
]

export function QuickActions() {
  const router = useRouter()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="size-4 text-muted-foreground" />
          Quick Actions
        </CardTitle>
        <CardDescription>Jump to common management tasks</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {actions.map((action) => (
            <button
              key={action.label}
              onClick={() => router.push(action.href)}
              className="flex items-center gap-3 rounded-lg border border-border/60 p-3.5 text-left transition-all hover:border-primary/30 hover:shadow-sm hover:bg-accent/30 group cursor-pointer"
            >
              <div className={`size-9 rounded-lg flex items-center justify-center ${action.color}`}>
                <action.icon className="size-4" />
              </div>
              <span className="text-sm font-medium group-hover:text-primary transition-colors">
                {action.label}
              </span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
