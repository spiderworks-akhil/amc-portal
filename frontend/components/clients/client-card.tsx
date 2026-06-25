"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Mail, Building2, Layers, Users, RefreshCw } from "lucide-react"
import type { ClientListItem } from "@/types/api"

interface ClientCardProps {
  client: ClientListItem
  onClick: (id: string) => void
  onEdit: (id: string) => void
  onSync?: (id: string) => void
  isSyncing?: boolean
}

export function ClientCard({ client, onClick, onSync, isSyncing }: ClientCardProps) {
  const initials = client.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <Card
      className="group relative cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/20"
      onClick={() => onClick(client.id)}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        {onSync && (
          <Button
            variant="ghost"
            size="icon-xs"
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation()
              onSync(client.id)
            }}
            disabled={isSyncing}
            title="Sync from external portal"
          >
            <RefreshCw className={`size-3.5 ${isSyncing ? "animate-spin" : ""}`} />
          </Button>
        )}
        <div className="flex items-start gap-3">
          <Avatar className="size-11 border-2 border-primary/10 p-1">
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h3 className="font-semibold leading-tight truncate">{client.name}</h3>
            {client.company && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                <Building2 className="size-3" />
                <span className="truncate">{client.company}</span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pb-4">
        {client.email && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="size-3.5 shrink-0" />
            <span className="truncate">{client.email}</span>
          </div>
        )}

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {client.asset_count > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/5 px-2.5 py-0.5 font-medium text-primary">
              <Layers className="size-3" />
              {client.asset_count} {client.asset_count === 1 ? "project" : "projects"}
            </span>
          )}
          {client.manager_count > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 font-medium">
              <Users className="size-3" />
              {client.manager_count} {client.manager_count === 1 ? "manager" : "managers"}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
