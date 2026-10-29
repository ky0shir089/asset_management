import { requirePermission } from "@/lib/auth/permission"
import { rentInvoiceCompanies } from "@/data/rent-billing"
import { RentInvoiceCreateForm } from "../_components/RentInvoiceCreateForm"

export default async function NewRentInvoicePage() {
  await requirePermission("rent-billing:edit")
  const companies = await rentInvoiceCompanies()
  return (
    <main
      className="mx-auto w-full max-w-3xl space-y-5"
      aria-labelledby="new-invoice-title"
    >
      <header className="border-b pb-4">
        <h1
          id="new-invoice-title"
          className="text-2xl font-semibold tracking-tight"
        >
          Create rent invoice
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Select company and billing month. Active leases will be included in
          one draft.
        </p>
      </header>
      <RentInvoiceCreateForm companies={companies} />
    </main>
  )
}
