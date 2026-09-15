"use client"

import type { purchaseOrderDetailOptionForReceiveType } from "@/data/select"

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

interface SelectedPoLineSummaryProps {
  selectedPoDetail: purchaseOrderDetailOptionForReceiveType
}

export function SelectedPoLineSummary({
  selectedPoDetail,
}: SelectedPoLineSummaryProps) {
  const selectedSpecifications = selectedPoDetail.specifications ?? []

  return (
    <div className="rounded-lg border p-4">
      <div className="mb-4 flex flex-col gap-1">
        <h3 className="font-semibold">Selected PO line</h3>
        <p className="text-sm text-muted-foreground">
          Review company, asset, specification, and remaining quantity before
          receiving.
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
  )
}
