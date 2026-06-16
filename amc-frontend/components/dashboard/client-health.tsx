"use client"

import { useRouter } from "next/navigation"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { TrendingDown, Globe, ArrowRight, CheckCircle2 } from "lucide-react"
import type { ClientDomainHealth } from "@/hooks/use-dashboard"
import { ExpiryBar } from "./helpers"

interface ClientHealthProps {
  clients: ClientDomainHealth[] | undefined
  isLoading: boolean
}

export function ClientHealth({ clients, isLoading }: ClientHealthProps) {
  const router = useRouter()

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingDown className="size-4 text-muted-foreground" />
            Domain Health by Client
          </CardTitle>
          <CardDescription>Clients with domains requiring attention</CardDescription>
        </div>
        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => router.push("/clients")}>
          View clients <ArrowRight className="size-3.5 ml-1" />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-4 w-32" />
                <div className="flex-1">
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
                <Skeleton className="h-4 w-8" />
              </div>
            ))}
          </div>
        ) : !clients?.length ? (
          <div className="text-center py-10 text-muted-foreground">
            <CheckCircle2 className="size-10 mx-auto mb-3 opacity-30 text-emerald-500" />
            <p className="text-sm font-medium">No domain issues</p>
            <p className="text-xs mt-1">All clients have healthy domains.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {clients.slice(0, 8).map((client,i) => (
              <div
                key={client.client_id + i}
                role="button"
                tabIndex={0}
                onClick={() => router.push(`/clients/${client.client_id}`)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") router.push(`/clients/${client.client_id}`) }}
                className="group cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium group-hover:text-primary transition-colors">
                      {client.client_name}
                    </span>
                    {client.expired > 0 && (
                      <Badge variant="dot" size="sm" color="red">
                        {client.expired} expired
                      </Badge>
                    )}
                    {client.expiring_30 > 0 && (
                      <Badge variant="dot" size="sm" color="amber">
                        {client.expiring_30} expiring
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Globe className="size-3" />
                    <span>{client.total_domains}</span>
                  </div>
                </div>
                <ExpiryBar
                  expired={client.expired}
                  expiring30={client.expiring_30}
                  expiring60={client.expiring_90}
                  healthy={client.healthy}
                  total={client.total_domains}
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
