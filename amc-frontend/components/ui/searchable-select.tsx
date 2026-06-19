"use client"

import * as React from "react"
import { CheckIcon, ChevronDownIcon, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"


export interface SearchableSelectOption {
  value: string
  label: string
}

interface SearchableSelectProps {
  options: SearchableSelectOption[]
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  className?: string
  disabled?: boolean
  clearable?: boolean
  id?: string
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select an option...",
  searchPlaceholder = "Search...",
  emptyText = "No results found.",
  className,
  disabled = false,
  clearable = false,
  id,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const listRef = React.useRef<HTMLDivElement>(null)
  const selectedOption = options.find((option) => option.value === value)

  // Auto-focus search input when popover opens
  React.useEffect(() => {
    if (open) {
      setSearch("")
      // Small delay to ensure the popover is mounted, then find the input via DOM
      const timer = setTimeout(() => {
        const popover = document.querySelector("[data-slot='popover-content']")
        const input = popover?.querySelector("input") as HTMLInputElement | null
        input?.focus()
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [open])

  // Filter options based on search
  const filteredOptions = React.useMemo(() => {
    if (!search) return options
    const query = search.toLowerCase()
    return options.filter((option) =>
      option.label.toLowerCase().includes(query)
    )
  }, [options, search])

  const handleSelect = (selectedValue: string) => {
    // If clicking the already selected option, clear it (only if clearable)
    if (selectedValue === value && clearable) {
      onChange?.("")
    } else {
      onChange?.(selectedValue)
    }
    setOpen(false)
    setSearch("")
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange?.("")
  }

  return (
    <Popover open={open} onOpenChange={setOpen} >
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          id={id}
          aria-expanded={open}
          aria-haspopup="listbox"
          disabled={disabled}
          className={cn(
            "flex h-10 w-full items-center gap-2 rounded-lg border border-input px-3 text-sm transition-colors",
            "hover:border-ring/40",
            "focus:border-ring focus:ring-1 focus:ring-ring/25 focus:outline-none",
            "disabled:cursor-not-allowed disabled:opacity-50",
            !selectedOption && "text-muted-foreground",
            className
          )}
        >
          <span className="min-w-0 flex-1 truncate text-left">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {clearable && selectedOption && (
            <button
              type="button"
              onClick={handleClear}
              className="flex size-5 shrink-0 items-center justify-center rounded-md text-muted-foreground bg-none transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Clear selection"
            >
              <XIcon className="size-3.5" />
            </button>
          )}
          <ChevronDownIcon className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180"
          )} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] border border-input p-0 shadow-md overflow-hidden"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="border-b border-input px-3 py-2">
          <div className="flex items-center gap-2">
            <CheckIcon className="size-4 shrink-0 opacity-50" />
            <input
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>
        <div
          ref={listRef}
          className="max-h-64 overflow-y-auto overflow-x-hidden p-1"
          onWheel={(e) => {
            const el = listRef.current
            if (!el) return
            e.preventDefault()
            el.scrollTop += e.deltaY
          }}
        >
          {filteredOptions.length === 0 ? (
            <div className="py-3 text-center text-sm text-muted-foreground">{emptyText}</div>
          ) : (
            filteredOptions.map((option) => (
              <div
                key={option.value}
                onClick={() => handleSelect(option.value)}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                  value === option.value && "bg-accent text-accent-foreground"
                )}
              >
              <CheckIcon
                className={cn(
                  "size-4 shrink-0",
                  value === option.value ? "opacity-100" : "opacity-0"
                )}
              />
              <span className="truncate">{option.label}</span>
            </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
