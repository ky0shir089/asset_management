"use client"

import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { SearchableSelect } from "@/components/ui/searchable-select"
import type { purchaseOrderDetailOptionForReceiveType } from "@/data/select"

interface SelectItem {
  label: string
  value: string
}

interface ReceiveInfoSectionProps {
  selectedPoId: string
  selectedPoDetailId: string
  selectedOutletId: string
  condition: string
  receivedQuantity: number
  maxReceivableQuantity: number
  purchaseOrderItems: SelectItem[]
  poDetailItems: SelectItem[]
  outletItems: SelectItem[]
  conditionItems: SelectItem[]
  selectedPoDetail?: purchaseOrderDetailOptionForReceiveType
  onPurchaseOrderChange: (value: string) => void
  onPoDetailChange: (value: string) => void
  onOutletChange: (value: string) => void
  onConditionChange: (value: string) => void
  onQuantityChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export function ReceiveInfoSection({
  selectedPoId,
  selectedPoDetailId,
  selectedOutletId,
  condition,
  receivedQuantity,
  maxReceivableQuantity,
  purchaseOrderItems,
  poDetailItems,
  outletItems,
  conditionItems,
  selectedPoDetail,
  onPurchaseOrderChange,
  onPoDetailChange,
  onOutletChange,
  onConditionChange,
  onQuantityChange,
}: ReceiveInfoSectionProps) {
  return (
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
              onValueChange={onPurchaseOrderChange}
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
              onValueChange={onPoDetailChange}
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
              onValueChange={onOutletChange}
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
              onValueChange={onConditionChange}
              placeholder="Select condition"
              required
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="receivedQuantity">Received Quantity</FieldLabel>
            <Input
              id="receivedQuantity"
              name="receivedQuantity"
              type="number"
              min={1}
              max={maxReceivableQuantity}
              value={receivedQuantity}
              onChange={onQuantityChange}
              disabled={!selectedPoDetail}
              required
            />
            <FieldDescription>
              Maximum receivable: {selectedPoDetail ? maxReceivableQuantity : 0}
            </FieldDescription>
          </Field>
        </div>
      </FieldGroup>
    </div>
  )
}
