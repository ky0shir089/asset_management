"use client"

import { Button } from "@/components/ui/button"
import { LoadingSwap } from "@/components/ui/loading-swap"
import type {
  outletOptionType,
  purchaseOrderDetailOptionForReceiveType,
} from "@/data/select"
import { useRouter } from "next/navigation"
import { useMemo, useState, useTransition } from "react"
import { toast } from "sonner"
import { receivedAssetStore } from "../action"
import {
  AssetItemFieldsSection,
  type PhotoGroup,
} from "./AssetItemFieldsSection"
import { ReceiveInfoSection } from "./ReceiveInfoSection"
import { SelectedPoLineSummary } from "./SelectedPoLineSummary"

const MAX_PHOTO_FILE_SIZE_MB = 1
const MAX_PHOTO_FILE_SIZE_BYTES = MAX_PHOTO_FILE_SIZE_MB * 1024 * 1024

function createEmptyPhotoGroups(count: number): PhotoGroup[] {
  return Array.from({ length: count }, () => ({
    files: [],
    oversizedFileNames: [],
  }))
}

function createEmptySerialNumbers(count: number): string[] {
  return Array.from({ length: count }, () => "")
}

interface ReceivedAssetFormProps {
  poDetails: purchaseOrderDetailOptionForReceiveType[]
  outlets: outletOptionType[]
}

export default function ReceivedAssetForm({
  poDetails,
  outlets,
}: ReceivedAssetFormProps) {
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
  const [serialNumbers, setSerialNumbers] = useState<string[]>(
    createEmptySerialNumbers(1)
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

  const selectedPoDetail = poDetails.find((d) => d.id === selectedPoDetailId)

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
    setSerialNumbers(createEmptySerialNumbers(1))
  }

  function handlePoDetailChange(value: string) {
    setSelectedPoDetailId(value)
    setSelectedOutletId("")
    setReceivedQuantity(1)
    setPhotoGroups(createEmptyPhotoGroups(1))
    setSerialNumbers(createEmptySerialNumbers(1))
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
    setSerialNumbers((current) =>
      Array.from({ length: nextQuantity }, (_, index) => current[index] ?? "")
    )
  }

  function handleSerialNumberChange(index: number, value: string) {
    setSerialNumbers((current) =>
      current.map((item, i) => (i === index ? value : item))
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

    serialNumbers.forEach((sn, index) => {
      if (sn.trim()) {
        formData.set(`serialNumber-${index}`, sn.trim())
      }
    })

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
      <ReceiveInfoSection
        selectedPoId={selectedPoId}
        selectedPoDetailId={selectedPoDetailId}
        selectedOutletId={selectedOutletId}
        condition={condition}
        receivedQuantity={receivedQuantity}
        maxReceivableQuantity={maxReceivableQuantity}
        purchaseOrderItems={purchaseOrderItems}
        poDetailItems={poDetailItems}
        outletItems={outletItems}
        conditionItems={conditionItems}
        selectedPoDetail={selectedPoDetail}
        onPurchaseOrderChange={handlePurchaseOrderChange}
        onPoDetailChange={handlePoDetailChange}
        onOutletChange={setSelectedOutletId}
        onConditionChange={setCondition}
        onQuantityChange={handleReceivedQuantityChange}
      />

      {selectedPoDetail && (
        <SelectedPoLineSummary selectedPoDetail={selectedPoDetail} />
      )}

      <AssetItemFieldsSection
        selectedPoDetailId={selectedPoDetailId}
        photoGroups={photoGroups}
        serialNumbers={serialNumbers}
        maxPhotoFileSizeMb={MAX_PHOTO_FILE_SIZE_MB}
        hasSelectedPoDetail={!!selectedPoDetail}
        onSerialNumberChange={handleSerialNumberChange}
        onFileChange={handleFileChange}
      />

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
