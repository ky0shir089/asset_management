"use client"

import { Eye, EyeOff } from "lucide-react"
import * as React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

function PasswordInput({
  className,
  disabled,
  ...props
}: React.ComponentProps<typeof Input>) {
  const [isVisible, setIsVisible] = React.useState(false)
  const Icon = isVisible ? EyeOff : Eye

  return (
    <div className="relative">
      <Input
        type={isVisible ? "text" : "password"}
        disabled={disabled}
        className={cn("pr-9", className)}
        {...props}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        disabled={disabled}
        aria-label={isVisible ? "Hide password" : "Show password"}
        onClick={() => setIsVisible((value) => !value)}
      >
        <Icon className="size-4" aria-hidden="true" />
      </Button>
    </div>
  )
}

export { PasswordInput }
