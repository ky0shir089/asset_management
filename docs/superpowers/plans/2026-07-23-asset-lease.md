# Asset Lease List, Create, and Detail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## Context

`app/(dashboard)/distribution/asset-lease/page.tsx` is empty while `drizzle/schemas/distribution.ts` defines lease headers, details, and photos. Current header field `rentAssets.outletId` incorrectly references `customers.id`; confirmed contract is header outlet references `outlets.id`, while customer remains on each `rentAssetDetails` row. Feature must provide working list, create, and detail routes.

Existing migration drift is unrelated: TypeScript declares `asset_datas`, latest migration snapshot declares `receive_assets`. Migration generation must stop if Drizzle requests or emits unrelated rename/drop/create operations for those tables.

**Goal:** Build searchable asset-lease list, multi-row create form, and read-only detail page.

**Architecture:** Correct and expose distribution schema relations. Add server-only list/detail loaders, shared Zod validation, selector queries, and one transactional create action. Create action atomically claims available LSA-company assets by conditional status update before inserting lease header/details, preventing double lease.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict mode, Drizzle ORM/PostgreSQL, React Hook Form, Zod, TanStack Table, Tailwind CSS.

## Global Constraints

- Routes: `/distribution/asset-lease`, `/distribution/asset-lease/new`, `/distribution/asset-lease/[rentId]`.
- List columns, exact order: Rent No, Outlet, Note, Status, Created At, Action.
- `Rent No` format: `SWA/YYYY/MM/00001`, five-digit sequence reset monthly in `Asia/Jakarta`.
- List search matches only `outlets.name`.
- List requires `asset-lease:browse`; create requires `asset-lease:create`; detail requires `asset-lease:read`.
- Super Administrator sees all leases; other users can list/open only leases they created.
- Header stores outlet and note. Customer belongs only to detail rows.
- Create supports multiple detail rows.
- Each customer must belong to selected header outlet.
- Selectable assets must have status `TERSEDIA` and belong to outlet chain whose `companies.code = "LSA"`.
- Successful create changes every selected asset status to `DISEWA` in same transaction.
- Duplicate assets, cross-outlet customers, stale/unavailable assets, and non-LSA assets must fail with no partial writes.
- Lease status starts as `NEW`. No edit, delete, return, status-transition, or photo UI.
- Use native date inputs and installed dependencies. Add no new dependency or generic abstraction.
- Do not apply DB migration or commit unless user explicitly asks.

---

## File Map

**Create**

- `docs/superpowers/plans/2026-07-23-asset-lease.md` — approved implementation plan copied into repository before source edits.
- `lib/formSchemas/asset-lease-schema.ts` — create payload and cross-field validation.
- `data/asset-lease.ts` — list and detail data loaders plus inferred row types.
- `app/(dashboard)/distribution/asset-lease/action.ts` — race-safe create action.
- `app/(dashboard)/distribution/asset-lease/column.tsx` — six list columns and View link.
- `app/(dashboard)/distribution/asset-lease/new/page.tsx` — create page and option loading.
- `app/(dashboard)/distribution/asset-lease/_components/AssetLeaseForm.tsx` — header form and repeating-row orchestration.
- `app/(dashboard)/distribution/asset-lease/_components/AssetLeaseDetailSection.tsx` — one detail-row editor.
- `app/(dashboard)/distribution/asset-lease/[rentId]/page.tsx` — read-only lease header and detail table.

**Modify**

- `drizzle/schemas/distribution.ts` — correct outlet FK/imports and add relations.
- `drizzle/schema.ts` — export distribution schema.
- `data/select.ts` — customer and available LSA-asset options.
- `app/(dashboard)/distribution/asset-lease/page.tsx` — functional list shell.

**Generate only if additive**

- New SQL migration under `drizzle/migrations/`.
- Matching new snapshot under `drizzle/migrations/meta/`.
- One new entry in `drizzle/migrations/meta/_journal.json`.

---

### Task 0: Persist Approved Plan in Repository

**Files:**
- Create: `docs/superpowers/plans/2026-07-23-asset-lease.md`

**Interfaces:**
- Consumes: approved runtime plan.
- Produces: repository-local implementation reference before source edits.

- [ ] **Step 1: Create plan directory if absent and copy this approved plan exactly**

Save exact approved contents to:

```text
docs/superpowers/plans/2026-07-23-asset-lease.md
```

Do not commit unless user explicitly asks.

---

### Task 1: Record Baseline and Correct Distribution Schema

**Files:**
- Modify: `drizzle/schemas/distribution.ts`
- Modify: `drizzle/schema.ts`

**Interfaces:**
- Produces: `db.query.rentAssets`, `db.query.rentAssetDetails`, and relation path `rentAssets.outlet`, `rentAssets.details`, `rentAssetDetails.asset`, `rentAssetDetails.customer`.

- [ ] **Step 1: Record existing static-check baseline before edits**

```bash
pnpm typecheck
pnpm lint
```

Expected: record pass/fail and shortest decisive diagnostics. Known likely baseline: current files import `receiveAssets` while schema exports `assetDatas`. Do not fix unrelated failures here.

- [ ] **Step 2: Replace circular imports and correct header outlet FK**

In `drizzle/schemas/distribution.ts`, use direct imports:

```ts
import { relations } from "drizzle-orm"
import { users } from "./auth-schema"
import { assetDatas } from "./asset-transaction"
import { customers } from "./master-asset"
import { outlets } from "./network"
```

Remove:

```ts
import { customers, assetDatas } from "../schema"
```

Add unique Rent No and correct header outlet FK:

```ts
rentNo: varchar("rent_no", { length: 255 }).notNull(),
outletId: uuid("outlet_id")
  .notNull()
  .references(() => outlets.id, { onDelete: "cascade" }),
```

Define `rentAssets` with unique index:

```ts
(table) => [uniqueIndex("rent_assets_rent_no_unique").on(table.rentNo)]
```

Import `uniqueIndex` from `drizzle-orm/pg-core`. Keep `rentAssetDetails.customerId -> customers.id` unchanged.

- [ ] **Step 3: Add only relations consumed by list/create/detail**

Append in `drizzle/schemas/distribution.ts`:

```ts
export const rentAssetsRelations = relations(
  rentAssets,
  ({ one, many }) => ({
    outlet: one(outlets, {
      fields: [rentAssets.outletId],
      references: [outlets.id],
    }),
    details: many(rentAssetDetails),
  })
)

export const rentAssetDetailsRelations = relations(
  rentAssetDetails,
  ({ one }) => ({
    rentAsset: one(rentAssets, {
      fields: [rentAssetDetails.rentAssetId],
      references: [rentAssets.id],
    }),
    asset: one(assetDatas, {
      fields: [rentAssetDetails.assetId],
      references: [assetDatas.id],
    }),
    customer: one(customers, {
      fields: [rentAssetDetails.customerId],
      references: [customers.id],
    }),
  })
)
```

Leave `rentPhotoAssets` schema present but add no UI relation.

- [ ] **Step 4: Export distribution schema**

Append in `drizzle/schema.ts`:

```ts
export * from "./schemas/distribution"
```

- [ ] **Step 5: Verify focused schema changes**

```bash
pnpm exec prettier --check "drizzle/schema.ts" "drizzle/schemas/distribution.ts"
pnpm typecheck
```

Expected: no new distribution relation/type errors. Existing baseline failures may remain unchanged.

---

### Task 2: Add Create Validation

**Files:**
- Create: `lib/formSchemas/asset-lease-schema.ts`

**Interfaces:**
- Produces: `assetLeaseSchema` and `assetLeaseSchemaType` used by client form and server action.

- [ ] **Step 1: Define exact payload and cross-field validation**

Create:

```ts
import z from "zod"

const isoDate = /^\d{4}-\d{2}-\d{2}$/

const assetLeaseDetailSchema = z
  .object({
    assetId: z.uuid("Asset is required"),
    customerId: z.uuid("Customer is required"),
    dateStart: z.string().regex(isoDate, "Start date is required"),
    dateEnd: z
      .string()
      .refine((value) => !value || isoDate.test(value), "Invalid end date"),
    amount: z.number().int().min(0, "Amount cannot be negative"),
  })
  .superRefine((detail, ctx) => {
    if (detail.dateEnd && detail.dateEnd < detail.dateStart) {
      ctx.addIssue({
        code: "custom",
        path: ["dateEnd"],
        message: "End date must be on or after start date",
      })
    }
  })

export const assetLeaseSchema = z
  .object({
    outletId: z.uuid("Outlet is required"),
    note: z.string().trim().max(255).optional(),
    details: z.array(assetLeaseDetailSchema).min(1, "Add at least one detail"),
  })
  .superRefine((value, ctx) => {
    const seen = new Set<string>()

    value.details.forEach((detail, index) => {
      if (seen.has(detail.assetId)) {
        ctx.addIssue({
          code: "custom",
          path: ["details", index, "assetId"],
          message: "Asset is already selected",
        })
      }

      seen.add(detail.assetId)
    })
  })

export type assetLeaseSchemaType = z.infer<typeof assetLeaseSchema>
```

- [ ] **Step 2: Run focused validation checks**

```bash
pnpm exec prettier --check "lib/formSchemas/asset-lease-schema.ts"
pnpm typecheck
```

Expected: schema accepts one or more unique detail rows, optional blank end date, and non-negative integer amount; rejects duplicate assets and reversed dates.

---

### Task 3: Add Lease Selectors

**Files:**
- Modify: `data/select.ts`

**Interfaces:**
- Produces:
  - `assetLeaseCustomerOptions()` / `assetLeaseCustomerOptionType`
  - `assetLeaseAssetOptions()` / `assetLeaseAssetOptionType`
- Reuses: existing `outletOptions()`.

- [ ] **Step 1: Extend direct imports**

Add tables/operators required for selector SQL:

```ts
import {
  assetDatas,
  branches,
  companies,
  customers,
  outlets,
  // existing imports stay
} from "@/drizzle/schema"
import { and, count, eq, inArray, isNotNull, ne, sql } from "drizzle-orm"
```

Preserve existing imports and functions.

- [ ] **Step 2: Add customer options carrying outlet ownership**

```ts
export async function assetLeaseCustomerOptions() {
  await requireUser()

  return db.query.customers.findMany({
    columns: {
      id: true,
      name: true,
      outletId: true,
    },
    orderBy: (customers, { asc }) => [asc(customers.name)],
  })
}

export type assetLeaseCustomerOptionType = Awaited<
  ReturnType<typeof assetLeaseCustomerOptions>
>[0]
```

Client filters these by selected header outlet; server action revalidates same rule.

- [ ] **Step 3: Add available asset options restricted to company code LSA**

```ts
export async function assetLeaseAssetOptions() {
  await requireUser()

  const lsaOutletIds = db
    .select({ id: outlets.id })
    .from(outlets)
    .innerJoin(branches, eq(outlets.branchId, branches.id))
    .innerJoin(companies, eq(branches.companyId, companies.id))
    .where(eq(companies.code, "LSA"))

  return db.query.assetDatas.findMany({
    columns: {
      id: true,
      nomorAssets: true,
      outletId: true,
    },
    where: and(
      eq(assetDatas.status, "TERSEDIA"),
      inArray(assetDatas.outletId, lsaOutletIds)
    ),
    with: {
      poDetail: {
        with: {
          prDetail: {
            with: {
              assetCode: {
                columns: {
                  code: true,
                  name: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: (assetDatas, { asc }) => [asc(assetDatas.nomorAssets)],
  })
}

export type assetLeaseAssetOptionType = Awaited<
  ReturnType<typeof assetLeaseAssetOptions>
>[0]
```

Assets may come from any LSA-company outlet; do not filter them to header outlet.

- [ ] **Step 4: Verify selector typing**

```bash
pnpm exec prettier --check "data/select.ts"
pnpm typecheck
```

Expected: customer options expose `outletId`; asset options expose individual asset ID/number and asset-code metadata.

---

### Task 4: Add List and Detail Data Loaders

**Files:**
- Create: `data/asset-lease.ts`

**Interfaces:**
- Produces:
  - `assetLeaseIndex(currentPage: number, size: number, query?: string)`
  - `assetLeaseShow(rentId: string)`
  - `assetLeaseIndexType`
  - `assetLeaseShowType`

- [ ] **Step 1: Implement list loader with outlet-name-only search**

Create server-only module. Core query shape:

```ts
import "server-only"

import { db } from "@/drizzle/db"
import { outlets, rentAssets } from "@/drizzle/schema"
import { requirePermission } from "@/lib/auth/permission"
import { isSuperAdmin } from "@/lib/auth/permission-query"
import { paginatedResponse, paginationParams } from "@/lib/helper"
import { and, count, eq, ilike, inArray } from "drizzle-orm"
import { notFound } from "next/navigation"
import { requireUser } from "./require-user"

export async function assetLeaseIndex(
  currentPage: number,
  size: number,
  query?: string
) {
  const user = await requireUser()
  await requirePermission("asset-lease:browse")

  const pagination = paginationParams(currentPage, size)
  const search = query?.trim()
  const superAdmin = await isSuperAdmin(user.id)
  const conditions = []

  if (!superAdmin) {
    conditions.push(eq(rentAssets.createdBy, user.id))
  }

  if (search) {
    conditions.push(
      inArray(
        rentAssets.outletId,
        db
          .select({ id: outlets.id })
          .from(outlets)
          .where(ilike(outlets.name, `%${search}%`))
      )
    )
  }

  const where = conditions.length ? and(...conditions) : undefined
  const [data, [{ count: total }]] = await Promise.all([
    db.query.rentAssets.findMany({
      where,
      with: {
        outlet: {
          columns: { name: true },
        },
      },
      orderBy: (rentAssets, { desc }) => [desc(rentAssets.createdAt)],
      limit: pagination.pageSize,
      offset: pagination.offset,
    }),
    db.select({ count: count() }).from(rentAssets).where(where),
  ])

  return paginatedResponse(data, total, pagination)
}
```

Rows and count must use identical `where`.

- [ ] **Step 2: Implement detail loader with ownership enforcement**

Append:

```ts
export async function assetLeaseShow(rentId: string) {
  const user = await requireUser()
  await requirePermission("asset-lease:read")

  const data = await db.query.rentAssets.findFirst({
    where: eq(rentAssets.id, rentId),
    with: {
      outlet: {
        columns: { id: true, name: true },
      },
      details: {
        orderBy: (details, { asc }) => [asc(details.createdAt)],
        with: {
          customer: {
            columns: { id: true, name: true },
          },
          asset: {
            columns: { id: true, nomorAssets: true },
            with: {
              poDetail: {
                with: {
                  prDetail: {
                    with: {
                      assetCode: {
                        columns: { code: true, name: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })

  if (!data) {
    notFound()
  }

  const superAdmin = await isSuperAdmin(user.id)
  if (!superAdmin && data.createdBy !== user.id) {
    notFound()
  }

  return data
}

export type assetLeaseIndexType = Awaited<
  ReturnType<typeof assetLeaseIndex>
>["data"][0]
export type assetLeaseShowType = Awaited<ReturnType<typeof assetLeaseShow>>
```

- [ ] **Step 3: Verify loader typing**

```bash
pnpm exec prettier --check "data/asset-lease.ts"
pnpm typecheck
```

Expected: nested outlet/detail/customer/asset relation types resolve; direct access to another user's lease returns 404 for non-Super Administrator.

---

### Task 5: Add Race-Safe Create Action

**Files:**
- Create: `app/(dashboard)/distribution/asset-lease/action.ts`

**Interfaces:**
- Consumes: `assetLeaseSchemaType`.
- Produces: `assetLeaseStore(values)` returning `{ success: boolean; message: string }`.

- [ ] **Step 1: Implement permission and server validation**

Start action with:

```ts
"use server"

import { db } from "@/drizzle/db"
import {
  assetDatas,
  branches,
  companies,
  customers,
  outlets,
  rentAssetDetails,
  rentAssets,
} from "@/drizzle/schema"
import { authorizeAction } from "@/lib/auth/permission"
import {
  assetLeaseSchema,
  type assetLeaseSchemaType,
} from "@/lib/formSchemas/asset-lease-schema"
import { and, eq, inArray } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { requireUser } from "@/data/require-user"
```

Inside `assetLeaseStore`, call `requireUser()`, `authorizeAction("asset-lease:create")`, then `assetLeaseSchema.safeParse(values)`. Return `Invalid form data` on validation failure.

- [ ] **Step 2: Add concurrency-safe monthly Rent No generator**

Reuse purchase request/order advisory-lock pattern. Add helper inside `action.ts`:

```ts
async function generateRentNumber(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  createdAt = new Date()
) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
  })
  const parts = Object.fromEntries(
    formatter
      .formatToParts(createdAt)
      .filter((part) => part.type === "year" || part.type === "month")
      .map((part) => [part.type, part.value])
  )
  const prefix = `SWA/${parts.year}/${parts.month}/`

  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${prefix}))`)

  const [last] = await tx
    .select({ rentNo: rentAssets.rentNo })
    .from(rentAssets)
    .where(ilike(rentAssets.rentNo, `${prefix}%`))
    .orderBy(desc(rentAssets.rentNo))
    .limit(1)

  const lastSequence = Number(last?.rentNo.split("/").pop() ?? 0)
  const sequence = String(lastSequence + 1).padStart(5, "0")

  return `${prefix}${sequence}`
}
```

Import `desc`, `ilike`, and `sql` from `drizzle-orm`. Advisory transaction lock serializes generation per monthly prefix; unique DB index remains final invariant.

- [ ] **Step 3: Validate outlet, customer ownership, and atomically claim assets**

Inside one `db.transaction`:

1. Query active header outlet by `id` and `isActive = true`; throw `Outlet not found or inactive` if absent.
2. Deduplicate selected customer IDs. Query `customers.id/outletId`; require returned count to match and every `outletId === header.outletId`; otherwise throw `Every customer must belong to selected outlet`.
3. Build LSA outlet subquery:

```ts
const lsaOutletIds = tx
  .select({ id: outlets.id })
  .from(outlets)
  .innerJoin(branches, eq(outlets.branchId, branches.id))
  .innerJoin(companies, eq(branches.companyId, companies.id))
  .where(eq(companies.code, "LSA"))
```

4. Claim unique selected assets with one conditional update:

```ts
const claimedAssets = await tx
  .update(assetDatas)
  .set({ status: "DISEWA", updatedBy: user.id })
  .where(
    and(
      inArray(assetDatas.id, assetIds),
      eq(assetDatas.status, "TERSEDIA"),
      inArray(assetDatas.outletId, lsaOutletIds)
    )
  )
  .returning({ id: assetDatas.id })

if (claimedAssets.length !== assetIds.length) {
  throw new Error("One or more selected assets are no longer available")
}
```

PostgreSQL rechecks update predicates after concurrent row locks; only one of two competing requests can claim same asset. Do not replace this with pre-check-only logic.

- [ ] **Step 4: Insert numbered header and details in same transaction**

Generate Rent No after transaction validations and before header insert:

```ts
const rentNo = await generateRentNumber(tx)
const [rentAsset] = await tx
  .insert(rentAssets)
  .values({
    rentNo,
    outletId: data.outletId,
    note: data.note?.trim() || null,
    status: "NEW",
    createdBy: user.id,
  })
  .returning({ id: rentAssets.id })

await tx.insert(rentAssetDetails).values(
  data.details.map((detail) => ({
    rentAssetId: rentAsset.id,
    assetId: detail.assetId,
    customerId: detail.customerId,
    dateStart: detail.dateStart,
    dateEnd: detail.dateEnd || null,
    amount: detail.amount,
    createdBy: user.id,
  }))
)
```

Any failure must roll back asset statuses, header, and details.

After transaction:

```ts
revalidatePath("/distribution/asset-lease")
return { success: true, message: "Asset lease created successfully" }
```

Catch errors and return exact error message or `Something went wrong`.

- [ ] **Step 5: Verify action typing**

```bash
pnpm exec prettier --check "app/(dashboard)/distribution/asset-lease/action.ts"
pnpm typecheck
```

Expected: one transaction owns all mutation; no insert can survive failed asset claim or validation.

---

### Task 6: Build Functional List

**Files:**
- Create: `app/(dashboard)/distribution/asset-lease/column.tsx`
- Modify: `app/(dashboard)/distribution/asset-lease/page.tsx`

**Interfaces:**
- Consumes: `assetLeaseIndex()` and `assetLeaseIndexType`.
- Produces: searchable/paginated list with working New/View navigation.

- [ ] **Step 1: Create exact six columns**

Create client column module:

```tsx
"use client"

import { buttonVariants } from "@/components/ui/button"
import type { assetLeaseIndexType } from "@/data/asset-lease"
import type { ColumnDef } from "@tanstack/react-table"
import { Eye } from "lucide-react"
import Link from "next/link"

const createdAtFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Jakarta",
})

export const columns: ColumnDef<assetLeaseIndexType>[] = [
  {
    header: "Rent No",
    accessorKey: "rentNo",
  },
  {
    header: "Outlet",
    accessorFn: (row) => row.outlet?.name ?? "-",
  },
  {
    header: "Note",
    accessorKey: "note",
    cell: ({ row }) => row.original.note ?? "-",
  },
  { header: "Status", accessorKey: "status" },
  {
    header: "Created At",
    accessorKey: "createdAt",
    cell: ({ row }) => createdAtFormatter.format(row.original.createdAt),
  },
  {
    header: "Action",
    cell: ({ row }) => (
      <Link
        className={buttonVariants({ variant: "link", size: "sm" })}
        href={`/distribution/asset-lease/${row.original.id}`}
      >
        <Eye data-icon="inline-start" />
        View
      </Link>
    ),
  },
]
```

- [ ] **Step 2: Fill list page using existing shared stack**

Follow `received-asset/page.tsx`: parse `page`, `size`, and `q` with `getSearchParam`; render title `Asset Lease`; Add New link to `/distribution/asset-lease/new`; shared `SearchBox`; keyed `Suspense`; `DataTableSkeleton columns={6}`; `DataTable` using `assetLeaseIndex` result.

- [ ] **Step 3: Verify list route**

```bash
pnpm exec prettier --check "app/(dashboard)/distribution/asset-lease/page.tsx" "app/(dashboard)/distribution/asset-lease/column.tsx"
pnpm typecheck
pnpm lint
```

Expected: exact columns, no Customer column, working New/View URLs, outlet-name search only.

---

### Task 7: Build Multi-Row Create Form

**Files:**
- Create: `app/(dashboard)/distribution/asset-lease/new/page.tsx`
- Create: `app/(dashboard)/distribution/asset-lease/_components/AssetLeaseForm.tsx`
- Create: `app/(dashboard)/distribution/asset-lease/_components/AssetLeaseDetailSection.tsx`

**Interfaces:**
- Consumes: `outletOptions()`, `assetLeaseCustomerOptions()`, `assetLeaseAssetOptions()`, `assetLeaseSchema`, and `assetLeaseStore()`.
- Produces: functional `/distribution/asset-lease/new` route.

- [ ] **Step 1: Add permission-gated new page**

Use Card + Suspense + `FormSkeleton`. Async inner renderer must:

```ts
await requirePermission("asset-lease:create")
const [outlets, customers, assets] = await Promise.all([
  outletOptions(),
  assetLeaseCustomerOptions(),
  assetLeaseAssetOptions(),
])
```

Pass results to `AssetLeaseForm`. Title: `Create Asset Lease`.

- [ ] **Step 2: Add form orchestration**

`AssetLeaseForm.tsx` must:

- Use `useForm<assetLeaseSchemaType>({ resolver: zodResolver(assetLeaseSchema) })`.
- Default header: `outletId: ""`, `note: ""`.
- Default one detail: blank asset/customer, `dateStart` today (`new Date().toISOString().split("T")[0]`), blank `dateEnd`, amount `0`.
- Use `useFieldArray({ name: "details", keyName: "fieldId" })`.
- Map outlets to `{ value: id, label: name }`.
- Map assets to label `${nomorAssets} - ${assetCode.code} - ${assetCode.name}`, with missing metadata falling back cleanly.
- Watch selected outlet and filter customer options where `customer.outletId === selectedOutletId`.
- On outlet change, clear every detail `customerId` before validation. Do not clear asset selections because assets may come from any LSA outlet.
- Append blank detail from `Add Detail`.
- Prevent removing final row.
- Submit through `assetLeaseStore`; toast result; on success `router.push("/distribution/asset-lease")` and `router.refresh()`.
- Use existing `Field`, `FieldError`, `SearchableSelect`, `Input`, `Button`, and `LoadingSwap`.

- [ ] **Step 3: Add focused detail-row component**

`AssetLeaseDetailSection.tsx` receives row index, form control/errors, asset items, filtered customer items, remove callback, and `canRemove`. Render:

1. Asset `SearchableSelect`.
2. Customer `SearchableSelect`, disabled until outlet selected.
3. Start date native `<Input type="date">`.
4. Optional end date native `<Input type="date">`.
5. Amount using installed `NumericFormat` with integer numeric value.
6. Trash button disabled when only one row remains.
7. Row-level `FieldError` for duplicate asset, dates, customer, and amount.

No edit-mode branches.

- [ ] **Step 4: Verify create route**

```bash
pnpm exec prettier --check "app/(dashboard)/distribution/asset-lease/new/page.tsx" "app/(dashboard)/distribution/asset-lease/_components/AssetLeaseForm.tsx" "app/(dashboard)/distribution/asset-lease/_components/AssetLeaseDetailSection.tsx"
pnpm typecheck
pnpm lint
```

Expected: multiple rows compile; changing outlet clears stale customers; assets remain selected; validation errors render per row.

---

### Task 8: Build Read-Only Detail Page

**Files:**
- Create: `app/(dashboard)/distribution/asset-lease/[rentId]/page.tsx`

**Interfaces:**
- Consumes: `assetLeaseShow(rentId)`.
- Produces: functional lease detail route.

- [ ] **Step 1: Render header and detail table**

Follow purchase-order detail structure:

- Await `params: Promise<{ rentId: string }>`.
- Call `assetLeaseShow(rentId)`.
- Back link to `/distribution/asset-lease`.
- Header cards: Rent No, Outlet, Note, Status, Created At.
- Detail table, exact columns: Asset, Customer, Date Start, Date End, Amount.
- Asset label: asset number plus code/name when present.
- Customer: `detail.customer?.name ?? "-"`.
- Date end: `detail.dateEnd ?? "-"`.
- Amount: `(detail.amount ?? 0).toLocaleString("id-ID")`.
- Created At: `Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" })`.
- Empty details row with `colSpan={5}` and `No lease details.`.

Do not show header customer.

- [ ] **Step 2: Verify detail route**

```bash
pnpm exec prettier --check "app/(dashboard)/distribution/asset-lease/[rentId]/page.tsx"
pnpm typecheck
pnpm lint
```

Expected: all details render in creation order; unauthorized ownership and missing IDs return 404 through loader.

---

### Task 9: Generate and Inspect Additive Migration

**Files:**
- Generate: new `drizzle/migrations/*.sql`
- Generate: matching `drizzle/migrations/meta/*_snapshot.json`
- Generator modifies: `drizzle/migrations/meta/_journal.json`

**Interfaces:** Produces initial lease tables only if schema history is safe.

- [ ] **Step 1: Run generator**

```bash
pnpm db:generate --name asset_lease
```

Expected clean migration creates:

- `rent_assets` with unique `rent_no`, `outlet_id -> outlets.id`, and unique index `rent_assets_rent_no_unique`.
- `rent_asset_details` with lease, asset, and customer FKs.
- `rent_photo_assets` as currently declared.

**Mandatory stop condition:** If Drizzle asks whether `asset_datas` was created/renamed from `receive_assets`, abort. If output changes anything outside distribution tables, stop and report migration blocked by known schema drift. Do not choose rename/create, edit snapshot manually, or broaden scope.

- [ ] **Step 2: Inspect generated artifacts fully**

Accept only:

- Three distribution table creates.
- Their expected foreign keys.
- One new snapshot and journal entry.

Reject unrelated `DROP`, `RENAME`, recreation, or `ALTER TABLE` involving existing asset/network/transaction tables.

Do not run `pnpm db:migrate` without separate authorization for target DB.

---

### Task 10: Verify End to End and Review

**Files:** All touched files.

- [ ] **Step 1: Run full static verification**

```bash
pnpm typecheck
pnpm lint
pnpm build
```

Expected: no new failures. If baseline already fails, report exact unchanged baseline failure separately from touched-file status.

- [ ] **Step 2: Inspect final diff scope**

```bash
git status --short
git diff -- "drizzle/schema.ts" "drizzle/schemas/distribution.ts" "data/select.ts" "data/asset-lease.ts" "lib/formSchemas/asset-lease-schema.ts" "app/(dashboard)/distribution/asset-lease" "drizzle/migrations"
```

Expected: only planned task files plus pre-existing user changes; no overwritten unrelated work.

- [ ] **Step 3: Run controlled DB/browser checks**

1. User without browse/create/read permission reaches `/unauthorized` for corresponding route/action.
2. Non-Super Administrator cannot list or open another user's lease.
3. List shows exact six columns, displays monthly `SWA/YYYY/MM/00001` Rent No, and searches only outlet name.
4. New and View links resolve.
5. Create supports multiple rows.
6. Customer list follows header outlet; forged cross-outlet customer fails server validation.
7. Asset list includes only `TERSEDIA` assets whose outlet company code is exactly `LSA`.
8. Duplicate asset payload fails with no writes.
9. Non-LSA or unavailable asset payload fails with no writes.
10. Two concurrent creates for same asset yield one success and one failure.
11. First lease in a Jakarta calendar month gets `SWA/YYYY/MM/00001`; later leases increment to `00002`; next month resets to `00001`.
12. Concurrent creates receive distinct Rent No values because generation holds monthly advisory transaction lock.
13. Successful create writes one numbered `NEW` header, all details, and updates every asset to `DISEWA`.
14. Detail page shows Rent No and outlet header; customer appears only in detail rows.

- [ ] **Step 4: Run mandatory reviewers**

Use `ecc:code-reviewer`, `ecc:typescript-reviewer`, and `ecc:react-reviewer` on touched files. Apply only verified in-scope fixes, then rerun static checks.

---

## Completion Conditions

- List, New, and View routes work.
- Header outlet FK references `outlets.id`; customers remain per detail.
- Header stores unique monthly Rent No in `SWA/YYYY/MM/00001` format.
- Server action enforces customer-outlet and LSA-asset invariants.
- Asset claiming is atomic and race-safe.
- Migration status reported plainly: additive migration generated, or generation blocked by `asset_datas`/`receive_assets` drift.
- No DB migration applied and no commit created without explicit authorization.
