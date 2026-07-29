"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ChevronLeft, ChevronRight } from "lucide-react"
import Image from "next/image"
import { useState } from "react"

type Photo = {
  id: string
  name: string
  path: string
}

export default function AssetLeasePhotoCarousel({
  photos,
}: {
  photos: Photo[]
}) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  if (!photos.length) {
    return <span className="text-muted-foreground">-</span>
  }

  const safeIndex = activeIndex % photos.length
  const activePhoto = photos[safeIndex]
  const previous = () =>
    setActiveIndex((safeIndex - 1 + photos.length) % photos.length)
  const next = () => setActiveIndex((safeIndex + 1) % photos.length)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div className="flex min-w-36 flex-wrap gap-2">
        {photos.map((photo, index) => (
          <DialogTrigger
            key={photo.id}
            render={
              <button
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={`Preview ${photo.name}`}
                className="block cursor-pointer rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
              />
            }
          >
            <Image
              src={photo.path}
              alt=""
              width={56}
              height={56}
              className="size-14 rounded-md border object-cover"
            />
          </DialogTrigger>
        ))}
      </div>

      <DialogContent
        className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-4xl gap-3 overflow-y-auto"
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") {
            event.preventDefault()
            previous()
          } else if (event.key === "ArrowRight") {
            event.preventDefault()
            next()
          }
        }}
      >
        <DialogTitle className="pr-10">{activePhoto.name}</DialogTitle>
        <div className="relative h-[70vh] min-h-64 w-full">
          <Image
            src={activePhoto.path}
            alt={activePhoto.name}
            fill
            sizes="(max-width: 640px) calc(100vw - 2rem), 896px"
            className="object-contain"
          />
        </div>
        <div className="flex items-center justify-center gap-3">
          {photos.length > 1 && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={previous}
              aria-label="Previous photo"
            >
              <ChevronLeft />
            </Button>
          )}
          <span
            className="min-w-16 text-center text-sm text-muted-foreground"
            aria-live="polite"
            aria-atomic="true"
          >
            <span className="sr-only">{activePhoto.name}, photo </span>
            {safeIndex + 1} / {photos.length}
          </span>
          {photos.length > 1 && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={next}
              aria-label="Next photo"
            >
              <ChevronRight />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
