import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"

export function BackButton({
  href,
  className,
}: {
  href: string
  className?: string
}) {
  return (
    <Link
      href={href}
      className={cn(
        buttonVariants({ variant: "outline", size: "sm" }),
        className
      )}
    >
      <ArrowLeft data-icon="inline-start" />
      Kembali
    </Link>
  )
}
