"use client"

import { useState } from "react"
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  useScopes,
  useScopesForContract,
  useLinkScopesToContract,
  useUnlinkScopesFromContract,
  useCreateScope,
} from "@/hooks/use-scopes"
import { Plus, X, Tags, Loader2, Check, Layers, Info } from "lucide-react"
import type { Scope } from "@/types/api"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { Textarea } from "@/components/ui"

const SCOPE_COLORS = [
  { hex: "#6366f1", label: "Indigo" },
  { hex: "#8b5cf6", label: "Violet" },
  { hex: "#3b82f6", label: "Blue" },
  { hex: "#06b6d4", label: "Cyan" },
  { hex: "#14b8a6", label: "Teal" },
  { hex: "#22c55e", label: "Green" },
  { hex: "#eab308", label: "Yellow" },
  { hex: "#f97316", label: "Orange" },
  { hex: "#ef4444", label: "Red" },
  { hex: "#ec4899", label: "Pink" },
]

interface ScopesSectionProps {
  contractId: string
}

function ScopeRow({ scope, onRemove }: { scope: Scope; onRemove?: () => void }) {
  return (
    <div
      className="group flex items-center gap-3 rounded-lg border border-border/50 px-3.5 py-2.5 transition-all hover:border-border hover:bg-accent/30 hover:shadow-xs"
      style={{
        borderLeftColor: scope.color,
        borderLeftWidth: "3px",
      }}
    >
      <span
        className="size-2.5 rounded-full shrink-0"
        style={{ backgroundColor: scope.color }}
      />
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span className="text-sm font-medium">{scope.name}</span>
        {scope.description && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center justify-center size-4 rounded-full text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors"
                aria-label="Show description"
              >
                <Info className="size-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={6} className="max-w-xs">
              <p className="text-xs leading-relaxed">{scope.description}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="p-1 rounded-md text-muted-foreground/30 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
          aria-label={`Remove ${scope.name}`}
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  )
}

function ScopeListItem({ scope, isSelected, onToggle }: { scope: Scope; isSelected: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "w-full flex items-start gap-3 rounded-lg border p-3 text-left transition-all",
        isSelected
          ? "border-2 bg-accent/60 shadow-xs"
          : "border-border/60 hover:border-border hover:bg-accent/30",
      )}
      style={
        isSelected
          ? { borderColor: `${scope.color}50`, backgroundColor: `${scope.color}08` }
          : undefined
      }
    >
      <div
        className={cn(
          "size-5 rounded-full shrink-0 mt-0.5 flex items-center justify-center transition-all",
          isSelected ? "ring-2 ring-offset-1 ring-offset-background" : "ring-1 ring-offset-1 ring-offset-background ring-border",
        )}
        style={{
          backgroundColor: isSelected ? scope.color : `${scope.color}20`,
          ...(isSelected ? {} : { borderColor: scope.color }),
        }}
      >
        {isSelected && <Check className="size-3 text-white" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{scope.name}</p>
        {scope.description ? (
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{scope.description}</p>
        ) : (
          <p className="text-xs text-muted-foreground/40 mt-0.5 italic">No description</p>
        )}
      </div>
      {isSelected && (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium shrink-0 mt-0.5" style={{ color: scope.color }}>
          <Check className="size-3" />
          Assigned
        </span>
      )}
    </button>
  )
}

function ColorPicker({ selected, onSelect }: { selected: string; onSelect: (color: string) => void }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {SCOPE_COLORS.map(({ hex, label }) => (
        <button
          key={hex}
          type="button"
          onClick={() => onSelect(hex)}
          className={cn(
            "size-7 rounded-full transition-all",
            selected === hex
              ? "ring-2 ring-foreground ring-offset-2 ring-offset-background scale-110"
              : "ring-1 ring-transparent hover:scale-110 hover:ring-border",
          )}
          style={{ backgroundColor: hex }}
          aria-label={label}
          title={label}
        />
      ))}
    </div>
  )
}

export function ScopesSection({ contractId }: ScopesSectionProps) {
  const [manageOpen, setManageOpen] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [newColor, setNewColor] = useState(SCOPE_COLORS[0].hex)
  const { data: allScopes, isLoading: scopesLoading } = useScopes()
  const { data: contractScopes, isLoading: contractScopesLoading } = useScopesForContract(contractId)
  const linkScopes = useLinkScopesToContract()
  const unlinkScopes = useUnlinkScopesFromContract()
  const createScope = useCreateScope()

  const isLoading = scopesLoading || contractScopesLoading
  const contractScopeIds = new Set(contractScopes?.map((s) => s.id) ?? [])
  const selectedScopes = contractScopes ?? []
  const isCreatingScope = createScope.isPending

  const handleToggleScope = (scopeId: string, isCurrentlyLinked: boolean) => {
    if (isCurrentlyLinked) {
      unlinkScopes.mutate({ contractId, scope_ids: [scopeId] })
    } else {
      linkScopes.mutate({ contractId, scope_ids: [scopeId] })
    }
  }

  const resetCreateForm = () => {
    setNewName("")
    setNewDescription("")
    setNewColor(SCOPE_COLORS[0].hex)
    setShowCreate(false)
  }

  const handleCreateScope = () => {
    if (!newName.trim()) return
    createScope.mutate(
      {
        name: newName.trim(),
        description: newDescription.trim() || undefined,
        color: newColor,
      },
      {
        onSuccess: (res) => {
          const newScopeId = res.data?.id
          if (newScopeId) {
            linkScopes.mutate({ contractId, scope_ids: [newScopeId] })
          }
          resetCreateForm()
        },
      },
    )
  }

  const sortedAllScopes = allScopes
    ? [...allScopes].sort((a, b) => {
        const aLinked = contractScopeIds.has(a.id) ? 0 : 1
        const bLinked = contractScopeIds.has(b.id) ? 0 : 1
        if (aLinked !== bLinked) return aLinked - bLinked
        return a.name.localeCompare(b.name)
      })
    : []

  return (
    <>
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-start justify-between pb-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Tags className="size-4 text-primary" />
              Scopes
            </CardTitle>
            <CardDescription>
              {isLoading
                ? "Loading scopes..."
                : selectedScopes.length === 0
                  ? "No scopes assigned — add scopes"
                  : `${selectedScopes.length} scope${selectedScopes.length !== 1 ? "s" : ""} assigned`
              }
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={() => setManageOpen(true)}>
            <Layers className="size-3.5 mr-1.5" />
            {selectedScopes.length > 0 ? "Manage" : "Assign"}
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-[42px] w-full rounded-lg" />
              ))}
            </div>
          ) : selectedScopes.length === 0 ? (
            <div className="flex flex-col items-center py-8">
              <div className="size-11 rounded-xl bg-muted flex items-center justify-center mb-3">
                <Tags className="size-5 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">No scopes assigned</p>
              <p className="text-xs text-muted-foreground/60 mt-1 text-center max-w-xs">
                Scopes help categorize contracts by purpose, environment, or team — making it easier to filter and report.
              </p>
            </div>
          ) : (
            <TooltipProvider delayDuration={200}>
              <div className="space-y-1.5">
                {selectedScopes.map((scope) => (
                  <ScopeRow
                    key={scope.id}
                    scope={scope}
                    onRemove={() => handleToggleScope(scope.id, true)}
                  />
                ))}
              </div>
            </TooltipProvider>
          )}
        </CardContent>
      </Card>

      {/* Manage Scopes Dialog */}
      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Tags className="size-4 text-primary" />
              Add Scopes
            </DialogTitle>
            <DialogDescription>
              Assign or remove scopes to categorize this contract. Scopes make it easy to filter and group contracts across the platform.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 -mx-1 px-1">
            {selectedScopes.length > 0 && (
              <div className="rounded-lg border border-border/40 bg-muted/20 p-3">
                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Check className="size-3" />
                  Currently assigned ({selectedScopes.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedScopes.map((scope) => (
                    <span
                      key={scope.id}
                      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium"
                      style={{
                        backgroundColor: `${scope.color}15`,
                        color: scope.color,
                      }}
                    >
                      <span className="size-1.5 rounded-full" style={{ backgroundColor: scope.color }} />
                      {scope.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-lg border border-dashed border-border/60">
              <button
                type="button"
                onClick={() => setShowCreate(!showCreate)}
                className="w-full flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all"
              >
                <div className="size-5 rounded-md border border-dashed border-border/60 flex items-center justify-center">
                  <Plus className="size-3" />
                </div>
                {showCreate ? "Cancel creation" : "Create a new scope"}
              </button>
              {showCreate && (
                <div className="px-3 pb-4 pt-1 space-y-3 border-t border-dashed border-border/40">
                  <div className="grid grid-cols-6 gap-3 w-full">
                    <div className="col-span-3">
                      <Label htmlFor="scope-name" className="text-xs font-medium">Name</Label>
                      <Input
                        id="scope-name"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="e.g. Production"
                        className="h-9 text-sm"
                        autoFocus
                      />
                    </div>
                    <div className="col-span-3">
                      <Label htmlFor="scope-desc" className="text-xs font-medium">Description</Label>
                      <Textarea
                        id="scope-desc"
                        value={newDescription}
                        onChange={(e) => setNewDescription(e.target.value)}
                        placeholder="e.g. Live environment"
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Color</Label>
                    <ColorPicker selected={newColor} onSelect={setNewColor} />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      onClick={handleCreateScope}
                      disabled={!newName.trim() || isCreatingScope}
                    >
                      {isCreatingScope ? (
                        <Loader2 className="size-3.5 animate-spin mr-1" />
                      ) : (
                        <Plus className="size-3.5 mr-1" />
                      )}
                      Create scope
                    </Button>
                    <Button size="sm" variant="ghost" onClick={resetCreateForm}>
                      Cancel
                    </Button>
                  </div>
                  {newName.trim() && (
                    <div className="pt-1 border-t border-border/20">
                      <p className="text-[10px] text-muted-foreground/50 mb-1.5 uppercase tracking-wider font-medium">Preview</p>
                      <div
                        className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium"
                        style={{
                          backgroundColor: `${newColor}15`,
                          color: newColor,
                        }}
                      >
                        <span className="size-1.5 rounded-full" style={{ backgroundColor: newColor }} />
                        {newName.trim()}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5 px-0.5">
                <Layers className="size-3" />
                All scopes ({allScopes?.length ?? 0})
              </p>
              {sortedAllScopes.length === 0 && !showCreate ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Tags className="size-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No scopes available</p>
                  <p className="text-xs mt-1">Create a scope to get started.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sortedAllScopes.map((scope) => (
                    <ScopeListItem
                      key={scope.id}
                      scope={scope}
                      isSelected={contractScopeIds.has(scope.id)}
                      onToggle={() => handleToggleScope(scope.id, contractScopeIds.has(scope.id))}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="mt-4 pt-3 border-t border-border/40">
            <DialogClose asChild>
              <Button variant="default">Done</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
