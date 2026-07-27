"use client"

import * as React from "react"
import { CheckIcon, ChevronDownIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export type SearchableSelectOption = {
  value: string
  label: string
}

interface SearchableSelectProps {
  options: SearchableSelectOption[]
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  creatable?: boolean
  onCreateOption?: (value: string) => void
  createLabel?: (value: string) => string
  disabled?: boolean
  required?: boolean
  name?: string
  id?: string
  "aria-invalid"?: boolean
}

export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = "Select option",
  searchPlaceholder = "Search...",
  emptyMessage = "No options found",
  creatable,
  onCreateOption,
  createLabel = (value) => `Create "${value}"`,
  disabled,
  required,
  name,
  id,
  "aria-invalid": ariaInvalid,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")

  const selectedOption = options.find((option) => option.value === value)
  const trimmedSearch = search.trim()
  const normalizedSearch = trimmedSearch.toLowerCase()
  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(normalizedSearch)
  )
  const canCreate =
    creatable &&
    trimmedSearch.length > 0 &&
    !options.some((option) => option.label.toLowerCase() === normalizedSearch)
  const handleCreateOption = onCreateOption ?? onValueChange

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            className="w-full justify-between font-normal"
            disabled={disabled}
            aria-invalid={ariaInvalid}
            aria-required={required}
            data-name={name}
          />
        }
      >
        <span className={cn(!selectedOption && "text-muted-foreground")}>
          {selectedOption?.label ?? placeholder}
        </span>
        <ChevronDownIcon className="text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-(--anchor-width) min-w-56 p-2">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onKeyDown={(event) => event.stopPropagation()}
          placeholder={searchPlaceholder}
          autoComplete="off"
          className="mb-2"
        />
        <div className="max-h-56 overflow-y-auto">
          {filteredOptions.length ? (
            filteredOptions.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => {
                  onValueChange(option.value)
                  setSearch("")
                  setOpen(false)
                }}
                className="justify-between"
              >
                <span>{option.label}</span>
                {option.value === value && <CheckIcon />}
              </DropdownMenuItem>
            ))
          ) : !canCreate ? (
            <p className="px-1.5 py-2 text-sm text-muted-foreground">
              {emptyMessage}
            </p>
          ) : null}
          {canCreate && (
            <DropdownMenuItem
              onClick={() => {
                handleCreateOption(trimmedSearch)
                setSearch("")
                setOpen(false)
              }}
            >
              {createLabel(trimmedSearch)}
            </DropdownMenuItem>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
