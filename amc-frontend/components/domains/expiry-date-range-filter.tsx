"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/calendar"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { CalendarIcon, X } from "lucide-react"
import type { DateRange } from "react-day-picker"

interface ExpiryDateRangeFilterProps {
  from?: string
  to?: string
  onChange: (range: { from?: string; to?: string }) => void
  className?: string
}

export function ExpiryDateRangeFilter({
  from,
  to,
  onChange,
  className,
}: ExpiryDateRangeFilterProps) {
  const [open, setOpen] = useState(false)

  const dateRange: DateRange | undefined = {
    from: from ? new Date(from) : undefined,
    to: to ? new Date(to) : undefined,
  }

  const handleSelect = (range: DateRange | undefined) => {
    if (range?.from && range?.to) {
      onChange({
        from: format(range.from, "yyyy-MM-dd"),
        to: format(range.to, "yyyy-MM-dd"),
      })
    } else if (range?.from) {
      onChange({
        from: format(range.from, "yyyy-MM-dd"),
        to: undefined,
      })
    } else {
      onChange({ from: undefined, to: undefined })
    }
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange({ from: undefined, to: undefined })
  }

  const hasFilter = from || to

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "h-9 justify-start gap-2 text-xs font-normal",
              !hasFilter && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="size-3.5 shrink-0" />
            {hasFilter ? (
              from && to ? (
                <span>
                  {format(new Date(from), "MMM d, y")} – {format(new Date(to), "MMM d, y")}
                </span>
              ) : from ? (
                <span>From {format(new Date(from), "MMM d, y")}</span>
              ) : (
                <span>Until {format(new Date(to!), "MMM d, y")}</span>
              )
            ) : (
              <span>Expiry Date Range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            autoFocus
            mode="range"
            defaultMonth={dateRange.from}
            selected={dateRange}
            onSelect={handleSelect}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>

      {hasFilter && (
        <Button
          variant="ghost"
          size="icon-xs"
          className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={handleClear}
        >
          <X className="size-3.5" />
        </Button>
      )}
    </div>
  )
}
