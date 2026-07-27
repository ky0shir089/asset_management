"use client"

import { useEffect, useState, useRef, useTransition } from "react"
import { Input } from "./ui/input"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

export default function SearchBox() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { replace } = useRouter()

  const [value, setValue] = useState<string>(() => searchParams.get("q") ?? "")
  const [isPending, startTransition] = useTransition()
  const inFlightRef = useRef(false)

  const currentQ = searchParams.get("q") ?? ""
  const currentPage = searchParams.get("page") ?? ""

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (value === currentQ) return
      if (inFlightRef.current) return

      inFlightRef.current = true

      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString())

        if (value) {
          params.set("page", "1")
          params.set("q", value)
        } else {
          params.delete("page")
          params.delete("q")
        }

        const newSearch = params.toString()
        const oldSearch = searchParams.toString()
        if (newSearch === oldSearch) {
          inFlightRef.current = false
          return
        }

        try {
          replace(`${pathname}?${newSearch}`)
        } finally {
          inFlightRef.current = false
        }
      })
    }, 500)

    return () => {
      clearTimeout(timeout)
      inFlightRef.current = false
    }
  }, [value, pathname, replace, searchParams, currentQ, currentPage])

  return (
    <div className="flex flex-col w-full">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Type to search..."
        aria-label="Search"
        autoFocus
      />
      {isPending && (
        <span className="text-xs text-muted-foreground">Loading...</span>
      )}
    </div>
  )
}
