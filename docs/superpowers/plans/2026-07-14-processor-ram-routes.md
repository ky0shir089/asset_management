# Processor and RAM Routes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add independent Processor and RAM CRUD master routes under `/asset`, matching Asset Brand behavior.

**Architecture:** Add separate `processors` and `rams` Drizzle tables, then build one vertical CRUD stack per table using existing Asset Brand files as behavioral references. Keep each stack independent; do not add a generic master-data abstraction.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict mode, Drizzle ORM/PostgreSQL, Zod 4, React Hook Form, TanStack Table, shadcn-style UI.

## Global Constraints

- Match `app/(dashboard)/asset/brand` behavior and project naming conventions.
- Processor and RAM each store one required `name` string plus standard audit fields.
- Use permissions `processor:browse|read|create|update` and `ram:browse|read|create|update` exactly.
- Do not add delete flows, shared CRUD abstractions, extra fields, dependencies, permission seeds, menu seeds, or role seeds.
- Do not alter existing `Processor` and `RAM` asset-spec names in `app/(dashboard)/asset/code/action.ts`.
- Generate migration only; do not apply it without explicit approval.
- Repository has no test runner. Use focused executable Zod checks, `pnpm typecheck`, `pnpm lint`, migration inspection, and browser-driven CRUD verification.
- Preserve unrelated working-tree changes. Stage only files named by each task.

---

## File Map

**Modify**

- `drizzle/schemas/master-asset.ts` — declare `processors` and `rams` tables.
- `app/(dashboard)/asset/page.tsx` — expose Processor and RAM landing links.

**Generate**

- `drizzle/migrations/0013_processor_ram_masters.sql` — create both tables and foreign keys.
- `drizzle/migrations/meta/0013_snapshot.json` — Drizzle schema snapshot.
- `drizzle/migrations/meta/_journal.json` — register migration.

**Create Processor stack**

- `lib/formSchemas/processor-schema.ts` — validate Processor form input.
- `data/processor.ts` — authorized list and detail queries.
- `app/(dashboard)/asset/processor/action.ts` — authorized create and update actions.
- `app/(dashboard)/asset/processor/column.tsx` — Processor table columns.
- `app/(dashboard)/asset/processor/_components/ProcessorForm.tsx` — create/edit form.
- `app/(dashboard)/asset/processor/page.tsx` — searchable paginated list.
- `app/(dashboard)/asset/processor/new/page.tsx` — create screen.
- `app/(dashboard)/asset/processor/[processorId]/edit/page.tsx` — edit screen.

**Create RAM stack**

- `lib/formSchemas/ram-schema.ts` — validate RAM form input.
- `data/ram.ts` — authorized list and detail queries.
- `app/(dashboard)/asset/ram/action.ts` — authorized create and update actions.
- `app/(dashboard)/asset/ram/column.tsx` — RAM table columns.
- `app/(dashboard)/asset/ram/_components/RamForm.tsx` — create/edit form.
- `app/(dashboard)/asset/ram/page.tsx` — searchable paginated list.
- `app/(dashboard)/asset/ram/new/page.tsx` — create screen.
- `app/(dashboard)/asset/ram/[ramId]/edit/page.tsx` — edit screen.

---

### Task 1: Add Processor and RAM Database Tables

**Files:**
- Modify: `drizzle/schemas/master-asset.ts:44-57`
- Generate: `drizzle/migrations/0013_processor_ram_masters.sql`
- Generate: `drizzle/migrations/meta/0013_snapshot.json`
- Modify: `drizzle/migrations/meta/_journal.json`

**Interfaces:**
- Consumes: `users.id` from `drizzle/schemas/auth-schema.ts`.
- Produces: exported Drizzle tables `processors` and `rams`, each with `id`, `name`, `createdBy`, `updatedBy`, `createdAt`, and `updatedAt` columns.

- [ ] **Step 1: Confirm clean migration baseline for target schema files**

Run:

```bash
git status --short -- drizzle/schemas/master-asset.ts drizzle/migrations drizzle/migrations/meta
```

Expected: existing working-tree state is visible. Do not discard any changes. If an untracked/generated `0013_*` migration already exists, inspect it before continuing and choose next free migration index instead of overwriting it.

- [ ] **Step 2: Add table declarations**

Insert after `assetBrands` in `drizzle/schemas/master-asset.ts`:

```ts
export const processors = pgTable("processors", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  updatedBy: text("updated_by").references(() => users.id, {
    onDelete: "cascade",
  }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
})

export const rams = pgTable("rams", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  updatedBy: text("updated_by").references(() => users.id, {
    onDelete: "cascade",
  }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
})
```

- [ ] **Step 3: Verify schema compiles before migration generation**

Run:

```bash
pnpm typecheck
```

Expected: exit code `0`. Any failure mentioning `processors`, `rams`, or `master-asset.ts` must be fixed before generation. Record unrelated pre-existing failures without changing unrelated files.

- [ ] **Step 4: Generate named migration**

Run:

```bash
pnpm exec drizzle-kit generate --name processor_ram_masters
```

Expected new files:

```txt
drizzle/migrations/0013_processor_ram_masters.sql
drizzle/migrations/meta/0013_snapshot.json
```

Expected `drizzle/migrations/meta/_journal.json` gains entry with tag `0013_processor_ram_masters`.

If Drizzle chooses an index other than `0013`, use generated index consistently in remaining commands. Do not rename generated migration or snapshot manually.

- [ ] **Step 5: Inspect generated SQL for exact scope**

Generated SQL must create both tables with `uuid` primary keys, required `varchar(255)` names, audit fields, timestamps, and four user foreign keys using `ON DELETE cascade`. It must contain no unrelated schema changes.

Do not run `pnpm db:migrate` or `pnpm db:push` in this task.

- [ ] **Step 6: Commit database changes when commits are authorized**

```bash
git add drizzle/schemas/master-asset.ts drizzle/migrations/0013_processor_ram_masters.sql drizzle/migrations/meta/0013_snapshot.json drizzle/migrations/meta/_journal.json
git commit -m "feat: add processor and ram masters" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

Expected: one commit containing only table and generated migration files. If commits are not authorized, leave files unstaged and continue.

---

### Task 2: Build Processor CRUD Stack

**Files:**
- Create: `lib/formSchemas/processor-schema.ts`
- Create: `data/processor.ts`
- Create: `app/(dashboard)/asset/processor/action.ts`
- Create: `app/(dashboard)/asset/processor/column.tsx`
- Create: `app/(dashboard)/asset/processor/_components/ProcessorForm.tsx`
- Create: `app/(dashboard)/asset/processor/page.tsx`
- Create: `app/(dashboard)/asset/processor/new/page.tsx`
- Create: `app/(dashboard)/asset/processor/[processorId]/edit/page.tsx`

**Interfaces:**
- Consumes: `processors` table from Task 1; `requireUser()`, `requirePermission()`, `authorizeAction()`, pagination helpers, shared UI components.
- Produces: `processorSchema`, `processorSchemaType`, `processorIndex()`, `processorShow()`, `processorIndexType`, `processorShowType`, `processorStore()`, and `processorUpdate()`; routes `/asset/processor`, `/asset/processor/new`, `/asset/processor/[processorId]/edit`.

- [ ] **Step 1: Create Processor validation schema**

Create `lib/formSchemas/processor-schema.ts`:

```ts
import z from "zod"

export const processorSchema = z.object({
  name: z.string().min(1),
})
export type processorSchemaType = z.infer<typeof processorSchema>
```

- [ ] **Step 2: Run focused schema checks**

Run:

```bash
pnpm exec tsx -e "import assert from 'node:assert/strict'; import { processorSchema } from './lib/formSchemas/processor-schema.ts'; assert.equal(processorSchema.safeParse({ name: 'Ryzen 7 7700' }).success, true); assert.equal(processorSchema.safeParse({ name: '' }).success, false)"
```

Expected: exit code `0` and no output.

- [ ] **Step 3: Create authorized Processor data module**

Create `data/processor.ts`:

```ts
import "server-only"

import { db } from "@/drizzle/db"
import { processors } from "@/drizzle/schema"
import { requirePermission } from "@/lib/auth/permission"
import { paginatedResponse, paginationParams } from "@/lib/helper"
import { count, eq, ilike } from "drizzle-orm"
import { notFound } from "next/navigation"
import { requireUser } from "./require-user"

export async function processorIndex(
  currentPage: number,
  size: number,
  query?: string
) {
  await requireUser()
  await requirePermission("processor:browse")

  const pagination = paginationParams(currentPage, size)
  const search = query?.trim()
  const where = search ? ilike(processors.name, `%${search}%`) : undefined

  const [data, [{ count: total }]] = await Promise.all([
    db.query.processors.findMany({
      where,
      orderBy: (processors, { asc }) => [asc(processors.createdAt)],
      limit: pagination.pageSize,
      offset: pagination.offset,
    }),
    db.select({ count: count() }).from(processors).where(where),
  ])

  return paginatedResponse(data, total, pagination)
}

export async function processorShow(id: string) {
  await requireUser()
  await requirePermission("processor:read")

  const data = await db.query.processors.findFirst({
    where: eq(processors.id, id),
  })

  if (!data) {
    notFound()
  }

  return data
}

export type processorIndexType = Awaited<
  ReturnType<typeof processorIndex>
>["data"][0]
export type processorShowType = Awaited<ReturnType<typeof processorShow>>
```

- [ ] **Step 4: Create authorized Processor server actions**

Create `app/(dashboard)/asset/processor/action.ts`:

```ts
"use server"

import { requireUser } from "@/data/require-user"
import { db } from "@/drizzle/db"
import { processors } from "@/drizzle/schema"
import { authorizeAction } from "@/lib/auth/permission"
import {
  processorSchema,
  processorSchemaType,
} from "@/lib/formSchemas/processor-schema"
import { eq } from "drizzle-orm"

export async function processorStore(values: processorSchemaType) {
  const user = await requireUser()

  try {
    const permission = await authorizeAction("processor:create")

    if (!permission.authorized) return permission.response

    const validation = processorSchema.safeParse(values)

    if (!validation.success) {
      return { success: false, message: "Invalid form data" }
    }

    await db.insert(processors).values({
      ...validation.data,
      createdBy: user.id,
    })

    return { success: true, message: "Processor created successfully" }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Something went wrong",
    }
  }
}

export async function processorUpdate(
  id: string,
  values: processorSchemaType
) {
  const user = await requireUser()

  try {
    const permission = await authorizeAction("processor:update")

    if (!permission.authorized) return permission.response

    const validation = processorSchema.safeParse(values)

    if (!validation.success) {
      return { success: false, message: "Invalid form data" }
    }

    await db
      .update(processors)
      .set({ ...validation.data, updatedBy: user.id })
      .where(eq(processors.id, id))

    return { success: true, message: "Processor updated successfully" }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Something went wrong",
    }
  }
}
```

- [ ] **Step 5: Create Processor table columns**

Create `app/(dashboard)/asset/processor/column.tsx`:

```tsx
"use client"

import { buttonVariants } from "@/components/ui/button"
import type { processorIndexType } from "@/data/processor"
import { ColumnDef } from "@tanstack/react-table"
import { ClipboardEdit } from "lucide-react"
import Link from "next/link"

export const columns: ColumnDef<processorIndexType>[] = [
  { header: "Name", accessorKey: "name" },
  {
    header: "Action",
    cell: ({ row }) => (
      <Link
        className={buttonVariants({ variant: "link", size: "sm" })}
        href={`/asset/processor/${row.original.id}/edit`}
      >
        <ClipboardEdit data-icon="inline-start" />
        Edit
      </Link>
    ),
  },
]
```

- [ ] **Step 6: Create Processor form**

Create `app/(dashboard)/asset/processor/_components/ProcessorForm.tsx`:

```tsx
"use client"

import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { LoadingSwap } from "@/components/ui/loading-swap"
import type { processorShowType } from "@/data/processor"
import {
  processorSchema,
  processorSchemaType,
} from "@/lib/formSchemas/processor-schema"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import { processorStore, processorUpdate } from "../action"

interface ProcessorFormProps {
  data?: processorShowType
}

export default function ProcessorForm({ data }: ProcessorFormProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const form = useForm<processorSchemaType>({
    resolver: zodResolver(processorSchema),
    defaultValues: { name: data?.name || "" },
  })

  function onSubmit(values: processorSchemaType) {
    startTransition(async () => {
      const result = data?.id
        ? await processorUpdate(data.id, values)
        : await processorStore(values)

      if (result.success) {
        form.reset()
        toast.success(result.message)
        router.push("/asset/processor")
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
```

- [ ] **Step 7: Create Processor list page**

Create `app/(dashboard)/asset/processor/page.tsx`:

```tsx
import { DataTableSkeleton } from "@/components/data-table-skeleton"
import SearchBox from "@/components/search-box"
import { buttonVariants } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { processorIndex } from "@/data/processor"
import Link from "next/link"
import { Suspense } from "react"
import { columns } from "./column"

type SearchParamValue = string | string[] | undefined

function getSearchParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value
}

const RenderTable = async ({
  currentPage,
  size,
  query,
}: {
  currentPage: number
  size: number
  query?: string
}) => {
  const { data, meta } = await processorIndex(currentPage, size, query)
  return <DataTable columns={columns} data={data} meta={meta} />
}

export default async function ProcessorPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: SearchParamValue
    size?: SearchParamValue
    q?: SearchParamValue
  }>
}) {
  const params = await searchParams
  const currentPage = Number(getSearchParam(params.page) ?? 1)
  const size = Number(getSearchParam(params.size) ?? 10)
  const query = getSearchParam(params.q) ?? ""

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="mb-4 text-3xl font-bold">Processor</h2>
        <Link href="/asset/processor/new" className={buttonVariants()}>
          Add New
        </Link>
      </div>
      <SearchBox />
      <Suspense
        key={`${query}-${currentPage}-${size}`}
        fallback={<DataTableSkeleton columns={3} />}
      >
        <RenderTable query={query} currentPage={currentPage} size={size} />
      </Suspense>
    </>
  )
}
```

- [ ] **Step 8: Create Processor new page**

Create `app/(dashboard)/asset/processor/new/page.tsx`:

```tsx
import FormSkeleton from "@/components/form-skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Suspense } from "react"
import ProcessorForm from "../_components/ProcessorForm"

export default function ProcessorNewPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className={cn("text-2xl")}>Create Processor</CardTitle>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<FormSkeleton />}>
          <ProcessorForm />
        </Suspense>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 9: Create Processor edit page**

Create `app/(dashboard)/asset/processor/[processorId]/edit/page.tsx`:

```tsx
import FormSkeleton from "@/components/form-skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { processorShow } from "@/data/processor"
import { cn } from "@/lib/utils"
import { Suspense } from "react"
import ProcessorForm from "../../_components/ProcessorForm"

type Params = Promise<{ processorId: string }>

const RenderForm = async ({ processorId }: { processorId: string }) => {
  const data = await processorShow(processorId)
  return <ProcessorForm data={data} />
}

export default async function ProcessorEditPage({
  params,
}: {
  params: Params
}) {
  const { processorId } = await params
  return (
    <Card>
      <CardHeader>
        <CardTitle className={cn("text-2xl")}>Edit Processor</CardTitle>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<FormSkeleton />}>
          <RenderForm processorId={processorId} />
        </Suspense>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 10: Verify Processor stack**

Run:

```bash
pnpm typecheck
pnpm eslint 'app/(dashboard)/asset/processor/**/*.{ts,tsx}' data/processor.ts lib/formSchemas/processor-schema.ts
```

Expected: both commands exit `0`. If shell glob handling differs, run `pnpm lint` and inspect Processor-related findings.

- [ ] **Step 11: Commit Processor stack when commits are authorized**

```bash
git add 'app/(dashboard)/asset/processor' data/processor.ts lib/formSchemas/processor-schema.ts
git commit -m "feat: add processor management routes" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

If commits are not authorized, leave files unstaged and continue.

---

### Task 3: Build RAM CRUD Stack

**Files:**
- Create: `lib/formSchemas/ram-schema.ts`
- Create: `data/ram.ts`
- Create: `app/(dashboard)/asset/ram/action.ts`
- Create: `app/(dashboard)/asset/ram/column.tsx`
- Create: `app/(dashboard)/asset/ram/_components/RamForm.tsx`
- Create: `app/(dashboard)/asset/ram/page.tsx`
- Create: `app/(dashboard)/asset/ram/new/page.tsx`
- Create: `app/(dashboard)/asset/ram/[ramId]/edit/page.tsx`

**Interfaces:**
- Consumes: `rams` table from Task 1; authorization, pagination, and shared UI helpers.
- Produces: `ramSchema`, `ramSchemaType`, `ramIndex()`, `ramShow()`, `ramIndexType`, `ramShowType`, `ramStore()`, and `ramUpdate()`; routes `/asset/ram`, `/asset/ram/new`, `/asset/ram/[ramId]/edit`.

- [ ] **Step 1: Create RAM validation schema**

Create `lib/formSchemas/ram-schema.ts`:

```ts
import z from "zod"

export const ramSchema = z.object({
  name: z.string().min(1),
})
export type ramSchemaType = z.infer<typeof ramSchema>
```

- [ ] **Step 2: Run focused schema checks**

Run:

```bash
pnpm exec tsx -e "import assert from 'node:assert/strict'; import { ramSchema } from './lib/formSchemas/ram-schema.ts'; assert.equal(ramSchema.safeParse({ name: '32 GB DDR5' }).success, true); assert.equal(ramSchema.safeParse({ name: '' }).success, false)"
```

Expected: exit code `0` and no output.

- [ ] **Step 3: Create authorized RAM data module**

Create `data/ram.ts`:

```ts
import "server-only"

import { db } from "@/drizzle/db"
import { rams } from "@/drizzle/schema"
import { requirePermission } from "@/lib/auth/permission"
import { paginatedResponse, paginationParams } from "@/lib/helper"
import { count, eq, ilike } from "drizzle-orm"
import { notFound } from "next/navigation"
import { requireUser } from "./require-user"

export async function ramIndex(
  currentPage: number,
  size: number,
  query?: string
) {
  await requireUser()
  await requirePermission("ram:browse")
  const pagination = paginationParams(currentPage, size)
  const search = query?.trim()
  const where = search ? ilike(rams.name, `%${search}%`) : undefined

  const [data, [{ count: total }]] = await Promise.all([
    db.query.rams.findMany({
      where,
      orderBy: (rams, { asc }) => [asc(rams.createdAt)],
      limit: pagination.pageSize,
      offset: pagination.offset,
    }),
    db.select({ count: count() }).from(rams).where(where),
  ])

  return paginatedResponse(data, total, pagination)
}

export async function ramShow(id: string) {
  await requireUser()
  await requirePermission("ram:read")
  const data = await db.query.rams.findFirst({ where: eq(rams.id, id) })
  if (!data) notFound()
  return data
}

export type ramIndexType = Awaited<ReturnType<typeof ramIndex>>["data"][0]
export type ramShowType = Awaited<ReturnType<typeof ramShow>>
```

- [ ] **Step 4: Create authorized RAM server actions**

Create `app/(dashboard)/asset/ram/action.ts`:

```ts
"use server"

import { requireUser } from "@/data/require-user"
import { db } from "@/drizzle/db"
import { rams } from "@/drizzle/schema"
import { authorizeAction } from "@/lib/auth/permission"
import { ramSchema, ramSchemaType } from "@/lib/formSchemas/ram-schema"
import { eq } from "drizzle-orm"

export async function ramStore(values: ramSchemaType) {
  const user = await requireUser()
  try {
    const permission = await authorizeAction("ram:create")
    if (!permission.authorized) return permission.response
    const validation = ramSchema.safeParse(values)
    if (!validation.success) return { success: false, message: "Invalid form data" }
    await db.insert(rams).values({ ...validation.data, createdBy: user.id })
    return { success: true, message: "RAM created successfully" }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Something went wrong",
    }
  }
}

export async function ramUpdate(id: string, values: ramSchemaType) {
  const user = await requireUser()
  try {
    const permission = await authorizeAction("ram:update")
    if (!permission.authorized) return permission.response
    const validation = ramSchema.safeParse(values)
    if (!validation.success) return { success: false, message: "Invalid form data" }
    await db
      .update(rams)
      .set({ ...validation.data, updatedBy: user.id })
      .where(eq(rams.id, id))
    return { success: true, message: "RAM updated successfully" }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Something went wrong",
    }
  }
}
```

- [ ] **Step 5: Create RAM table columns**

Create `app/(dashboard)/asset/ram/column.tsx`:

```tsx
"use client"

import { buttonVariants } from "@/components/ui/button"
import type { ramIndexType } from "@/data/ram"
import { ColumnDef } from "@tanstack/react-table"
import { ClipboardEdit } from "lucide-react"
import Link from "next/link"

export const columns: ColumnDef<ramIndexType>[] = [
  { header: "Name", accessorKey: "name" },
  {
    header: "Action",
    cell: ({ row }) => (
      <Link
        className={buttonVariants({ variant: "link", size: "sm" })}
        href={`/asset/ram/${row.original.id}/edit`}
      >
        <ClipboardEdit data-icon="inline-start" />
        Edit
      </Link>
    ),
  },
]
```

- [ ] **Step 6: Create RAM form**

Create `app/(dashboard)/asset/ram/_components/RamForm.tsx`:

```tsx
"use client"

import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { LoadingSwap } from "@/components/ui/loading-swap"
import type { ramShowType } from "@/data/ram"
import { ramSchema, ramSchemaType } from "@/lib/formSchemas/ram-schema"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import { ramStore, ramUpdate } from "../action"

interface RamFormProps {
  data?: ramShowType
}

export default function RamForm({ data }: RamFormProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const form = useForm<ramSchemaType>({
    resolver: zodResolver(ramSchema),
    defaultValues: { name: data?.name || "" },
  })

  function onSubmit(values: ramSchemaType) {
    startTransition(async () => {
      const result = data?.id
        ? await ramUpdate(data.id, values)
        : await ramStore(values)
      if (result.success) {
        form.reset()
        toast.success(result.message)
        router.push("/asset/ram")
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
```

- [ ] **Step 7: Create RAM list page**

Create `app/(dashboard)/asset/ram/page.tsx` with same search/pagination structure as Processor, using `ramIndex`, title `RAM`, link `/asset/ram/new`, and `key={`${query}-${currentPage}-${size}`}`. Exact body:

```tsx
import { DataTableSkeleton } from "@/components/data-table-skeleton"
import SearchBox from "@/components/search-box"
import { buttonVariants } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { ramIndex } from "@/data/ram"
import Link from "next/link"
import { Suspense } from "react"
import { columns } from "./column"

type SearchParamValue = string | string[] | undefined
const getSearchParam = (value: SearchParamValue) =>
  Array.isArray(value) ? value[0] : value

const RenderTable = async ({ currentPage, size, query }: {
  currentPage: number
  size: number
  query?: string
}) => {
  const { data, meta } = await ramIndex(currentPage, size, query)
  return <DataTable columns={columns} data={data} meta={meta} />
}

export default async function RamPage({ searchParams }: {
  searchParams: Promise<{
    page?: SearchParamValue
    size?: SearchParamValue
    q?: SearchParamValue
  }>
}) {
  const params = await searchParams
  const currentPage = Number(getSearchParam(params.page) ?? 1)
  const size = Number(getSearchParam(params.size) ?? 10)
  const query = getSearchParam(params.q) ?? ""

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="mb-4 text-3xl font-bold">RAM</h2>
        <Link href="/asset/ram/new" className={buttonVariants()}>
          Add New
        </Link>
      </div>
      <SearchBox />
      <Suspense
        key={`${query}-${currentPage}-${size}`}
        fallback={<DataTableSkeleton columns={3} />}
      >
        <RenderTable query={query} currentPage={currentPage} size={size} />
      </Suspense>
    </>
  )
}
```

- [ ] **Step 8: Create RAM new page**

Create `app/(dashboard)/asset/ram/new/page.tsx`:

```tsx
import FormSkeleton from "@/components/form-skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Suspense } from "react"
import RamForm from "../_components/RamForm"

export default function RamNewPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className={cn("text-2xl")}>Create RAM</CardTitle>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<FormSkeleton />}>
          <RamForm />
        </Suspense>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 9: Create RAM edit page**

Create `app/(dashboard)/asset/ram/[ramId]/edit/page.tsx`:

```tsx
import FormSkeleton from "@/components/form-skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ramShow } from "@/data/ram"
import { cn } from "@/lib/utils"
import { Suspense } from "react"
import RamForm from "../../_components/RamForm"

type Params = Promise<{ ramId: string }>

const RenderForm = async ({ ramId }: { ramId: string }) => {
  const data = await ramShow(ramId)
  return <RamForm data={data} />
}

export default async function RamEditPage({ params }: { params: Params }) {
  const { ramId } = await params
  return (
    <Card>
      <CardHeader>
        <CardTitle className={cn("text-2xl")}>Edit RAM</CardTitle>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<FormSkeleton />}>
          <RenderForm ramId={ramId} />
        </Suspense>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 10: Verify RAM stack**

Run:

```bash
pnpm typecheck
pnpm eslint 'app/(dashboard)/asset/ram/**/*.{ts,tsx}' data/ram.ts lib/formSchemas/ram-schema.ts
```

Expected: both commands exit `0`. If shell glob handling differs, run `pnpm lint` and inspect RAM-related findings.

- [ ] **Step 11: Commit RAM stack when commits are authorized**

```bash
git add 'app/(dashboard)/asset/ram' data/ram.ts lib/formSchemas/ram-schema.ts
git commit -m "feat: add ram management routes" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

If commits are not authorized, leave files unstaged and continue.

---

### Task 4: Add Asset Landing Links and Verify End-to-End

**Files:**
- Modify: `app/(dashboard)/asset/page.tsx:4-11`

**Interfaces:**
- Consumes: Processor and RAM routes from Tasks 2 and 3.
- Produces: landing cards linking to `/asset/processor` and `/asset/ram`.

- [ ] **Step 1: Add landing links**

Update `assetMenus` in `app/(dashboard)/asset/page.tsx`:

```ts
const assetMenus = [
  { title: "Asset Category", href: "/asset/category" },
  { title: "Asset Code", href: "/asset/code" },
  { title: "Asset Brand", href: "/asset/brand" },
  { title: "Processor", href: "/asset/processor" },
  { title: "RAM", href: "/asset/ram" },
  { title: "Asset Spec", href: "/asset/spec" },
  { title: "Bank", href: "/asset/bank" },
  { title: "Supplier", href: "/asset/supplier" },
]
```

- [ ] **Step 2: Run all static checks**

Run:

```bash
pnpm typecheck
pnpm lint
```

Expected: both commands exit `0`. Capture unrelated pre-existing failures without changing unrelated files.

- [ ] **Step 3: Inspect feature diff**

Run:

```bash
git diff -- drizzle/schemas/master-asset.ts drizzle/migrations/0013_processor_ram_masters.sql drizzle/migrations/meta/0013_snapshot.json drizzle/migrations/meta/_journal.json 'app/(dashboard)/asset/page.tsx' 'app/(dashboard)/asset/processor' 'app/(dashboard)/asset/ram' data/processor.ts data/ram.ts lib/formSchemas/processor-schema.ts lib/formSchemas/ram-schema.ts
```

Expected: only requested additions; no delete flow, shared CRUD abstraction, spec-name changes, permission/menu/role seed changes, or unrelated DDL.

- [ ] **Step 4: Prepare runtime prerequisites**

Runtime CRUD verification requires explicit migration approval, all eight permissions on test user, running app, and valid environment. After approval only, run:

```bash
pnpm db:migrate
```

Expected: migration succeeds once. Without approval, skip DB mutation and report runtime verification blocked.

- [ ] **Step 5: Verify landing and list flows in browser**

1. Sign in with authorized test user.
2. Open `/asset`; confirm Processor and RAM cards.
3. Open both list pages; confirm title, search, Add New, Name, and Action UI.
4. Load `/asset/processor?q=Ryzen&page=1&size=10` and `/asset/ram?q=DDR5&page=1&size=10`.
5. Confirm no page exceptions, console errors, or failed relevant requests.

- [ ] **Step 6: Verify Processor create/edit**

1. Open `/asset/processor/new`; empty Name must fail browser validation.
2. Create `Ryzen 7 7700 Verification`; expect toast `Processor created successfully` and redirect.
3. Search record, edit to `Ryzen 7 7700 Verified`; expect toast `Processor updated successfully` and updated row.

- [ ] **Step 7: Verify RAM create/edit**

1. Open `/asset/ram/new`; empty Name must fail browser validation.
2. Create `32 GB DDR5 Verification`; expect toast `RAM created successfully` and redirect.
3. Search record, edit to `64 GB DDR5 Verified`; expect toast `RAM updated successfully` and updated row.

- [ ] **Step 8: Run required code reviews**

Use `ecc:code-reviewer`, `ecc:react-reviewer`, and `ecc:typescript-reviewer`. Fix verified in-scope findings, then rerun:

```bash
pnpm typecheck
pnpm lint
```

- [ ] **Step 9: Commit landing link and review fixes when commits are authorized**

```bash
git add 'app/(dashboard)/asset/page.tsx'
git commit -m "feat: link processor and ram masters" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

Use separate `fix:` commit for reviewer fixes. Without commit authorization, leave files unstaged.

- [ ] **Step 10: Report verification truthfully**

Report migration generation/inspection/application state, `pnpm typecheck`, `pnpm lint`, browser-flow results, skipped steps and blockers, reviewer findings, and fixes. Never claim runtime success if migration, permissions, or authenticated access blocked execution.
