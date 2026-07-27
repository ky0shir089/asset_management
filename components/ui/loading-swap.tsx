import { LoaderCircle } from "lucide-react"

import { cn } from "@/lib/utils"

function LoadingSwap({
  isLoading,
  children,
  className,
}: {
  isLoading: boolean
  children: React.ReactNode
  className?: string
}) {
  return (
    <span className={cn("inline-flex items-center justify-center gap-1.5", className)}>
      {isLoading && (
        <LoaderCircle
          className="size-4 animate-spin"
          aria-hidden="true"
          data-slot="loading-swap-icon"
        />
      )}
      <span>{children}</span>
    </span>
  )
}

export { LoadingSwap }
