import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export function BackButton({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className={buttonVariants({ variant: "outline", size: "sm" })}
    >
      <ArrowLeft data-icon="inline-start" />
      Kembali
    </Link>
  )
}
