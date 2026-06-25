"use client"

import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Calendar } from "@/components/calendar"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import * as React from "react"

interface DatePickerProps {
  value?: Date | null
  onChange?: (date: Date) => void
  placeholder?: string
}

export default function DatePicker({ value, onChange, placeholder = "Pick a date" }: DatePickerProps) {
  const [internalDate, setInternalDate] = React.useState<Date | undefined>(() => value ?? undefined)

  React.useEffect(() => {
    if (value !== undefined) {
      setInternalDate(value ?? undefined)
    }
  }, [value])

  const displayDate = value === undefined ? internalDate : value

  const handleSelect = (date: Date | undefined) => {
    if (!date) return
    setInternalDate(date)
    onChange?.(date)
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !displayDate && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {displayDate ? format(displayDate, "PPP") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={displayDate ?? undefined}
          onSelect={handleSelect}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  )
}
