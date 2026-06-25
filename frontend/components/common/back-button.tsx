"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"

interface BackButtonProps {
  label?: string
  fallbackHref?: string
  variant?: "ghost" | "outline"
  size?: "sm" | "default" | "lg"
  className?: string
}

export function BackButton({
  label = "Back",
  fallbackHref,
  variant = "ghost",
  size = "sm",
  className,
}: BackButtonProps) {
  const router = useRouter()

  const handleClick = () => {
    if (window.history.length > 1) {
      router.back()
    } else if (fallbackHref) {
      router.push(fallbackHref)
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={cn(
        variant === "ghost" && "text-muted-foreground",
        variant === "ghost" && size === "sm" && "-ml-2",
        className
      )}
      onClick={handleClick}
    >
      <ArrowLeft className={cn(size === "sm" ? "size-4 mr-1" : "size-4 mr-2")} />
      {/* {label} */}
      Go Back
    </Button>
  )
}
