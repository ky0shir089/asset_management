import { cn } from "@/lib/utils"

const statusClasses: Record<string, string> = {
  NEW: "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200",
  APPROVED:
    "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  REJECTED:
    "border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-200",
}

export default function AssetLeaseStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        statusClasses[status] ?? "border-border bg-muted text-muted-foreground"
      )}
    >
      {status}
    </span>
  )
}
