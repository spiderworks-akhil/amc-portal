'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/r-select'

export interface SelectOption {
  value: string
  label: string
}

interface SmoothSelectProps {
  options: SelectOption[]
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
  className?: string
}

export function SmoothSelect({
  options,
  placeholder = 'Select an option...',
  value,
  onChange,
  className,
}: SmoothSelectProps) {
  
  return (
    <Select
      value={value}
      onValueChange={onChange}
    >
      <SelectTrigger className={`w-full capitalize ${className}`}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>

      <SelectContent className='capitalize'>
        {options.map((option) => {
          console.log(option)
          return <SelectItem   className="text-black dark:text-white capitalize p-2 cursor-pointer" key={option.value} value={option.value}>{option.label}</SelectItem>
        })}
      </SelectContent>
    </Select>
  )
}