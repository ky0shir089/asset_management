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
  label,
}: {
  photos: Photo[]
  label?: string
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
      <div className="flex flex-wrap gap-2 min-w-36">
        {photos.map((photo, index) => (
          <DialogTrigger
            key={photo.id}
            render={
              <button
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={
                  label
                    ? `Preview ${label}, photo ${index + 1} of ${photos.length}`
                    : `Preview ${photo.name}`
                }
                className="block rounded-md cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
              />
            }
          >
            <Image
              src={photo.path}
              alt=""
              width={56}
              height={56}
              sizes="56px"
              className="object-cover border rounded-md size-14"
            />
          </DialogTrigger>
        ))}
      </div>

      <DialogContent
        className="max-h-[calc(100dvh-2rem)] w-fit max-w-[calc(100%-2rem)] gap-3 overflow-y-auto sm:max-w-[calc(100%-2rem)]"
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
        <DialogTitle className="pr-10">
          {label
            ? `${label}, photo ${safeIndex + 1} of ${photos.length}`
            : activePhoto.name}
        </DialogTitle>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={activePhoto.path}
          alt={
            label
              ? `${label}, photo ${safeIndex + 1} of ${photos.length}`
              : activePhoto.name
          }
          className="max-h-[70vh] max-w-[calc(100vw-4rem)] object-contain"
        />
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
            className="text-sm text-center min-w-16 text-muted-foreground"
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
