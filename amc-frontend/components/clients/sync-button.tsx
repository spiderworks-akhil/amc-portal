"use client"

import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSyncClients } from "@/hooks/use-clients"

export function SyncButton() {
  const syncMutation = useSyncClients()

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => syncMutation.mutate()}
      disabled={syncMutation.isPending}
    >
      <RefreshCw className={`size-3.5 mr-1.5 ${syncMutation.isPending ? "animate-spin" : ""}`} />
      {syncMutation.isPending ? "Syncing..." : "Sync"}
    </Button>
  )
}
