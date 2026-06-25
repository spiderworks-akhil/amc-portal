"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import { useExpiryCalendar } from "@/hooks/use-dashboard"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import {
  Globe,
  Shield,
  FileText,
  Server,
  CalendarDays,
  List,
  AlertTriangle,
  Clock,
  ExternalLink,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  X,
  Filter,
  Layers,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { ExpiryCalendarItem } from "@/hooks/use-dashboard"

// ── Type Icons & Colors ──

const TYPE_CONFIG = {
  domain: {
    icon: Globe,
    label: "Domain",
    dotColor: "bg-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    ringColor: "ring-blue-500/30",
  },
  ssl: {
    icon: Shield,
    label: "SSL",
    dotColor: "bg-emerald-500",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
    ringColor: "ring-emerald-500/30",
  },
  contract: {
    icon: FileText,
    label: "Contract",
    dotColor: "bg-amber-500",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    ringColor: "ring-amber-500/30",
  },
  server: {
    icon: Server,
    label: "Server",
    dotColor: "bg-red-500",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
    ringColor: "ring-red-500/30",
  },
} as const
type EntityType = keyof typeof TYPE_CONFIG

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const
type ViewMode = "list" | "calendar"

const DATE_RANGE_OPTIONS = [
  { value: 30, label: "30d" },
  { value: 60, label: "60d" },
  { value: 90, label: "90d" },
  { value: 180, label: "6mo" },
] as const

const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

// ── Helpers ──

function getUrgencyLevel(days: number | null): "overdue" | "urgent" | "warning" | "safe" | "none" {
  if (days === null) return "none"
  if (days <= 0) return "overdue"
  if (days <= 7) return "urgent"
  if (days <= 30) return "warning"
  if (days <= 60) return "warning"
  return "safe"
}

function getDaysColor(days: number | null): string {
  const level = getUrgencyLevel(days)
  switch (level) {
    case "overdue": return "text-red-600 dark:text-red-400"
    case "urgent": return "text-red-500 dark:text-red-400"
    case "warning": return "text-amber-500 dark:text-amber-400"
    case "safe": return "text-emerald-500 dark:text-emerald-400"
    default: return "text-muted-foreground"
  }
}

function getDaysBg(days: number | null): string {
  const level = getUrgencyLevel(days)
  switch (level) {
    case "overdue": return "bg-red-500/15"
    case "urgent": return "bg-red-500/10"
    case "warning": return "bg-amber-500/10"
    case "safe": return "bg-emerald-500/10"
    default: return "bg-muted/30"
  }
}

function getAccentBorder(days: number | null): string {
  const level = getUrgencyLevel(days)
  switch (level) {
    case "overdue": return "border-l-red-500"
    case "urgent": return "border-l-red-400"
    case "warning": return "border-l-amber-400"
    case "safe": return "border-l-emerald-400"
    default: return "border-l-transparent"
  }
}

function getItemLink(item: ExpiryCalendarItem): string {
  switch (item.item_type) {
    case "domain": return `/domains/${item.id}`
    case "ssl": return `/ssl-certificates/${item.id}`
    case "contract": return `/contracts/${item.id}`
    case "server": return `/servers/${item.id}`
    default: return "#"
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

// ── Days Countdown Badge ──

function DaysBadge({ days }: { days: number | null }) {
  const level = getUrgencyLevel(days)
  if (days === null) return null

  const isUrgent = level === "overdue" || level === "urgent"

  return (
    <motion.div
      className={`flex flex-col items-center justify-center rounded-lg px-3 py-1.5 min-w-[56px] ${getDaysBg(days)}`}
      whileHover={{ scale: 1.05 }}
      transition={{ type: "spring", stiffness: 400, damping: 15 }}
    >
      <span className={`text-xs font-bold leading-none ${getDaysColor(days)}`}>
        {days <= 0 ? "OVERDUE" : `${days}d`}
      </span>
      {!isUrgent && (
        <span className="text-[8px] text-muted-foreground/60 leading-none mt-0.5">left</span>
      )}
    </motion.div>
  )
}

// ── List View Card ──

function CalendarItemCard({ item, index }: { item: ExpiryCalendarItem; index: number }) {
  const router = useRouter()
  const cfg = TYPE_CONFIG[item.item_type]
  const TypeIcon = cfg.icon
  const urgency = getUrgencyLevel(item.days_to_event)
  const accentClass = getAccentBorder(item.days_to_event)
  const isUrgent = urgency === "overdue" || urgency === "urgent"

  return (
  <motion.div
  initial={{ opacity: 0, y: 8 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.2, delay: index * 0.03 }}
  onClick={() => router.push(getItemLink(item))}
  className="
    group
    cursor-pointer
    rounded-lg
    border
    border-border
    bg-background
    px-4
    py-3
    hover:bg-muted/40
    transition-colors
  "
>
  <div className="flex items-center gap-4">

    {/* Type */}
    <div className="flex items-center gap-2 min-w-22.5">
      <div className={`size-2.5 rounded-full ${cfg.dotColor}`} />
      <span className="text-xs text-muted-foreground">
        {cfg.label}
      </span>
    </div>

    {/* Main Content */}
    <div className="flex-1 min-w-0">
      <p className="font-medium truncate">
        {item.fqdn}
      </p>

      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
        {item.asset_id && item.asset_name ? (
          <Link
            href={`/projects/${item.asset_id}`}
            onClick={(e) => e.stopPropagation()}
            className="hover:text-foreground hover:underline underline-offset-2 transition-colors"
          >
            {item.asset_name}
          </Link>
        ) : item.asset_name ? (
          <span>{item.asset_name}</span>
        ) : null}

        {item.client_name && (
          <>
            <span>•</span>
            <span>{item.client_name}</span>
          </>
        )}

        {item.extra_info && (
          <>
            <span>•</span>
            <span>{item.extra_info}</span>
          </>
        )}
      </div>
    </div>

    {/* Expiry Info */}
    <div className="text-right shrink-0">
      {item.days_to_event !== null && (
        <p className={`font-semibold ${getDaysColor(item.days_to_event)}`}>
          {item.days_to_event <= 0
            ? "Overdue"
            : `${item.days_to_event}d`}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        {item.date ? formatDate(item.date) : "—"}
      </p>
    </div>
  </div>
</motion.div>
  )
}

// ── Calendar Grid View ──

function CalendarGridView({ items }: { items: ExpiryCalendarItem[] }) {
  const router = useRouter()
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [direction, setDirection] = useState(0)

  // Items by date map
  const itemsByDate = useMemo(() => {
    const map = new Map<string, ExpiryCalendarItem[]>()
    for (const item of items) {
      if (!item.date) continue
      const key = item.date.split("T")[0]
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(item)
    }
    return map
  }, [items])

  // Calendar grid
  const calendarGrid = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startPad = firstDay.getDay()
    const totalDays = lastDay.getDate()

    const weeks: Array<{ day: number; date: string; isCurrentMonth: boolean }[]> = []
    let week: typeof weeks[0] = []

    for (let i = 0; i < startPad; i++) {
      week.push({ day: 0, date: "", isCurrentMonth: false })
    }

    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
      week.push({ day: d, date: dateStr, isCurrentMonth: true })
      if (week.length === 7) {
        weeks.push(week)
        week = []
      }
    }

    if (week.length > 0) {
      while (week.length < 7) {
        week.push({ day: 0, date: "", isCurrentMonth: false })
      }
      weeks.push(week)
    }

    return weeks
  }, [currentMonth])

  const navigateMonth = (delta: number) => {
    setDirection(delta)
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + delta, 1))
    setSelectedDay(null)
  }

  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`

  const selectedItems = selectedDay ? itemsByDate.get(selectedDay) ?? [] : []

  const typeCount = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const item of selectedItems) {
      counts[item.item_type] = (counts[item.item_type] || 0) + 1
    }
    return counts
  }, [selectedItems])

  // Count total events in this month for the header
  const monthEventCount = useMemo(() => {
    let count = 0
    for (const [, dayItems] of itemsByDate) {
      for (const item of dayItems) {
        if (!item.date) continue
        const d = new Date(item.date)
        if (d.getMonth() === currentMonth.getMonth() && d.getFullYear() === currentMonth.getFullYear()) {
          count++
        }
      }
    }
    return count
  }, [itemsByDate, currentMonth])

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between bg-muted/30 rounded-xl px-4 py-2.5 border border-border/50">
        <Button variant="ghost" size="sm" onClick={() => navigateMonth(-1)} className="gap-1">
          <ChevronLeft className="size-4" />
          <span className="hidden sm:inline">Previous</span>
        </Button>
        <div className="text-center">
          <h2 className="text-base font-semibold tracking-tight">
            {currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </h2>
          {monthEventCount > 0 && (
            <p className="text-[10px] text-muted-foreground/60">
              {monthEventCount} event{monthEventCount !== 1 ? "s" : ""} this month
            </p>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigateMonth(1)} className="gap-1">
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {/* Calendar grid */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${currentMonth.getFullYear()}-${currentMonth.getMonth()}`}
          initial={{ opacity: 0, x: direction > 0 ? 20 : -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direction > 0 ? -20 : 20 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="rounded-xl border border-border/50 overflow-hidden bg-card"
        >
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-border/40">
            {WEEKDAYS.map((wd) => (
              <div
                key={wd}
                className="py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60"
              >
                {wd}
              </div>
            ))}
          </div>

          {/* Day cells */}
          {calendarGrid.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 border-b border-border/20 last:border-0">
              {week.map((cell, ci) => {
                if (!cell.isCurrentMonth) {
                  return <div key={ci} className="min-h-[100px] bg-muted/5 p-2" />
                }

                const dayItems = itemsByDate.get(cell.date) ?? []
                const isToday = cell.date === todayStr
                const isSelected = cell.date === selectedDay
                const hasOverdue = dayItems.some((i) => i.days_to_event !== null && i.days_to_event <= 0)
                const hasUrgent = dayItems.some(
                  (i) => i.days_to_event !== null && i.days_to_event > 0 && i.days_to_event <= 7
                )

                // Get unique item types for dots
                const typeSet = new Set(dayItems.map((i) => i.item_type))
                const urgencyIndicator = hasOverdue ? "overdue" : hasUrgent ? "urgent" : null

                return (
                  <motion.div
                    key={ci}
                    className={`min-h-[100px] p-2 cursor-pointer transition-colors relative ${
                      isSelected
                        ? "bg-primary/[0.04]"
                        : "hover:bg-muted/30"
                    }`}
                    onClick={() => setSelectedDay(cell.date === selectedDay ? null : cell.date)}
                    whileTap={{ scale: 0.98 }}
                  >
                    {/* Day number */}
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className={`inline-flex items-center justify-center size-6.5 rounded-full text-xs font-medium ${
                          isToday
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : hasOverdue
                              ? "text-red-500 font-bold"
                              : "text-foreground/80"
                        }`}
                      >
                        {cell.day}
                      </span>
                      {dayItems.length > 0 && (
                        <span
                          className={`text-[9px] font-bold tabular-nums ${
                            hasOverdue
                              ? "text-red-500"
                              : hasUrgent
                                ? "text-amber-500"
                                : "text-muted-foreground/50"
                          }`}
                        >
                          {dayItems.length}
                        </span>
                      )}
                    </div>

                    {/* Type dots */}
                    {typeSet.size > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {Array.from(typeSet).map((type) => {
                          const tCfg = TYPE_CONFIG[type]
                          return (
                            <div
                              key={type}
                              className={`size-2 rounded-full ${tCfg.dotColor} shrink-0 ring-1 ring-background`}
                              title={`${tCfg.label}: ${dayItems.filter((i) => i.item_type === type).length}`}
                            />
                          )
                        })}
                        {urgencyIndicator === "urgent" && !hasOverdue && (
                          <div
                            className="size-2 rounded-full bg-amber-400 shrink-0 ring-1 ring-background animate-pulse"
                            title="Urgent (≤7 days)"
                          />
                        )}
                      </div>
                    )}

                    {/* Urgent indicator bar at bottom */}
                    {urgencyIndicator && (
                      <div
                        className={`absolute bottom-0 left-1 right-1 h-0.5 rounded-full ${
                          urgencyIndicator === "overdue" ? "bg-red-500" : "bg-amber-400"
                        }`}
                      />
                    )}

                    {/* Selected glow */}
                    {isSelected && (
                      <div className="absolute inset-0 ring-2 ring-primary/30 ring-inset rounded-xl pointer-events-none" />
                    )}
                  </motion.div>
                )
              })}
            </div>
          ))}
        </motion.div>
      </AnimatePresence>

      {/* Day detail dialog */}
      <Dialog
        open={selectedDay !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedDay(null)
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="size-4.5 text-muted-foreground" />
              {selectedDay
                ? new Date(selectedDay + "T00:00:00").toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })
                : ""}
            </DialogTitle>
            {selectedItems.length > 0 && (
              <div className="flex items-center gap-2 mt-1.5">
                {Object.entries(typeCount).map(([type, count]) => {
                  const tCfg = TYPE_CONFIG[type as EntityType]
                  if (!tCfg) return null
                  return (
                    <span
                      key={type}
                      className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground bg-muted/60 rounded-full px-2 py-0.5"
                    >
                      <span className={`size-1.5 rounded-full ${tCfg.dotColor}`} />
                      {count} {tCfg.label}
                    </span>
                  )
                })}
              </div>
            )}
          </DialogHeader>

          <div className="space-y-1.5 mt-1">
            {selectedItems.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground/60 bg-muted/20 rounded-lg">
                <CalendarDays className="size-4 mr-2" />
                No items expiring on this day
              </div>
            ) : (
              selectedItems.map((item, idx) => {
                const tCfg = TYPE_CONFIG[item.item_type]
                const TypeIcon = tCfg.icon
                return (
                  <motion.div
                    key={`${item.item_type}-${item.id}`}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${tCfg.borderColor} ${tCfg.bgColor} cursor-pointer hover:shadow-sm transition-all group`}
                    onClick={() => {
                      router.push(getItemLink(item))
                    }}
                    whileHover={{ x: 2 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className={`relative size-9 rounded-lg ${tCfg.bgColor} flex items-center justify-center shrink-0 ring-1 ${tCfg.ringColor}`}>
                      <TypeIcon className="size-4.5 shrink-0 text-foreground/70" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{item.fqdn}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {item.asset_id && item.asset_name ? (
                          <Link
                            href={`/projects/${item.asset_id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-[10px] text-muted-foreground/70 truncate hover:text-foreground hover:underline underline-offset-2 transition-colors"
                          >
                            {item.asset_name}
                          </Link>
                        ) : item.asset_name ? (
                          <span className="text-[10px] text-muted-foreground/70 truncate">{item.asset_name}</span>
                        ) : null}
                        {item.extra_info && (
                          <>
                            <span className="text-[10px] text-muted-foreground/30">·</span>
                            <span className="text-[10px] text-muted-foreground/50 truncate font-mono">{item.extra_info}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <DaysBadge days={item.days_to_event} />
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="size-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(getItemLink(item))
                      }}
                    >
                      <ExternalLink className="size-3" />
                    </Button>
                  </motion.div>
                )
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Page ──

export default function ExpiryCalendarPage() {
  const { data, isLoading } = useExpiryCalendar()
  const [viewMode, setViewMode] = useState<ViewMode>("list")
  const [selectedTypes, setSelectedTypes] = useState<Set<EntityType>>(
    () => new Set(["domain", "ssl", "contract", "server"] as EntityType[])
  )
  const [dateRange, setDateRange] = useState<number>(180)

  const allItems = useMemo(() => {
    return data?.months.flatMap((m) => m.items) ?? []
  }, [data])

  // ── Client-side filters ──
  const filterCutoff = useMemo(() => {
    const now = new Date()
    return new Date(now.getTime() + dateRange * 24 * 60 * 60 * 1000)
  }, [dateRange])

  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      if (!selectedTypes.has(item.item_type as EntityType)) return false
      if (item.date) {
        const d = new Date(item.date)
        if (d > filterCutoff) return false
      }
      return true
    })
  }, [allItems, selectedTypes, filterCutoff])

  const filteredMonths = useMemo(() => {
    const grouped: Record<string, typeof filteredItems> = {}
    for (const item of filteredItems) {
      if (!item.date) continue
      const d = new Date(item.date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(item)
    }
    return Object.entries(grouped).map(([key, items]) => {
      const firstDate = items[0].date!
      const d = new Date(firstDate)
      return {
        key,
        label: `${MONTH_LABELS[d.getMonth()]} ${d.getFullYear()}`,
        items,
      }
    })
  }, [filteredItems])

  // ── Stats ──
  const stats = useMemo(() => {
    const overdue = filteredItems.filter((i) => i.days_to_event !== null && i.days_to_event <= 0).length
    const urgent = filteredItems.filter(
      (i) => i.days_to_event !== null && i.days_to_event > 0 && i.days_to_event <= 7
    ).length
    return { total: filteredItems.length, overdue, urgent }
  }, [filteredItems])

  const toggleType = (type: EntityType) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }

  const hasActiveFilters = selectedTypes.size < 4 || dateRange < 180
  const clearFilters = () => {
    setSelectedTypes(new Set(["domain", "ssl", "contract", "server"] as EntityType[]))
    setDateRange(180)
  }

  return (
    <div className="container mx-auto max-w-6xl">
      <div className="space-y-5">
        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              {/* <CalendarDays className="size-7 text-primary" /> */}
              Expiry Calendar
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              Track upcoming expirations and renewals across domains, SSL certificates, contracts, and servers
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* View toggle */}
            <div className="flex rounded-xl border border-border/60 overflow-hidden bg-muted/30 p-0.5 shadow-xs">
              <button
                onClick={() => setViewMode("list")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs font-medium transition-all ${
                  viewMode === "list"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <List className="size-3.5" />
                <span>List</span>
              </button>
              <button
                onClick={() => setViewMode("calendar")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs font-medium transition-all ${
                  viewMode === "calendar"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <CalendarDays className="size-3.5" />
                <span>Calendar</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Stats Bar ── */}
        {!isLoading && data && filteredItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-wrap items-center gap-2.5"
          >
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/50 border border-border/50 text-xs font-medium">
              <Layers className="size-3.5 text-muted-foreground" />
              <span className="text-muted-foreground/80">Total</span>
              <span className="font-bold tabular-nums">{stats.total}</span>
            </div>

            {stats.overdue > 0 && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs font-medium">
                <AlertTriangle className="size-3.5 text-red-500" />
                <span className="text-red-600 dark:text-red-400 font-bold tabular-nums">{stats.overdue}</span>
                <span className="text-red-600/70 dark:text-red-400/70">overdue</span>
              </div>
            )}

            {stats.urgent > 0 && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs font-medium">
                <Clock className="size-3.5 text-amber-500" />
                <span className="text-amber-600 dark:text-amber-400 font-bold tabular-nums">{stats.urgent}</span>
                <span className="text-amber-600/70 dark:text-amber-400/70">urgent</span>
              </div>
            )}
          </motion.div>
        )}

        {/* ── Filter Bar ── */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Entity type toggles */}
          <div className="flex items-center gap-1 p-1 rounded-lg border border-border/50 bg-muted/30 shadow-xs">
            <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider px-1.5">
              Type
            </span>
            {(Object.entries(TYPE_CONFIG) as [EntityType, typeof TYPE_CONFIG[EntityType]][]).map(
              ([key, cfg]) => {
                const Icon = cfg.icon
                const isActive = selectedTypes.has(key)
                return (
                  <motion.button
                    key={key}
                    onClick={() => toggleType(key)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                      isActive
                        ? `${cfg.bgColor} ring-1 ${cfg.ringColor} text-foreground`
                        : "text-muted-foreground/40 hover:text-muted-foreground"
                    }`}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Icon className="size-3.5" />
                    <span className={isActive ? "font-medium" : ""}>{cfg.label}</span>
                  </motion.button>
                )
              }
            )}
          </div>

          {/* Divider */}
          <div className="w-px h-7 bg-border/40 hidden sm:block" />

          {/* Date range */}
          <div className="flex items-center gap-1 p-1 rounded-lg border border-border/50 bg-muted/30 shadow-xs">
            <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider px-1.5">
              Period
            </span>
            {DATE_RANGE_OPTIONS.map((opt) => (
              <motion.button
                key={opt.value}
                onClick={() => setDateRange(opt.value)}
                className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                  dateRange === opt.value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground/40 hover:text-muted-foreground"
                }`}
                whileTap={{ scale: 0.95 }}
              >
                {opt.label}
              </motion.button>
            ))}
          </div>

          {/* Active filter indicator + clear */}
          {hasActiveFilters && (
            <>
              <div className="w-px h-7 bg-border/40 hidden sm:block" />
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2"
              >
                <Button
                  variant="ghost"
                  size="xs"
                  className="gap-1 text-muted-foreground hover:text-destructive"
                  onClick={clearFilters}
                >
                  <X className="size-3" />
                  Clear
                </Button>
                <span className="text-[10px] text-muted-foreground/50 tabular-nums">
                  {filteredItems.length} of {allItems.length}
                </span>
              </motion.div>
            </>
          )}
        </div>

        {/* ── Loading state ── */}
        {isLoading && (
          <div className="space-y-6">
            {/* Stats skeleton */}
            <div className="flex gap-2.5">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-24 rounded-lg" />
              ))}
            </div>
            {/* Cards skeleton */}
            <div className="space-y-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-6 w-48" />
                  {Array.from({ length: 2 }).map((_, j) => (
                    <Skeleton key={j} className="h-[68px] w-full rounded-xl" />
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Empty state ── */}
        {!isLoading && filteredItems.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="size-20 rounded-2xl bg-gradient-to-br from-muted/50 to-muted/10 flex items-center justify-center mb-5 ring-1 ring-border/40 shadow-sm">
              {hasActiveFilters ? (
                <Filter className="size-9 text-muted-foreground/40" />
              ) : (
                <CalendarDays className="size-9 text-muted-foreground/40" />
              )}
            </div>
            <h3 className="text-xl font-semibold tracking-tight">
              {hasActiveFilters ? "No items match your filters" : "All clear!"}
            </h3>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-sm">
              {hasActiveFilters
                ? "Try adjusting the entity type or date range filters above to see more items."
                : "No upcoming expirations in the next 6 months. Everything looks healthy."}
            </p>
            {hasActiveFilters && (
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-6 gap-1.5 rounded-lg"
                  onClick={clearFilters}
                >
                  <X className="size-3.5" />
                  Clear all filters
                </Button>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ── List View ── */}
        <AnimatePresence mode="wait">
          {viewMode === "list" && !isLoading && (
            <motion.div
              key="list-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-2"
            >
              {filteredMonths.map((month) => {
                const expiredCount = month.items.filter(
                  (i) => i.days_to_event !== null && i.days_to_event <= 0
                ).length
                const urgentCount = month.items.filter(
                  (i) => i.days_to_event !== null && i.days_to_event > 0 && i.days_to_event <= 7
                ).length

                return (
                  <div key={month.key} className="mb-6 last:mb-0">
                    {/* Month header */}
                    <div className="flex items-center gap-3 mb-3 px-0.5">
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-semibold tracking-tight">{month.label}</h2>
                        <span className="text-[11px] font-medium text-muted-foreground/50 bg-muted/50 rounded-full px-2 py-0.5 tabular-nums">
                          {month.items.length}
                        </span>
                      </div>
                      <div className="flex-1 h-px bg-gradient-to-r from-border/60 to-transparent" />
                      {expiredCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-500 bg-red-500/10 rounded-full px-2 py-0.5">
                          <AlertTriangle className="size-3" />
                          {expiredCount} overdue
                        </span>
                      )}
                      {urgentCount > 0 && !expiredCount && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-500 bg-amber-500/10 rounded-full px-2 py-0.5">
                          <Clock className="size-3" />
                          {urgentCount} urgent
                        </span>
                      )}
                    </div>
                    <div className="space-y-2">
                      {month.items.map((item, idx) => (
                        <CalendarItemCard
                          key={`${item.item_type}-${item.id}`}
                          item={item}
                          index={idx}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Calendar View ── */}
        <AnimatePresence mode="wait">
          {viewMode === "calendar" && !isLoading && data && filteredItems.length > 0 && (
            <motion.div
              key="calendar-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <CalendarGridView items={filteredItems} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
