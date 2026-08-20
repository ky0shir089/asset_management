"use client"

import { useState } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

type Photo = { id: string; path: string; name: string }

/**
 * Shared photo carousel in a modal dialog.
 * Click any thumbnail to open fullscreen viewer with prev/next navigation.
 *
 * @param layout - "grid" renders a multi-column grid of thumbnails (default),
 *                 "inline" renders a compact horizontal row of small thumbnails.
 */
export function PhotoCarousel({
  photos,
  label,
  layout = "grid",
}: {
  photos: Photo[]
  label?: string
  layout?: "grid" | "inline"
}) {
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(0)

  if (!photos.length) {
    return <span className="text-muted-foreground">-</span>
  }

  const safe = index % photos.length
  const current = photos[safe]
  const go = (dir: 1 | -1) =>
    setIndex((safe + dir + photos.length) % photos.length)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* Thumbnails */}
      <div
        className={cn(
          layout === "grid"
            ? "grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
            : "flex flex-wrap gap-2 min-w-36"
        )}
      >
        {photos.map((photo, i) => (
          <DialogTrigger
            key={photo.id}
            render={
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={
                  label
                    ? `Preview ${label}, photo ${i + 1} of ${photos.length}`
                    : `Preview ${photo.name}`
                }
                className={cn(
                  "cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
                  layout === "grid"
                    ? "group block text-left"
                    : "block rounded-md"
                )}
              />
            }
          >
            {layout === "grid" ? (
              <>
                <div className="relative h-40 w-full overflow-hidden rounded-lg border transition-all group-hover:ring-2 group-hover:ring-primary group-hover:shadow-md">
                  <Image
                    src={photo.path}
                    alt={photo.name}
                    fill
                    sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                    className="object-contain transition-transform duration-200 group-hover:scale-105"
                  />
                </div>
                <p className="mt-1.5 truncate text-xs text-muted-foreground">
                  {photo.name}
                </p>
              </>
            ) : (
              <Image
                src={photo.path}
                alt=""
                width={56}
                height={56}
                sizes="56px"
                className="object-cover border rounded-md size-14"
              />
            )}
          </DialogTrigger>
        ))}
      </div>

      {/* Modal viewer */}
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] w-fit max-w-[calc(100%-2rem)] gap-3 overflow-y-auto sm:max-w-[calc(100%-2rem)]"
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") {
            e.preventDefault()
            go(-1)
          } else if (e.key === "ArrowRight") {
            e.preventDefault()
            go(1)
          }
        }}
      >
        <DialogTitle className="pr-10">
          {label
            ? `${label}, photo ${safe + 1} of ${photos.length}`
            : current.name}
        </DialogTitle>

        {/* Main image */}
        <Image
          key={current.id}
          src={current.path}
          alt={
            label
              ? `${label}, photo ${safe + 1} of ${photos.length}`
              : current.name
          }
          width={1200}
          height={800}
          sizes="(min-width: 640px) calc(100vw - 4rem), 100vw"
          className="max-h-[60vh] w-auto max-w-[calc(100vw-4rem)] object-contain"
        />

        {/* Nav + counter */}
        <div className="flex items-center justify-center gap-3">
          {photos.length > 1 && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => go(-1)}
              aria-label="Previous photo"
            >
              <ChevronLeft />
            </Button>
          )}
          <span
            className="text-sm text-center min-w-16 text-muted-foreground tabular-nums"
            aria-live="polite"
            aria-atomic="true"
          >
            <span className="sr-only">{current.name}, photo </span>
            {safe + 1} / {photos.length}
          </span>
          {photos.length > 1 && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => go(1)}
              aria-label="Next photo"
            >
              <ChevronRight />
            </Button>
          )}
        </div>

        {/* Thumbnail strip */}
        {photos.length > 1 && (
          <div className="flex items-center justify-center gap-2 overflow-x-auto">
            {photos.map((photo, i) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => setIndex(i)}
                className={cn(
                  "relative size-10 flex-shrink-0 overflow-hidden rounded-md border-2 transition-all",
                  i === safe
                    ? "border-primary opacity-100 ring-1 ring-primary/50"
                    : "border-transparent opacity-50 hover:opacity-80"
                )}
                aria-label={`View ${photo.name}`}
              >
                <Image
                  src={photo.path}
                  alt=""
                  fill
                  sizes="40px"
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
