"use client"

import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { LoadingSwap } from "@/components/ui/loading-swap"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import type { assetSpecShowType } from "@/data/asset-spec"
import {
  assetSpecSchema,
  type assetSpecSchemaType,
} from "@/lib/formSchemas/asset-spec-schema"
import { cn } from "@/lib/utils"
import { zodResolver } from "@hookform/resolvers/zod"
import { ChevronsUpDown } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState, useTransition } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import { assetSpecStore, assetSpecUpdate, searchAssetCodes } from "../action"

interface AssetCodeOption {
  id: string
  code: string
  name: string
}

interface SpecFormProps {
  data?: assetSpecShowType
}

interface AssetCodeCommandSelectProps {
  value: string
  onValueChange: (value: string) => void
  initialAssetCode?: AssetCodeOption | null
  id?: string
  invalid?: boolean
}

function AssetCodeCommandSelect({
  value,
  onValueChange,
  initialAssetCode,
  id,
  invalid,
}: AssetCodeCommandSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [options, setOptions] = useState<AssetCodeOption[]>([])
  const [selectedOption, setSelectedOption] = useState<AssetCodeOption | null>(
    null
  )
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState(false)
  const trimmedSearch = search.trim()
  const searchMessage = searchError
    ? "Unable to load asset codes"
    : isSearching
      ? "Searching asset codes..."
      : trimmedSearch.length > 0 && trimmedSearch.length < 3
        ? "Type at least 3 characters to search"
        : "No asset code found"
  const selectedCode =
    options.find((option) => option.id === value) ??
    (selectedOption?.id === value ? selectedOption : null) ??
    (initialAssetCode?.id === value ? initialAssetCode : null)

  useEffect(() => {
    if (!open) {
      return
    }

    let ignore = false
    const timeout = window.setTimeout(
      async () => {
        try {
          setIsSearching(true)
          const results = await searchAssetCodes(trimmedSearch)

          if (!ignore) {
            setOptions(results)
          }
        } catch {
          if (!ignore) {
            setOptions([])
            setSearchError(true)
          }
        } finally {
          if (!ignore) {
            setIsSearching(false)
          }
        }
      },
      trimmedSearch.length >= 3 ? 500 : 0
    )

    return () => {
      ignore = true
      window.clearTimeout(timeout)
    }
  }, [open, trimmedSearch])


  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            className="w-full justify-between font-normal"
            aria-invalid={invalid}
          />
        }
      >
        <span className={cn("truncate", !selectedCode && "text-muted-foreground")}>
          {selectedCode ? selectedCode.name : "Asset Code"}
        </span>
        <ChevronsUpDown className="size-4 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--anchor-width) p-0">
        <Command shouldFilter={false}>
          <CommandInput
            value={search}
            onValueChange={(value) => {
              setSearch(value)
              setSearchError(false)
            }}
            placeholder="Search asset code..."
          />
          <CommandList>
            <CommandEmpty>{searchMessage}</CommandEmpty>
            <CommandGroup>
              {options.map((code) => {
                const selected = code.id === value

                return (
                  <CommandItem
                    key={code.id}
                    value={`${code.name}`}
                    data-checked={selected}
                    onSelect={() => {
                      onValueChange(code.id)
                      setSelectedOption(code)
                      setOpen(false)
                      setSearch("")
                      setOptions([])
                    }}
                  >
                    <span>{code.name}</span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export default function SpecForm({ data }: SpecFormProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const form = useForm<assetSpecSchemaType>({
    resolver: zodResolver(assetSpecSchema),
    defaultValues: {
      codeId: data?.codeId || "",
      name: data?.name || "",
      type: data?.type ?? "TEXT",
      dataTable: data?.dataTable ?? "",
      isRequired: data?.isRequired ?? true,
      createable: data?.createable ?? false,
    },
  })

  // eslint-disable-next-line react-hooks/incompatible-library
  const selectedType = form.watch("type")

  function onSubmit(values: assetSpecSchemaType) {
    startTransition(async () => {
      const result = data?.id
        ? await assetSpecUpdate(data.id, values)
        : await assetSpecStore(values)

      if (result.success) {
        form.reset()
        toast.success(result.message)
        router.push("/asset/specification")
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <form
      id="form"
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col gap-8"
    >
      <FieldGroup>
        <Controller
          name="codeId"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Asset Code</FieldLabel>
              <AssetCodeCommandSelect
                value={field.value}
                onValueChange={field.onChange}
                initialAssetCode={data?.code ?? null}
                id={field.name}
                invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Name</FieldLabel>
              <Input
                {...field}
                id={field.name}
                aria-invalid={fieldState.invalid}
                placeholder="Name"
                autoComplete="off"
                required
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="type"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Type</FieldLabel>
              <Select
                name={field.name}
                value={field.value}
                onValueChange={(value) => {
                  if (value) {
                    form.setValue("type", value)
                  }
                }}
                required
              >
                <SelectTrigger
                  id={field.name}
                  aria-invalid={fieldState.invalid}
                  className="w-full"
                >
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="TEXT">TEXT</SelectItem>
                    <SelectItem value="SELECT">SELECT</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        {selectedType === "SELECT" && (
          <Controller
            name="dataTable"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Data Table</FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  aria-invalid={fieldState.invalid}
                  placeholder="asset_brands"
                  autoComplete="off"
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Table name used to load selectable specification values.
                </p>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        )}

        <Controller
          name="isRequired"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Required</FieldLabel>
              <div className="flex items-center gap-2">
                <Switch
                  id={field.name}
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  aria-invalid={fieldState.invalid}
                  size="lg"
                />
                <span>{field.value ? "Yes" : "No"}</span>
              </div>
              <FieldContent>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </FieldContent>
            </Field>
          )}
        />

        {selectedType === "SELECT" && (
          <Controller
            name="createable"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Createable</FieldLabel>
                <div className="flex items-center gap-2">
                  <Switch
                    id={field.name}
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    aria-invalid={fieldState.invalid}
                    size="lg"
                  />
                  <span>{field.value ? "Yes" : "No"}</span>
                </div>
                <FieldContent>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </FieldContent>
              </Field>
            )}
          />
        )}
      </FieldGroup>

      <Field>
        <Button type="submit" id="form" disabled={isPending}>
          <LoadingSwap isLoading={isPending}>
            {data?.id ? "Update" : "Create"}
          </LoadingSwap>
        </Button>
      </Field>
    </form>
  )
}
