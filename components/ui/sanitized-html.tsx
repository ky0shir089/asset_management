import { sanitizeRichText } from "@/lib/sanitize-html"
import { cn } from "@/lib/utils"

export function SanitizedHtml({
  html,
  className,
}: {
  html: string
  className?: string
}) {
  return (
    <div
      className={cn(
        "text-sm leading-relaxed text-foreground [&_blockquote]:border-s [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_blockquote]:italic [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_em]:italic [&_li]:my-0.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p:not(:last-child)]:mb-2 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-5",
        className
      )}
      dangerouslySetInnerHTML={{ __html: sanitizeRichText(html) }}
    />
  )
}
