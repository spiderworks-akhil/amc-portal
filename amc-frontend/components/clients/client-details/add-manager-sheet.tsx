"use client"

import { useEffect, useState } from "react"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { UserPlus } from "lucide-react"
import { useAvailableManagers } from "@/hooks/use-clients"
import { getInitials } from "@/lib/utils"

export function AddManagerSheet({
  open,
  onOpenChange,
  onSelect,
  excludeIds,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (id: string) => void
  excludeIds: string[]
}) {
  const { data: availableManagers, isLoading } = useAvailableManagers()
  const [search, setSearch] = useState("")

  const filtered = (availableManagers ?? []).filter(
    (m) => !excludeIds.includes(m.id) && (m.name.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase()))
  )

  useEffect(() => {
    if (filtered.length === 0 && !isLoading && !search && (availableManagers?.length ?? 0) > 0) {
      onOpenChange(false)
    }
  }, [filtered.length, isLoading, search, availableManagers?.length, onOpenChange])

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="w-full sm:max-w-[394px] overflow-hidden">
        <DrawerHeader>
          <DrawerTitle>Add Account Manager</DrawerTitle>
          <DrawerDescription>Search and assign a user as an account manager.</DrawerDescription>
        </DrawerHeader>
        <div className="p-4 pt-6 space-y-4">
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          <div className="space-y-1 max-h-[60vh] overflow-y-auto">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5">
                  <Skeleton className="size-8 rounded-full" />
                  <div className="space-y-1 flex-1">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-36" />
                  </div>
                </div>
              ))
            ) : filtered.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {search ? "No users found" : "No users available"}
              </div>
            ) : (
              filtered.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => {
                    onSelect(user.id)
                    setSearch("")
                  }}
                  className="flex w-full items-center gap-3 rounded-lg p-2.5 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                >
                  <Avatar className="size-8">
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <UserPlus className="size-4 shrink-0 text-muted-foreground" />
                </button>
              ))
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
