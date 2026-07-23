"use client"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { LoadingSwap } from "@/components/ui/loading-swap"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { roleShowType } from "@/data/role"
import type { menuOptionsType } from "@/data/select"
import { roleSchema, type roleSchemaType } from "@/lib/formSchemas/role-schema"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useCallback, useMemo, useTransition } from "react"
import { useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
import { roleStore, roleUpdate } from "../action"

interface RoleFormProps {
  data?: roleShowType
  menus: menuOptionsType[]
}

const SET_VALUE_OPTIONS = {
  shouldDirty: true,
  shouldTouch: true,
  shouldValidate: true,
} as const

function addIds<T extends string | number>(currentIds: T[], idsToAdd: T[]) {
  return Array.from(new Set([...currentIds, ...idsToAdd]))
}

function removeIds<T extends string | number>(
  currentIds: T[],
  idsToRemove: T[]
) {
  const idsToRemoveSet = new Set(idsToRemove)

  return currentIds.filter((id) => !idsToRemoveSet.has(id))
}

function getRoleDefaultValues(data?: roleShowType): roleSchemaType {
  return {
    name: data?.name ?? "",
    menus: data?.menuRoles?.map((mr) => mr.menuId) ?? [],
    permissions:
      data?.permissionRoles
        ?.map((pr) => pr.permissionId)
        .filter((id): id is number => id !== null) ?? [],
  }
}

export default function RoleForm({ data, menus }: RoleFormProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const defaultValues = useMemo(() => getRoleDefaultValues(data), [data])

  const form = useForm<roleSchemaType>({
    resolver: zodResolver(roleSchema),
    defaultValues,
  })

  const {
    control,
    formState: { errors },
    getValues,
    handleSubmit,
    register,
    reset,
    setValue,
  } = form

  const selectedMenuIds = useWatch({ control, name: "menus" })
  const selectedPermissionIds = useWatch({ control, name: "permissions" })

  const selectedMenuIdSet = useMemo(
    () => new Set(selectedMenuIds ?? []),
    [selectedMenuIds]
  )
  const selectedPermissionIdSet = useMemo(
    () => new Set(selectedPermissionIds ?? []),
    [selectedPermissionIds]
  )

  const allMenuIds = useMemo(() => menus.map((menu) => menu.id), [menus])
  const allPermissionIds = useMemo(
    () =>
      menus.flatMap((menu) =>
        menu.permissions.map((permission) => permission.id)
      ),
    [menus]
  )

  const selectAll =
    allMenuIds.length > 0 &&
    allMenuIds.every((id) => selectedMenuIdSet.has(id)) &&
    allPermissionIds.every((id) => selectedPermissionIdSet.has(id))

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      setValue("menus", checked ? allMenuIds : [], SET_VALUE_OPTIONS)
      setValue(
        "permissions",
        checked ? allPermissionIds : [],
        SET_VALUE_OPTIONS
      )
    },
    [allMenuIds, allPermissionIds, setValue]
  )

  const handleSelectMenu = useCallback(
    (menu: menuOptionsType, checked: boolean) => {
      const currentMenuIds = getValues("menus") ?? []
      const currentPermissionIds = getValues("permissions") ?? []
      const permissionIds = menu.permissions.map((permission) => permission.id)

      setValue(
        "menus",
        checked
          ? addIds(currentMenuIds, [menu.id])
          : removeIds(currentMenuIds, [menu.id]),
        SET_VALUE_OPTIONS
      )
      setValue(
        "permissions",
        checked
          ? addIds(currentPermissionIds, permissionIds)
          : removeIds(currentPermissionIds, permissionIds),
        SET_VALUE_OPTIONS
      )
    },
    [getValues, setValue]
  )

  const handleSelectPermission = useCallback(
    (menuId: string, permissionId: number, checked: boolean) => {
      const currentMenuIds = getValues("menus") ?? []
      const currentPermissionIds = getValues("permissions") ?? []

      if (checked && !currentMenuIds.includes(menuId)) {
        setValue("menus", addIds(currentMenuIds, [menuId]), SET_VALUE_OPTIONS)
      }

      setValue(
        "permissions",
        checked
          ? addIds(currentPermissionIds, [permissionId])
          : removeIds(currentPermissionIds, [permissionId]),
        SET_VALUE_OPTIONS
      )
    },
    [getValues, setValue]
  )

  function onSubmit(values: roleSchemaType) {
    startTransition(async () => {
      const result = data?.id
        ? await roleUpdate(data.id, values)
        : await roleStore(values)

      if (result.success) {
        reset()
        toast.success(result.message)
        router.push("/setup-aplikasi/role")
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <form
      id="form"
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-8"
    >
      <FieldGroup>
        <Field data-invalid={Boolean(errors.name)}>
          <FieldLabel htmlFor="name">Role</FieldLabel>
          <Input
            {...register("name")}
            id="name"
            aria-invalid={Boolean(errors.name)}
            placeholder="Role"
            autoComplete="off"
            required
          />
          {errors.name && <FieldError errors={[errors.name]} />}
        </Field>

        <Field data-invalid={Boolean(errors.menus || errors.permissions)}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">
                  <Checkbox
                    id="select-all-checkbox"
                    name="select-all-checkbox"
                    checked={selectAll}
                    onCheckedChange={(checked) =>
                      handleSelectAll(checked === true)
                    }
                    aria-label="Select all menus"
                    aria-invalid={Boolean(errors.menus)}
                  />
                </TableHead>
                <TableHead className="text-center">Menu</TableHead>
                <TableHead colSpan={5} className="text-center">
                  Permission
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {menus.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Checkbox
                      id={`row-${item.id}-checkbox`}
                      name={`row-${item.id}-checkbox`}
                      checked={selectedMenuIdSet.has(item.id)}
                      onCheckedChange={(checked) =>
                        handleSelectMenu(item, checked === true)
                      }
                      aria-label={`Select ${item.name}`}
                      aria-invalid={Boolean(errors.menus)}
                    />
                  </TableCell>
                  <TableCell>{item.name}</TableCell>
                  {item.permissions.map((permission) => {
                    const permissionInputId = `permission-${permission.id}-checkbox`

                    return (
                      <TableCell key={permission.id}>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={permissionInputId}
                            name={permissionInputId}
                            checked={selectedPermissionIdSet.has(permission.id)}
                            onCheckedChange={(checked) =>
                              handleSelectPermission(
                                item.id,
                                permission.id,
                                checked === true
                              )
                            }
                            aria-invalid={Boolean(errors.permissions)}
                          />
                          <FieldLabel htmlFor={permissionInputId}>
                            {permission.name}
                          </FieldLabel>
                        </div>
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {errors.menus && <FieldError errors={[errors.menus]} />}
          {errors.permissions && <FieldError errors={[errors.permissions]} />}
        </Field>
      </FieldGroup>

      <Field>
        <Button type="submit" disabled={isPending}>
          <LoadingSwap isLoading={isPending}>
            {data?.id ? "Update" : "Create"}
          </LoadingSwap>
        </Button>
      </Field>
    </form>
  )
}
