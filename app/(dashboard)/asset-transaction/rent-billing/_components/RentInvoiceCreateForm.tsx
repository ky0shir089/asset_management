"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { rentInvoiceCompany } from "@/data/rent-billing"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import { rentInvoiceCreateDraft } from "../action"

export function RentInvoiceCreateForm({
  companies,
}: {
  companies: rentInvoiceCompany[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [companyCode, setCompanyCode] = useState("")
  const now = new Date()
  const [month, setMonth] = useState(String(now.getMonth() + 1))
  const [year, setYear] = useState(String(now.getFullYear()))

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData()
    formData.set(
      "companyId",
      companies.find((company) => company.code === companyCode)?.id ?? ""
    )
    formData.set("month", month)
    formData.set("year", year)
    startTransition(async () => {
      const result = await rentInvoiceCreateDraft(formData)
      if (!result.success) {
        toast.error(result.message)
        return
      }
      toast.success(result.message)
      router.push(`/asset-transaction/rent-billing/${result.invoiceId}`)
    })
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="billing-company">Company</Label>
        <Select
          value={companyCode}
          onValueChange={(value) => setCompanyCode(value ?? "")}
        >
          <SelectTrigger id="billing-company" className="w-full">
            <SelectValue placeholder="Choose company" />
          </SelectTrigger>
          <SelectContent>
            {companies.map((company) => (
              <SelectItem key={company.id} value={company.code}>
                {company.name} ({company.code})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Billing period</legend>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="billing-month">Month</Label>
            <Select
              value={month}
              onValueChange={(value) => setMonth(value ?? "")}
            >
              <SelectTrigger id="billing-month" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, index) => index + 1).map(
                  (value) => (
                    <SelectItem key={value} value={String(value)}>
                      {new Intl.DateTimeFormat("en", {
                        month: "long",
                        timeZone: "UTC",
                      }).format(new Date(Date.UTC(2024, value - 1, 1)))}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="billing-year">Year</Label>
            <Input
              id="billing-year"
              type="number"
              min="2000"
              max="2200"
              value={year}
              onChange={(event) => setYear(event.target.value)}
              required
            />
          </div>
        </div>
      </fieldset>
      <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isPending}
        >
          Back
        </Button>
        <Button type="submit" disabled={isPending || !companyCode}>
          {isPending ? "Generating…" : "Generate draft"}
        </Button>
      </div>
    </form>
  )
}
