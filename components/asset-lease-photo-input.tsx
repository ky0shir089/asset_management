"use client"

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import {
  MAX_PHOTO_FILE_COUNT,
  MAX_PHOTO_FILE_SIZE_BYTES,
  MAX_PHOTO_FILE_SIZE_MB,
} from "@/lib/upload-constants"
import { ImagePlus, X } from "lucide-react"
import Image from "next/image"
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type Ref,
} from "react"
import { toast } from "sonner"

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"]

export default function AssetLeasePhotoInput({
  files,
  onChange,
  id,
  describedBy,
  disabled = false,
  dropzoneRef,
}: {
  files: File[]
  onChange: (files: File[]) => void
  id: string
  describedBy: string
  disabled?: boolean
  dropzoneRef?: Ref<HTMLDivElement>
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [lightbox, setLightbox] = useState<{ url: string; name: string } | null>(
    null
  )
  const previews = useMemo(
    () =>
      files.map((file) => ({
        name: file.name,
        url: URL.createObjectURL(file),
      })),
    [files]
  )

  useEffect(
    () => () => previews.forEach((preview) => URL.revokeObjectURL(preview.url)),
    [previews]
  )

  const mergeFiles = useCallback(
    (incoming: FileList | File[]) => {
      const availableSlots = MAX_PHOTO_FILE_COUNT - files.length
      if (availableSlots <= 0) {
        toast.error(`Upload at most ${MAX_PHOTO_FILE_COUNT} photos`)
        return
      }

      const accepted: File[] = []
      const rejectedTypes: string[] = []
      const rejectedSizes: string[] = []
      for (const file of Array.from(incoming)) {
        if (!ACCEPTED_TYPES.includes(file.type)) rejectedTypes.push(file.name)
        else if (file.size > MAX_PHOTO_FILE_SIZE_BYTES)
          rejectedSizes.push(file.name)
        else accepted.push(file)
      }

      if (accepted.length > availableSlots)
        toast.error(`Upload at most ${MAX_PHOTO_FILE_COUNT} photos`)
      if (rejectedTypes.length)
        toast.error(
          `${rejectedTypes.join(", ")} must be JPEG, PNG, or WebP files`
        )
      if (rejectedSizes.length)
        toast.error(
          `${rejectedSizes.join(", ")} exceeds ${MAX_PHOTO_FILE_SIZE_MB} MB limit`
        )
      if (accepted.length)
        onChange([...files, ...accepted.slice(0, availableSlots)])
    },
    [files, onChange]
  )

  function openPicker() {
    if (!disabled) inputRef.current?.click()
  }

  return (
    <div className="space-y-2">
      <div
        ref={dropzoneRef}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        aria-describedby={describedBy}
        onDragOver={(event) => {
          event.preventDefault()
          event.stopPropagation()
        }}
        onDragEnter={(event) => {
          event.preventDefault()
          event.stopPropagation()
          if (!disabled) setDragging(true)
        }}
        onDragLeave={(event) => {
          event.preventDefault()
          event.stopPropagation()
          setDragging(false)
        }}
        onDrop={(event: DragEvent) => {
          event.preventDefault()
          event.stopPropagation()
          setDragging(false)
          if (!disabled && event.dataTransfer.files.length)
            mergeFiles(event.dataTransfer.files)
        }}
        onClick={openPicker}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault()
            openPicker()
          }
        }}
        className={`flex flex-col items-center justify-center rounded-md border-2 border-dashed px-4 py-6 text-sm transition-colors ${
          disabled
            ? "cursor-not-allowed opacity-60"
            : dragging
              ? "cursor-pointer border-primary bg-primary/5 text-primary"
              : "cursor-pointer border-muted-foreground/25 text-muted-foreground hover:border-primary/50"
        }`}
      >
        <ImagePlus className="mb-1 size-6" />
        <span>Drop photos here or click to browse</span>
        <span className="text-xs">JPG, PNG, WebP</span>
        <input
          ref={inputRef}
          id={id}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          disabled={disabled}
          onChange={(event) => {
            if (event.target.files?.length) mergeFiles(event.target.files)
            event.target.value = ""
          }}
        />
      </div>

      {previews.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {previews.map((preview, index) => (
            <div key={`${preview.name}-${index}`} className="group relative">
              <button
                type="button"
                onClick={() => setLightbox(preview)}
                disabled={disabled}
                className="cursor-pointer disabled:cursor-not-allowed"
                aria-label={`Preview ${preview.name}`}
              >
                <Image
                  src={preview.url}
                  alt={preview.name}
                  width={0}
                  height={0}
                  unoptimized
                  className="size-28 rounded-md border object-cover"
                />
              </button>
              <button
                type="button"
                onClick={() => onChange(files.filter((_, i) => i !== index))}
                disabled={disabled}
                className="absolute -top-1.5 -right-1.5 flex size-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                aria-label={`Remove ${preview.name}`}
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={!!lightbox}
        onOpenChange={(open) => {
          if (!open) setLightbox(null)
        }}
      >
        <DialogContent className="sm:max-w-lg" showCloseButton>
          <DialogTitle className="sr-only">
            {lightbox?.name ?? "Photo preview"}
          </DialogTitle>
          {lightbox && (
            <Image
              src={lightbox.url}
              alt={lightbox.name}
              width={0}
              height={0}
              unoptimized
              className="h-auto w-full rounded-md object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
