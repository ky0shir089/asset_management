"use client"

import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { FileText } from "lucide-react"

export interface PhotoGroup {
  files: File[]
  oversizedFileNames: string[]
}

interface AssetItemFieldsSectionProps {
  selectedPoDetailId: string
  photoGroups: PhotoGroup[]
  serialNumbers: string[]
  maxPhotoFileSizeMb: number
  hasSelectedPoDetail: boolean
  onSerialNumberChange: (index: number, value: string) => void
  onFileChange: (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => void
}

export function AssetItemFieldsSection({
  selectedPoDetailId,
  photoGroups,
  serialNumbers,
  maxPhotoFileSizeMb,
  hasSelectedPoDetail,
  onSerialNumberChange,
  onFileChange,
}: AssetItemFieldsSectionProps) {
  return (
    <div className="rounded-lg border p-4">
      <h3 className="mb-4 font-semibold">Photos & Details</h3>
      {hasSelectedPoDetail ? (
        <div className="grid gap-4">
          {photoGroups.map((group, groupIndex) => (
            <div
              key={`${selectedPoDetailId}-${groupIndex}`}
              className="rounded-md border p-3 flex flex-col gap-4"
            >
              <h4 className="font-medium text-sm text-muted-foreground">
                Asset {groupIndex + 1}
              </h4>

              <Field>
                <FieldLabel htmlFor={`serialNumber-${groupIndex}`}>
                  Serial Number
                </FieldLabel>
                <Input
                  id={`serialNumber-${groupIndex}`}
                  name={`serialNumber-${groupIndex}`}
                  type="text"
                  placeholder="Enter serial number (optional)"
                  value={serialNumbers[groupIndex] ?? ""}
                  onChange={(e) =>
                    onSerialNumberChange(groupIndex, e.target.value)
                  }
                />
              </Field>

              <Field>
                <FieldLabel htmlFor={`photos-${groupIndex}`}>
                  Asset {groupIndex + 1} Photos (optional)
                </FieldLabel>
                <Input
                  id={`photos-${groupIndex}`}
                  name={`photos-${groupIndex}`}
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(e) => onFileChange(groupIndex, e)}
                />
                <FieldDescription>
                  Upload photos or PDFs, or leave empty. Assets without uploads
                  are marked No photos. Max {maxPhotoFileSizeMb} MB per file.
                </FieldDescription>
                {group.oversizedFileNames.length > 0 && (
                  <FieldError>
                    Files over {maxPhotoFileSizeMb} MB:{" "}
                    {group.oversizedFileNames.join(", ")}
                  </FieldError>
                )}
              </Field>

              {group.files.length > 0 && (
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                  {group.files.map((file, fileIndex) => {
                    const isPdf =
                      file.type === "application/pdf" ||
                      file.name.toLowerCase().endsWith(".pdf")
                    return (
                      <div
                        key={`${file.name}-${fileIndex}`}
                        className="group relative"
                      >
                        {isPdf ? (
                          <div className="flex h-24 w-full flex-col items-center justify-center rounded border bg-muted/40 p-2 text-center">
                            <FileText className="size-8 text-muted-foreground" />
                            <span className="mt-1 text-xs text-muted-foreground">
                              PDF
                            </span>
                          </div>
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={URL.createObjectURL(file)}
                            alt={file.name}
                            className="h-24 w-full rounded border object-cover"
                          />
                        )}
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {file.name}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Select a PO line before uploading asset photos.
        </p>
      )}
    </div>
  )
}
