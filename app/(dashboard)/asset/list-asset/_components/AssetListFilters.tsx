"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useTransition } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const STATUS_OPTIONS = ["TERSEDIA", "BOOKED", "DISEWA"] as const

const FILTER_KEYS = [
  "nomorAsset",
  "assetCode",
  "location",
  "user",
  "status",
] as const

export default function AssetListFilters() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const params = new URLSearchParams(searchParams.toString())

    params.delete("page")

    for (const key of FILTER_KEYS) {
      const value = formData.get(key)?.toString().trim()
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    }

    startTransition(() => {
      router.replace(`?${params.toString()}`)
    })
  }

  function handleReset() {
    const params = new URLSearchParams(searchParams.toString())
    params.delete("page")
    for (const key of FILTER_KEYS) {
      params.delete(key)
    }
    startTransition(() => {
      router.replace(`?${params.toString()}`)
    })
  }

  const currentStatus = searchParams.get("status") ?? ""

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-4 grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
    >
      <div className="space-y-1">
        <Label htmlFor="filter-nomorAsset">Nomor Asset</Label>
        <Input
          id="filter-nomorAsset"
          name="nomorAsset"
          placeholder="Search..."
          defaultValue={searchParams.get("nomorAsset") ?? ""}
          disabled={isPending}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="filter-assetCode">Asset Code</Label>
        <Input
          id="filter-assetCode"
          name="assetCode"
          placeholder="Search by name..."
          defaultValue={searchParams.get("assetCode") ?? ""}
          disabled={isPending}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="filter-location">Location</Label>
        <Input
          id="filter-location"
          name="location"
          placeholder="Outlet name..."
          defaultValue={searchParams.get("location") ?? ""}
          disabled={isPending}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="filter-user">User</Label>
        <Input
          id="filter-user"
          name="user"
          placeholder="Recipient name..."
          defaultValue={searchParams.get("user") ?? ""}
          disabled={isPending}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="filter-status">Status</Label>
        <Select
          name="status"
          defaultValue={currentStatus || null}
          key={`status-${currentStatus}`}
          disabled={isPending}
        >
          <SelectTrigger id="filter-status" className="w-full">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent align="start">
            <SelectGroup>
              <SelectItem value={null}>All statuses</SelectItem>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Loading..." : "Apply"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleReset}
          disabled={isPending}
        >
          Reset
        </Button>
      </div>

      {isPending && (
        <span className="sr-only" aria-live="polite">
          Filtering results...
        </span>
      )}
    </form>
  )
}
