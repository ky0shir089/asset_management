"use client"

import { useState, useTransition } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Wrench } from "lucide-react"
import { useRouter } from "next/navigation"
import { NumericFormat } from "react-number-format"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import {
  maintenanceSchema,
  type maintenanceSchemaType,
} from "@/lib/formSchemas/maintenance-schema"
import { createMaintenanceAction } from "../action"

interface MaintenanceModalProps {
  asset: {
    id: string
    assetNumber: string
    assetCodeName: string
  }
}

export default function MaintenanceModal({ asset }: MaintenanceModalProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const form = useForm<maintenanceSchemaType>({
    resolver: zodResolver(maintenanceSchema),
    defaultValues: {
      assetId: asset.id,
      detail: "",
      amount: 0,
    },
  })

  function handleOpenChange(isOpen: boolean) {
    if (!isPending) {
      setOpen(isOpen)
      if (isOpen) {
        form.reset({
          assetId: asset.id,
          detail: "",
          amount: 0,
        })
      }
    }
  }

  function onSubmit(values: maintenanceSchemaType) {
    startTransition(async () => {
      const res = await createMaintenanceAction(values)
      if (res.success && res.id) {
        toast.success(res.message ?? "Maintenance berhasil dicatat")
        setOpen(false)
        router.push(`/asset/list-asset/${asset.id}`)
      } else {
        toast.error(res.message ?? "Gagal mencatat maintenance")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <Wrench className="mr-1 h-3.5 w-3.5" />
            Maintenance
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Form Maintenance Asset</DialogTitle>
          <DialogDescription>
            Catat perbaikan atau pemeliharaan untuk {asset.assetNumber} (
            {asset.assetCodeName}).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <input type="hidden" {...form.register("assetId")} />

          <div className="space-y-1.5">
            <Label htmlFor={`detail-${asset.id}`}>Detail Maintenance</Label>
            <Controller
              name="detail"
              control={form.control}
              render={({ field }) => (
                <RichTextEditor
                  value={field.value}
                  onChange={field.onChange}
                  disabled={isPending}
                />
              )}
            />
            {form.formState.errors.detail && (
              <p className="text-xs text-destructive">
                {form.formState.errors.detail.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`amount-${asset.id}`}>Biaya (Rp)</Label>
            <Controller
              name="amount"
              control={form.control}
              render={({ field }) => (
                <NumericFormat
                  id={`amount-${asset.id}`}
                  customInput={Input}
                  thousandSeparator="."
                  decimalSeparator=","
                  allowNegative={false}
                  decimalScale={0}
                  placeholder="0"
                  disabled={isPending}
                  value={field.value}
                  onValueChange={({ floatValue }) =>
                    field.onChange(floatValue ?? 0)
                  }
                />
              )}
            />
            {form.formState.errors.amount && (
              <p className="text-xs text-destructive">
                {form.formState.errors.amount.message}
              </p>
            )}
          </div>

          <DialogFooter showCloseButton>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Simpan..." : "Simpan Maintenance"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
