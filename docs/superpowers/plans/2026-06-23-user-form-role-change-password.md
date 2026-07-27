# User Form Role Change Password Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make existing user edit form update assigned role and force-password-change flag without writing role data into wrong table.

**Architecture:** Keep user management edit-only. Load roles as select options from `data/select.ts`, load current user role via Drizzle relations, render `roleId` select plus `changePassword` switch, and persist role assignment in `role_user` while updating `users.changePassword`.

**Tech Stack:** Next.js App Router, React Hook Form, Zod, Drizzle ORM, shadcn/ui components.

## Global Constraints

- Match existing form patterns in `app/(dashboard)/setup-aplikasi/menu/_components/MenuForm.tsx` and `app/(dashboard)/setup-aplikasi/role/_components/RoleForm.tsx`.
- No create-user flow in this task; current user route only supports list and edit.
- `roleId` belongs in `role_user`, not `users`.
- `changePassword` belongs in `users.changePassword`.
- Use existing server-action return shape: `{ success: boolean, message: string }`.

---

## File Structure

- Modify `drizzle/schemas/auth-schema.ts`: add `roleUser` relation to `usersRelations`.
- Modify `data/select.ts`: add `roleOptions()` and `roleOptionType`.
- Modify `data/user.ts`: load `roleUser.role` in `userIndex()` and `userShow()`.
- Modify `app/(dashboard)/setup-aplikasi/user/action.ts`: make `userUpdate()` update `users.changePassword` and replace `role_user`; keep `userStore()` as unsupported defensive export.
- Modify `app/(dashboard)/setup-aplikasi/user/_components/UserForm.tsx`: replace copied module fields with role select and change-password switch.
- Modify `app/(dashboard)/setup-aplikasi/user/[userId]/edit/page.tsx`: fetch `roleOptions()` and pass roles into form.
- Modify `app/(dashboard)/setup-aplikasi/user/column.tsx`: show first assigned role from `roleUser`.

---

### Task 1: Fix user role data model usage

**Files:**
- Modify: `drizzle/schemas/auth-schema.ts:110-113`
- Modify: `data/select.ts:1-35`
- Modify: `data/user.ts:1-49`
- Modify: `app/(dashboard)/setup-aplikasi/user/column.tsx:8-24`

**Interfaces:**
- Produces: `roleOptions(): Promise<Array<{ id: string; name: string }>>`
- Produces: `roleOptionType = Awaited<ReturnType<typeof roleOptions>>[0]`
- Produces: `userShowType` with `roleUser: Array<{ roleId: string; role: { name: string } }>`

- [ ] **Step 1: Add relation**

In `drizzle/schemas/auth-schema.ts`, change `usersRelations` to:

```ts
export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  roleUser: many(roleUser),
}))
```

- [ ] **Step 2: Add role options**

In `data/select.ts`, add `roles` import and `roleOptions()`:

```ts
import { roles } from "@/drizzle/schema"
```

```ts
export async function roleOptions() {
  await requireUser()

  return db.query.roles.findMany({
    columns: {
      id: true,
      name: true,
    },
    orderBy: (roles, { asc }) => [asc(roles.name)],
  })
}
export type roleOptionType = Awaited<ReturnType<typeof roleOptions>>[0]
```

- [ ] **Step 3: Load user role relation**

In `data/user.ts`, add `with` to both `userIndex()` and `userShow()`:

```ts
with: {
  roleUser: {
    with: {
      role: true,
    },
  },
},
```

- [ ] **Step 4: Display role in table**

In `app/(dashboard)/setup-aplikasi/user/column.tsx`, replace role column accessor with cell:

```tsx
{
  header: "Role",
  cell: ({ row }) => row.original.roleUser[0]?.role.name ?? "-",
},
```

- [ ] **Step 5: Verify Task 1**

Run: `pnpm typecheck`
Expected: no new errors from user relation/query/column changes.

---

### Task 2: Fix persistence action

**Files:**
- Modify: `app/(dashboard)/setup-aplikasi/user/action.ts:1-70`

**Interfaces:**
- Consumes: `userSchemaType` with `{ roleId: string; changePassword: boolean }`
- Produces: `userUpdate(id: string, values: userSchemaType): Promise<{ success: boolean; message: string }>`

- [ ] **Step 1: Import correct tables**

Use:

```ts
import { roleUser, users } from "@/drizzle/schema"
```

- [ ] **Step 2: Keep create unsupported**

Replace `userStore()` body with a defensive return because no route provides name/email/password/user id:

```ts
export async function userStore(values: userSchemaType) {
  const validation = userSchema.safeParse(values)

  if (!validation.success) {
    return {
      success: false,
      message: "Invalid form data",
    }
  }

  return {
    success: false,
    message: "User creation is not available from this form",
  }
}
```

- [ ] **Step 3: Update user and role assignment in transaction**

Replace `userUpdate()` DB write with:

```ts
const result = await db.transaction(async (tx) => {
  const [updatedUser] = await tx
    .update(users)
    .set({
      changePassword: validation.data.changePassword,
      updatedAt: new Date(),
    })
    .where(eq(users.id, id))
    .returning({ id: users.id })

  if (!updatedUser) {
    return null
  }

  await tx.delete(roleUser).where(eq(roleUser.userId, id))

  await tx.insert(roleUser).values({
    userId: id,
    roleId: validation.data.roleId,
    createdBy: user.id,
  })

  return updatedUser
})
```

Return `Role not found` not needed; `roleId` FK produces error message if invalid.
Return `User not found` when `result` is null.

- [ ] **Step 4: Verify Task 2**

Run: `pnpm typecheck`
Expected: no Drizzle insert/update type errors in `user/action.ts`.

---

### Task 3: Build edit-only UserForm UI

**Files:**
- Modify: `app/(dashboard)/setup-aplikasi/user/_components/UserForm.tsx:1-129`
- Modify: `app/(dashboard)/setup-aplikasi/user/[userId]/edit/page.tsx:1-31`

**Interfaces:**
- Consumes: `roleOptionType[]` as `roles` prop.
- Produces: `UserForm({ data, roles }: { data: userShowType; roles: roleOptionType[] })`.

- [ ] **Step 1: Update form imports**

Use `FieldContent`, select components, and `Switch` like existing forms:

```tsx
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import type { roleOptionType } from "@/data/select"
import type { userShowType } from "@/data/user"
```

- [ ] **Step 2: Update props and defaults**

Use:

```tsx
interface UserFormProps {
  data: userShowType
  roles: roleOptionType[]
}

export default function UserForm({ data, roles }: UserFormProps) {
  const form = useForm<userSchemaType>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      changePassword: data.changePassword ?? false,
      roleId: data.roleUser[0]?.roleId ?? "",
    },
  })
}
```

- [ ] **Step 3: Replace copied module fields**

Render only:

```tsx
<Controller
  name="roleId"
  control={form.control}
  render={({ field, fieldState }) => (
    <Field data-invalid={fieldState.invalid}>
      <FieldLabel htmlFor={field.name}>Role</FieldLabel>
      <Select
        name={field.name}
        value={field.value || null}
        onValueChange={(value) => field.onChange(value ?? "")}
        required
        disabled={!roles.length}
      >
        <SelectTrigger
          id={field.name}
          aria-invalid={fieldState.invalid}
          className="w-full"
        >
          <SelectValue placeholder="Role" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {roles.map((role) => (
              <SelectItem key={role.id} value={role.id}>
                {role.name}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
    </Field>
  )}
/>

<Controller
  name="changePassword"
  control={form.control}
  render={({ field, fieldState }) => (
    <Field data-invalid={fieldState.invalid} orientation="horizontal">
      <Switch
        id={field.name}
        checked={field.value}
        onCheckedChange={field.onChange}
        aria-invalid={fieldState.invalid}
      />
      <FieldContent>
        <FieldLabel htmlFor={field.name}>Require password change</FieldLabel>
        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
      </FieldContent>
    </Field>
  )}
/>
```

- [ ] **Step 4: Make submit edit-only**

Use:

```tsx
const result = await userUpdate(data.id, values)
```

Button text:

```tsx
Update
```

- [ ] **Step 5: Pass roles from edit page**

In edit page:

```tsx
import { roleOptions } from "@/data/select"
```

```tsx
const [data, roles] = await Promise.all([userShow(userId), roleOptions()])
return <UserForm data={data} roles={roles} />
```

Remove `console.log(data)`.

- [ ] **Step 6: Verify Task 3**

Run: `pnpm typecheck`
Expected: no errors from `UserForm` props, select value, switch value, or edit page.

---

## Self-Review

- Spec coverage: all agreed items map to Tasks 1-3.
- Placeholder scan: no TBD/TODO/fill-in placeholders.
- Type consistency: `roleOptions`, `roleOptionType`, `roleUser`, `userUpdate`, and `UserForm` names match touched files.
