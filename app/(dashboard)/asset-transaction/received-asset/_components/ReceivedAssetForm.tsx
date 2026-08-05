"use client"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { LoadingSwap } from "@/components/ui/loading-swap"
import { SearchableSelect } from "@/components/ui/searchable-select"
import type {
  outletOptionType,
  purchaseOrderDetailOptionForReceiveType,
} from "@/data/select"
import { useRouter } from "next/navigation"
import { useMemo, useState, useTransition } from "react"
import { toast } from "sonner"
import { receivedAssetStore } from "../action"

const MAX_PHOTO_FILE_SIZE_MB = 1
const MAX_PHOTO_FILE_SIZE_BYTES = MAX_PHOTO_FILE_SIZE_MB * 1024 * 1024

interface PhotoGroup {
  files: File[]
  oversizedFileNames: string[]
}

function createEmptyPhotoGroups(count: number): PhotoGroup[] {
  return Array.from({ length: count }, () => ({
    files: [],
    oversizedFileNames: [],
  }))
}

interface ReceivedAssetFormProps {
  poDetails: purchaseOrderDetailOptionForReceiveType[]
  outlets: outletOptionType[]
}

function SummaryItem({
  label,
  value,
}: {
  label: string
  value: string | number
}) {
  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  )
}

export default function ReceivedAssetForm({
  poDetails,
  outlets,
}: ReceivedAssetFormProps) {
  console.log({ poDetails, outlets })
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const [selectedPoId, setSelectedPoId] = useState("")
  const [selectedPoDetailId, setSelectedPoDetailId] = useState("")
  const [selectedOutletId, setSelectedOutletId] = useState("")
  const [condition, setCondition] = useState("BARU dan BAIK")
  const [receivedQuantity, setReceivedQuantity] = useState(1)
  const [photoGroups, setPhotoGroups] = useState<PhotoGroup[]>(
    createEmptyPhotoGroups(1)
  )

  const purchaseOrderItems = useMemo(() => {
    const purchaseOrders = new Map<string, { label: string; value: string }>()

    for (const detail of poDetails) {
      if (!purchaseOrders.has(detail.poId)) {
        purchaseOrders.set(detail.poId, {
          label: detail.poNo,
          value: detail.poId,
        })
      }
    }

    return [...purchaseOrders.values()]
  }, [poDetails])

  const filteredPoDetails = useMemo(
    () => poDetails.filter((detail) => detail.poId === selectedPoId),
    [poDetails, selectedPoId]
  )

  // Reset outlet when PO detail changes (company may differ)
  const selectedPoDetail = poDetails.find((d) => d.id === selectedPoDetailId)

  // Filter outlets to selected PO detail company
  const filteredOutlets = useMemo(
    () =>
      selectedPoDetail
        ? outlets.filter(
            (o) => o.branch.company.id === selectedPoDetail.company.id
          )
        : [],
    [selectedPoDetail, outlets]
  )

  const selectedOutletIsValid = selectedOutletId
    ? filteredOutlets.some((o) => o.id === selectedOutletId)
    : false

  const poDetailItems = filteredPoDetails.map((d) => ({
    label: d.assetCode?.name ?? "No asset name",
    value: d.id,
  }))

  const outletItems = filteredOutlets.map((o) => ({
    label: `${o.name} (${o.outletId})`,
    value: o.id,
  }))

  const conditionItems = [
    { label: "BARU dan BAIK", value: "BARU dan BAIK" },
    { label: "BARU dan RUSAK", value: "BARU dan RUSAK" },
    { label: "BEKAS dan BAIK", value: "BEKAS dan BAIK" },
    { label: "BEKAS dan RUSAK", value: "BEKAS dan RUSAK" },
  ]

  const selectedSpecifications = selectedPoDetail?.specifications ?? []
  const maxReceivableQuantity = selectedPoDetail?.remainingQuantity ?? 1
  const hasOversizedFiles = photoGroups.some(
    (group) => group.oversizedFileNames.length > 0
  )

  function handlePurchaseOrderChange(value: string) {
    setSelectedPoId(value)
    setSelectedPoDetailId("")
    setSelectedOutletId("")
    setReceivedQuantity(1)
    setPhotoGroups(createEmptyPhotoGroups(1))
  }

  function handlePoDetailChange(value: string) {
    setSelectedPoDetailId(value)
    setSelectedOutletId("")
    setReceivedQuantity(1)
    setPhotoGroups(createEmptyPhotoGroups(1))
  }

  function handleReceivedQuantityChange(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const parsedValue = Number(e.target.value)
    const nextQuantity = Number.isFinite(parsedValue)
      ? Math.min(Math.max(Math.trunc(parsedValue), 1), maxReceivableQuantity)
      : 1

    setReceivedQuantity(nextQuantity)
    setPhotoGroups((current) =>
      Array.from(
        { length: nextQuantity },
        (_, index) => current[index] ?? { files: [], oversizedFileNames: [] }
      )
    )
  }

  function handleFileChange(
    groupIndex: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const files = Array.from(e.target.files ?? [])
    const oversizedFileNames = files
      .filter((file) => file.size > MAX_PHOTO_FILE_SIZE_BYTES)
      .map((file) => file.name)

    if (oversizedFileNames.length > 0) {
      toast.error(
        `File "${oversizedFileNames[0]}" exceeds ${MAX_PHOTO_FILE_SIZE_MB} MB limit`
      )
    }

    setPhotoGroups((current) =>
      current.map((group, index) =>
        index === groupIndex ? { files, oversizedFileNames } : group
      )
    )
  }

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!selectedPoDetailId) {
      toast.error("Please select a purchase order detail")
      return
    }
    if (!selectedOutletId || !selectedOutletIsValid) {
      toast.error("Please select an outlet")
      return
    }
    if (!Number.isInteger(receivedQuantity) || receivedQuantity < 1) {
      toast.error("Received quantity must be at least 1")
      return
    }
    if (receivedQuantity > maxReceivableQuantity) {
      toast.error(`Only ${maxReceivableQuantity} asset(s) remaining`)
      return
    }

    const missingPhotoGroupIndex = photoGroups.findIndex(
      (group) => group.files.length < 1
    )
    if (missingPhotoGroupIndex >= 0) {
      toast.error(
        `Please upload at least one asset photo for asset ${missingPhotoGroupIndex + 1}`
      )
      return
    }

    if (hasOversizedFiles) {
      toast.error(
        `Replace photos over ${MAX_PHOTO_FILE_SIZE_MB} MB before submitting`
      )
      return
    }

    const formData = new FormData()
    formData.set("poId", selectedPoId)
    formData.set("poDetailId", selectedPoDetailId)
    formData.set("outletId", selectedOutletId)
    formData.set("condition", condition)
    formData.set("receivedQuantity", String(receivedQuantity))

    photoGroups.forEach((group, groupIndex) => {
      for (const file of group.files) {
        formData.append(`photos-${groupIndex}`, file)
      }
    })

    startTransition(async () => {
      const result = await receivedAssetStore(formData)

      if (result.success) {
        toast.success(result.message)
        router.push("/asset-transaction/received-asset")
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <form id="form" onSubmit={handleSubmit} className="flex flex-col gap-8">
      <div className="rounded-lg border p-4">
        <h3 className="mb-4 font-semibold">Receive Asset Info</h3>
        <FieldGroup>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="poId">Purchase Order</FieldLabel>
              <SearchableSelect
                id="poId"
                name="poId"
                options={purchaseOrderItems}
                value={selectedPoId}
                onValueChange={handlePurchaseOrderChange}
                placeholder="Select PO number"
                searchPlaceholder="Search PO number..."
                emptyMessage="No receivable purchase orders"
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="poDetailId">Asset</FieldLabel>
              <SearchableSelect
                id="poDetailId"
                name="poDetailId"
                options={poDetailItems}
                value={selectedPoDetailId}
                onValueChange={handlePoDetailChange}
                placeholder="Select asset"
                searchPlaceholder="Search asset..."
                emptyMessage={
                  selectedPoId ? "No receivable assets" : "Select PO first"
                }
                disabled={!selectedPoId}
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="outletId">Outlet</FieldLabel>
              <SearchableSelect
                id="outletId"
                name="outletId"
                options={outletItems}
                value={selectedOutletId}
                onValueChange={setSelectedOutletId}
                placeholder="Select Outlet"
                searchPlaceholder="Search outlet..."
                emptyMessage={
                  selectedPoDetail
                    ? "No outlets for this company"
                    : "Select PO line first"
                }
                disabled={!selectedPoDetail}
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="condition">Condition</FieldLabel>
              <SearchableSelect
                id="condition"
                name="condition"
                options={conditionItems}
                value={condition}
                onValueChange={setCondition}
                placeholder="Select condition"
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="receivedQuantity">
                Received Quantity
              </FieldLabel>
              <Input
                id="receivedQuantity"
                name="receivedQuantity"
                type="number"
                min={1}
                max={maxReceivableQuantity}
                value={receivedQuantity}
                onChange={handleReceivedQuantityChange}
                disabled={!selectedPoDetail}
                required
              />
              <FieldDescription>
                Maximum receivable:{" "}
                {selectedPoDetail ? maxReceivableQuantity : 0}
              </FieldDescription>
            </Field>
          </div>
        </FieldGroup>
      </div>

      {/* Selected PO line summary */}
      {selectedPoDetail && (
        <div className="rounded-lg border p-4">
          <div className="mb-4 flex flex-col gap-1">
            <h3 className="font-semibold">Selected PO line</h3>
            <p className="text-sm text-muted-foreground">
              Review company, asset, specification, and remaining quantity
              before receiving.
            </p>
          </div>

          <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-6">
            <SummaryItem label="PO number" value={selectedPoDetail.poNo} />
            <SummaryItem
              label="Company"
              value={`${selectedPoDetail.company.code} - ${selectedPoDetail.company.name}`}
            />
            <SummaryItem
              label="Asset"
              value={selectedPoDetail.assetCode?.name ?? "-"}
            />
            <SummaryItem label="Ordered" value={selectedPoDetail.quantity} />
            <SummaryItem
              label="Received"
              value={selectedPoDetail.receivedQuantity}
            />
            <SummaryItem
              label="Remaining"
              value={selectedPoDetail.remainingQuantity}
            />
          </div>

          <div className="mt-4 rounded-md border bg-muted/30 p-3">
            <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Detail specification
            </p>
            {selectedSpecifications.length ? (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {selectedSpecifications.map((spec) => (
                  <div
                    key={spec.id}
                    className="rounded-md border bg-background px-3 py-2"
                  >
                    <p className="text-xs text-muted-foreground">
                      {spec.specName || "Specification"}
                    </p>
                    <p className="font-medium">{spec.specValue || "-"}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No detail specifications recorded for this PO line.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Photos */}
      <div className="rounded-lg border p-4">
        <h3 className="mb-4 font-semibold">Photos</h3>
        {selectedPoDetail ? (
          <div className="grid gap-4">
            {photoGroups.map((group, groupIndex) => (
              <div
                key={`${selectedPoDetailId}-${groupIndex}`}
                className="rounded-md border p-3"
              >
                <Field>
                  <FieldLabel htmlFor={`photos-${groupIndex}`}>
                    Asset {groupIndex + 1} Photos
                  </FieldLabel>
                  <Input
                    id={`photos-${groupIndex}`}
                    name={`photos-${groupIndex}`}
                    type="file"
                    multiple
                    required
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => handleFileChange(groupIndex, e)}
                  />
                  <FieldDescription>
                    Upload at least one photo for this asset. Max{" "}
                    {MAX_PHOTO_FILE_SIZE_MB} MB per file.
                  </FieldDescription>
                  {group.oversizedFileNames.length > 0 && (
                    <FieldError>
                      Files over {MAX_PHOTO_FILE_SIZE_MB} MB:{" "}
                      {group.oversizedFileNames.join(", ")}
                    </FieldError>
                  )}
                </Field>

                {group.files.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                    {group.files.map((file, fileIndex) => (
                      <div
                        key={`${file.name}-${fileIndex}`}
                        className="group relative"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          className="h-24 w-full rounded border object-cover"
                        />
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {file.name}
                        </p>
                      </div>
                    ))}
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

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/asset-transaction/received-asset")}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isPending || hasOversizedFiles}>
          <LoadingSwap isLoading={isPending}>Receive Asset</LoadingSwap>
        </Button>
      </div>
    </form>
  )
}
