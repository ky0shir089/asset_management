"use client"

import { Button } from "@/components/ui/button"
import { LoadingSwap } from "@/components/ui/loading-swap"
import { useState } from "react"
import { toast } from "sonner"

interface PurchaseOrderPdfDownloadButtonProps {
  purchaseOrderId: string
}

function getPdfFileName(response: Response, purchaseOrderId: string) {
  const contentDisposition = response.headers.get("Content-Disposition")
  const fileNameMatch = contentDisposition?.match(/filename="?([^";]+)"?/)

  return fileNameMatch?.[1] ?? `purchase-order-${purchaseOrderId}.pdf`
}

export default function PurchaseOrderPdfDownloadButton({
  purchaseOrderId,
}: PurchaseOrderPdfDownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false)

  async function downloadPdf() {
    if (isDownloading) return

    setIsDownloading(true)

    try {
      const response = await fetch(
        `/asset-transaction/purchase-order/${purchaseOrderId}/pdf`
      )

      if (!response.ok) {
        throw new Error("Failed to download purchase order PDF")
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = getPdfFileName(response, purchaseOrderId)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 0)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to download purchase order PDF"
      )
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <Button size="sm" disabled={isDownloading} onClick={downloadPdf}>
      <LoadingSwap isLoading={isDownloading}>
        {isDownloading ? "Downloading PDF" : "Download PDF"}
      </LoadingSwap>
    </Button>
  )
}
