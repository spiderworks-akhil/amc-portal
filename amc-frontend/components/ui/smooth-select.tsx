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
  const selectedOption = options.find((opt) => opt.value === value)
  console.log("options" ,options);
  
  return (
    <Select
      value={value}
      onValueChange={onChange}
    >
      <SelectTrigger className={`w-full  ${className}`}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>

      <SelectContent className=''>
        {options.map((option) => {
          console.log(option)
          return <SelectItem   className="text-black dark:text-white" key={option.value} value={option.value}>{option.label}</SelectItem>
        })}
      </SelectContent>
    </Select>
  )
}