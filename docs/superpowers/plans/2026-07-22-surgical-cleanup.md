# Surgical Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove confirmed dead code, dependencies, duplicated helpers, and inert UI plumbing without changing runtime behavior.

**Architecture:** Make targeted deletions and substitutions in existing modules. Reuse `lib/helper.ts` for URL parameter normalization and `lib/auth/permission-query.ts` for super-admin lookup; add no new abstraction or dependency.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, pnpm 11, TanStack Table 8, Drizzle ORM, PostgreSQL, ESLint 9.

## Global Constraints

- Preserve all unrelated tracked and untracked user work.
- Read every target immediately before editing.
- Never use `git reset`, `git clean`, `git checkout`, `git restore`, broad file replacement, broad staging, or `pnpm format`.
- Do not stage or commit unless user asks.
- Remove only direct dependencies `react-select` and `tsx`; regenerate lockfile with pnpm.
- Preserve validation, DB queries, permissions, ownership checks, uploads, PDFs, themes, routes, visible navigation, and async loading UX.
- Shared `isSuperAdmin` must retain active `roleUser` assignment and exact role name `Super Administrator`.
- Keep TanStack core row model, manual pagination, URL query behavior, and rendered rows.
- Keep every async `Suspense` boundary; remove only seven approved synchronous form boundaries.
- Remove `PaginationMeta.current_page`, `per_page`, `next_page_url`, and `prev_page_url`; keep `last_page`, `from`, `to`, and `total`.
- Remove only mono-font setup from root layout. Preserve all other layout content.
- Delete fully unused breadcrumb file; do not prune other generated shadcn component APIs.
- No generic list-page shell. No test framework addition.

---

### Task 1: Capture Dirty-Tree Baseline

**Files:**
- Inspect: repository root and every later task target

**Interfaces:**
- Consumes: current dirty working tree.
- Produces: baseline only; no file changes.

- [ ] **Step 1: Record repository state**

```powershell
git status --short
git branch --show-current
git diff --name-only
git diff --cached --name-only
```

Expected: non-empty dirty tree; current branch unchanged; staged baseline recorded.

- [ ] **Step 2: Inspect dirty high-risk targets**

```powershell
git diff -- "app/layout.tsx" "data/select.ts" "data/purchase-request.ts" "package.json" "pnpm-lock.yaml" "app/(dashboard)/asset-transaction/purchase-order/action.ts"
```

Expected: existing user hunks visible and preserved.

---

### Task 2: Delete Dead Files and Exports

**Files:**
- Delete: `components/ui/breadcrumb.tsx`
- Delete: `lib/debug/memory.ts`
- Delete: `components/.gitkeep`
- Delete: `hooks/.gitkeep`
- Delete: `lib/.gitkeep`
- Delete: `public/.gitkeep`
- Modify: `data/select.ts`
- Modify: `data/received-asset.ts`
- Modify: `lib/formSchemas/role-schema.ts`
- Modify: `lib/formSchemas/purchase-request-schema.ts`
- Modify: `lib/formSchemas/received-asset-schema.ts`
- Modify: `app/layout.tsx`

**Interfaces:**
- Consumes: current active loaders and Zod schemas.
- Produces: same active runtime API, minus declaration-only symbols.

- [ ] **Step 1: Prove symbols remain unused**

```powershell
rg -n "\b(assetCodeSearchOptions|customerOptions|customerOptionType|permissionActions|purchaseRequestRejectSchemaType|receivedAssetSchemaType|receivedAssetShowType)\b" app components data lib
```

Expected: each symbol appears only at declaration. Stop specific deletion if consumer exists.

- [ ] **Step 2: Delete exact dead files**

```text
components/ui/breadcrumb.tsx
lib/debug/memory.ts
components/.gitkeep
hooks/.gitkeep
lib/.gitkeep
public/.gitkeep
```

Expected: populated parent directories remain.

- [ ] **Step 3: Remove dead option APIs**

Delete complete existing declarations from `data/select.ts`:

```ts
export async function assetCodeSearchOptions(query: string, limit = 20) {
  // Delete complete current declaration.
}

export async function customerOptions() {
  // Delete complete current declaration.
}

export type customerOptionType = Awaited<ReturnType<typeof customerOptions>>[0]
```

Remove imports made unused by these deletions only. Preserve `purchaseRequestOptions(id?)`, `purchaseRequestDetailOptions(currentPurchaseOrderId?)`, dynamic-table validation, quantity calculations, and every active option loader.

- [ ] **Step 4: Remove declaration-only schema exports**

Delete `permissionActions` from `lib/formSchemas/role-schema.ts`.

In `lib/formSchemas/purchase-request-schema.ts`, retain nested schemas but remove their `export` keywords:

```ts
const prSpecificationInputSchema = z.object({
  id: z.uuid().optional(),
  specId: z.uuid(),
  specValue: z.string(),
})

const prDetailInputSchema = z.object({
  id: z.uuid().optional(),
  assetCodeId: z.uuid(),
  price: z.number().min(0),
  quantity: z.number().min(1),
  specifications: z.array(prSpecificationInputSchema),
})
```

Delete `purchaseRequestRejectSchemaType`; keep `purchaseRequestRejectSchema`.

Delete `receivedAssetSchemaType` from `lib/formSchemas/received-asset-schema.ts` and `receivedAssetShowType` from `data/received-asset.ts`. Keep active schemas and used types.

- [ ] **Step 5: Remove mono-font setup only**

In `app/layout.tsx`, change font import to:

```ts
import { Roboto } from "next/font/google"
```

Delete `fontMono` declaration and remove `fontMono.variable` from `<html>` classes. Keep Roboto, metadata, `ThemeProvider`, `Toaster`, body structure, hydration suppression, and all other content unchanged.

- [ ] **Step 6: Verify task**

```powershell
rg -n "\b(assetCodeSearchOptions|customerOptions|customerOptionType|permissionActions|purchaseRequestRejectSchemaType|receivedAssetSchemaType|receivedAssetShowType|Geist_Mono|fontMono)\b" app components data lib
pnpm typecheck
pnpm exec eslint "data/select.ts" "data/received-asset.ts" "lib/formSchemas/role-schema.ts" "lib/formSchemas/purchase-request-schema.ts" "lib/formSchemas/received-asset-schema.ts" "app/layout.tsx"
git diff --check
```

Expected: first command no output; remaining commands exit `0`.

---

### Task 3: Remove Two Direct Dependencies

**Files:**
- Modify: `package.json`
- Regenerate: `pnpm-lock.yaml`

**Interfaces:**
- Produces: manifest without direct `react-select` and `tsx`; consistent pnpm lockfile.

- [ ] **Step 1: Confirm no direct usage**

```powershell
rg -n 'from ["'']react-select["'']|require\(["'']react-select["'']\)|from ["'']tsx["'']|require\(["'']tsx["'']\)' app components data drizzle hooks lib
```

Expected: no output.

- [ ] **Step 2: Remove exact manifest entries**

Remove:

```json
"react-select": "^5.10.2",
"tsx": "^4.22.4",
```

Keep all other scripts and dependencies unchanged.

- [ ] **Step 3: Regenerate and verify lockfile**

```powershell
pnpm install --lockfile-only
pnpm install --frozen-lockfile
pnpm list react-select tsx --depth 0
git diff -- "package.json" "pnpm-lock.yaml"
```

Expected: installs exit `0`; neither package remains direct; lockfile generated through pnpm. Transitive `tsx` may remain.

---

### Task 4: Centralize Search-Parameter Normalization

**Files:**
- Modify: `lib/helper.ts`
- Modify exact 19 pages:
  - `app/(dashboard)/setup-aplikasi/{module,menu,role,user}/page.tsx`
  - `app/(dashboard)/network/{company,branch,outlet}/page.tsx`
  - `app/(dashboard)/asset/{category,bank,brand,supplier,code,specification,processor,ram}/page.tsx`
  - `app/(dashboard)/asset-transaction/{purchase-request,list-purchase-request,purchase-order,received-asset}/page.tsx`

**Interfaces:**
- Produces: `SearchParamValue` and `getSearchParam(value): string | undefined` from `lib/helper.ts`.
- Preserves: first-array-element semantics and all feature-specific page shells.

- [ ] **Step 1: Add shared helper**

```ts
export type SearchParamValue = string | string[] | undefined

export function getSearchParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value
}
```

- [ ] **Step 2: Update exact 19 pages**

Add:

```ts
import { getSearchParam, type SearchParamValue } from "@/lib/helper"
```

Delete each local duplicate type and function. Do not change loaders, headings, buttons, defaults, `RenderTable`, `SearchBox`, keys, or `Suspense`.

- [ ] **Step 3: Verify consolidation**

```powershell
rg -n "^type SearchParamValue|^function getSearchParam" "app/(dashboard)" -g "page.tsx"
(rg -l 'getSearchParam, type SearchParamValue' "app/(dashboard)" -g "page.tsx" | Measure-Object -Line).Lines
pnpm typecheck
pnpm exec eslint "lib/helper.ts" "app/(dashboard)/**/*.tsx"
```

Expected: first command no output; count `19`; checks exit `0`.

---

### Task 5: Centralize `isSuperAdmin`

**Files:**
- Modify: `lib/auth/permission-query.ts`
- Modify: `data/purchase-request.ts`
- Modify: `data/purchase-order.ts`
- Modify: `data/received-asset.ts`
- Modify: `app/(dashboard)/asset-transaction/purchase-order/action.ts`
- Modify: `app/(dashboard)/asset-transaction/received-asset/action.ts`

**Interfaces:**
- Produces: `isSuperAdmin(userId: string): Promise<boolean>`.
- Security invariant: active assignment and exact role-name equality.

- [ ] **Step 1: Add shared query**

Add without changing `getUserPermissionNames`:

```ts
export async function isSuperAdmin(userId: string) {
  const userRoles = await db.query.roleUser.findMany({
    where: and(eq(roleUser.userId, userId), eq(roleUser.isActive, true)),
    with: {
      role: true,
    },
  })

  return userRoles.some(
    (userRole) => userRole.role.name === "Super Administrator"
  )
}
```

- [ ] **Step 2: Replace five local helpers**

Import shared helper in all five callers:

```ts
import { isSuperAdmin } from "@/lib/auth/permission-query"
```

Delete local helper. Remove `roleUser` and Drizzle operators made unused by local deletion only. Keep every call, ownership condition, `notFound()`, and action error unchanged.

- [ ] **Step 3: Verify semantics and call count**

```powershell
rg -n "async function isSuperAdmin|roleUser\.isActive|Super Administrator|import \{ isSuperAdmin \}" "lib/auth/permission-query.ts" "data/purchase-request.ts" "data/purchase-order.ts" "data/received-asset.ts" "app/(dashboard)/asset-transaction/purchase-order/action.ts" "app/(dashboard)/asset-transaction/received-asset/action.ts"
pnpm typecheck
pnpm exec eslint "lib/auth/permission-query.ts" "data/purchase-request.ts" "data/purchase-order.ts" "data/received-asset.ts" "app/(dashboard)/asset-transaction/purchase-order/action.ts" "app/(dashboard)/asset-transaction/received-asset/action.ts"
```

Expected: one declaration, one active predicate, one exact role comparison, five imports, checks exit `0`.

---

### Task 6: Remove Inert TanStack State and Pagination Fields

**Files:**
- Modify: `components/ui/data-table.tsx`
- Modify: `components/data-table-pagination.tsx`
- Modify: `lib/helper.ts`

**Interfaces:**
- Produces: `PaginationMeta` with `from`, `last_page`, `to`, `total` only.
- Preserves: core rows, manual pagination, URL updates, page count, row count, and table JSX.

- [ ] **Step 1: Shrink pagination metadata**

```ts
export interface PaginationMeta {
  from: number
  last_page: number
  to: number
  total: number
}
```

Return:

```ts
return {
  from: safeTotal === 0 ? 0 : pagination.offset + 1,
  last_page: lastPage,
  to: Math.min(pagination.offset + safeItemCount, safeTotal),
  total: safeTotal,
}
```

Do not alter sanitization or last-page calculation.

- [ ] **Step 2: Remove unused table state**

Keep TanStack imports:

```ts
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"
```

Delete `useState`, sorting/filter/visibility/selection types, state declarations, handlers, and row models. Use `PaginationMeta` directly instead of exported `metaProps`. Remove selection-only `data-state={row.getIsSelected() && "selected"}`.

Keep final configuration:

```ts
getCoreRowModel: getCoreRowModel(),
onPaginationChange: (updater) => {
  const currentPagination = { pageIndex, pageSize }
  const newPagination =
    typeof updater === "function" ? updater(currentPagination) : updater
  createPageURL(newPagination.pageIndex + 1, newPagination.pageSize)
},
manualPagination: true,
pageCount: meta?.last_page,
rowCount: data.length,
state: {
  pagination: { pageIndex, pageSize },
},
```

- [ ] **Step 3: Update pagination component type**

Replace `metaProps` import with:

```ts
import type { PaginationMeta } from "@/lib/helper"
```

Use `meta?: PaginationMeta`.

- [ ] **Step 4: Verify task**

```powershell
rg -n "ColumnFiltersState|SortingState|VisibilityState|getFilteredRowModel|getSortedRowModel|setRowSelection|metaProps|current_page|per_page|next_page_url|prev_page_url" components lib
rg -n "getCoreRowModel|onPaginationChange|manualPagination|pageCount|rowCount|createPageURL" "components/ui/data-table.tsx"
pnpm typecheck
pnpm exec eslint "components/ui/data-table.tsx" "components/data-table-pagination.tsx" "lib/helper.ts"
```

Expected: first command no output; retained identifiers appear; checks exit `0`.

---

### Task 7: Remove Seven No-op `Suspense` Boundaries

**Files:**
- Modify: `app/(dashboard)/network/company/new/page.tsx`
- Modify: `app/(dashboard)/asset/{category,brand,bank,processor,ram}/new/page.tsx`
- Modify: `app/(dashboard)/setup-aplikasi/module/new/page.tsx`

**Interfaces:**
- Produces: direct synchronous form rendering.
- Preserves: every async `RenderForm` boundary elsewhere.

- [ ] **Step 1: Replace seven boundaries**

Delete `Suspense` and `FormSkeleton` imports. Replace each:

```tsx
<Suspense fallback={<FormSkeleton />}>
  <FormComponent />
</Suspense>
```

with its existing component:

```tsx
<FormComponent />
```

Exact components: `CompanyForm`, `AssetCategoryForm`, `AssetBrandForm`, `BankForm`, `ProcessorForm`, `RamForm`, `ModuleForm`.

- [ ] **Step 2: Verify task**

```powershell
rg -n "FormSkeleton|Suspense" "app/(dashboard)/network/company/new/page.tsx" "app/(dashboard)/asset/category/new/page.tsx" "app/(dashboard)/asset/brand/new/page.tsx" "app/(dashboard)/asset/bank/new/page.tsx" "app/(dashboard)/asset/processor/new/page.tsx" "app/(dashboard)/asset/ram/new/page.tsx" "app/(dashboard)/setup-aplikasi/module/new/page.tsx"
pnpm typecheck
pnpm exec eslint "app/(dashboard)/network/company/new/page.tsx" "app/(dashboard)/asset/category/new/page.tsx" "app/(dashboard)/asset/brand/new/page.tsx" "app/(dashboard)/asset/bank/new/page.tsx" "app/(dashboard)/asset/processor/new/page.tsx" "app/(dashboard)/asset/ram/new/page.tsx" "app/(dashboard)/setup-aplikasi/module/new/page.tsx"
```

Expected: first command no output; checks exit `0`.

---

### Task 8: Replace 34 Literal `cn` Calls

**Files:**
- Modify all files returned by exact pre-check below; expected set is 34 approved dashboard page files.

**Interfaces:**
- Produces identical `text-2xl` class without unused helper imports.

- [ ] **Step 1: Confirm exact target count**

```powershell
(rg -l 'className=\{cn\("text-2xl"\)\}' app -g "*.tsx" | Measure-Object -Line).Lines
```

Expected: `34`. Stop if count differs and inspect changed set.

- [ ] **Step 2: Apply exact substitution**

In each returned file replace:

```tsx
className={cn("text-2xl")}
```

with:

```tsx
className="text-2xl"
```

Remove `import { cn } from "@/lib/utils"` only when no other `cn` call remains.

- [ ] **Step 3: Verify task**

```powershell
rg -n 'className=\{cn\("text-2xl"\)\}' app -g "*.tsx"
pnpm typecheck
pnpm exec eslint "app/(dashboard)/**/*.tsx"
```

Expected: first command no output; checks exit `0`.

---

### Task 9: Mandatory Reviews and Final Verification

**Files:**
- Review: every changed target
- Compare: `docs/superpowers/specs/2026-07-22-surgical-cleanup-design.md`

**Interfaces:**
- Produces: verified cleanup with no unresolved in-scope finding.

- [ ] **Step 1: Run TypeScript review**

Dispatch `ecc:typescript-reviewer`. Require review of shared helper types, `PaginationMeta` consumers, TanStack generics, deleted exports, and imports.

- [ ] **Step 2: Run React review**

Dispatch `ecc:react-reviewer`. Require review of exactly seven `Suspense` removals, retained async boundaries, DataTable behavior, static class rendering, and root layout preservation.

- [ ] **Step 3: Run general review**

Dispatch `ecc:code-reviewer`. Require approved scope only, no active API deletion, no broad formatting, no user-work overwrite, and no behavior change.

- [ ] **Step 4: Run security review**

Dispatch `ecc:security-reviewer` over shared `isSuperAdmin` and five callers. Verify active assignment, exact role name, unchanged ownership branches, unchanged `notFound()`/action errors, and no cross-user cache.

- [ ] **Step 5: Run final checks**

```powershell
pnpm install --lockfile-only
pnpm typecheck
pnpm lint
git diff --check
pnpm install --frozen-lockfile
```

Expected: every command exits `0`.

- [ ] **Step 6: Run build when required environment exists**

Required variables: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `MEKARI_API_BASE_URL`, `MEKARI_API_CLIENT_ID`, `MEKARI_API_CLIENT_SECRET`, `FONNTE_TOKEN`.

```powershell
pnpm build
```

Expected: exit `0`. If variables are absent, report build skipped with missing names; never claim pass.

- [ ] **Step 7: Confirm invariants and dirty-tree safety**

```powershell
rg -n "\b(assetCodeSearchOptions|customerOptions|customerOptionType|permissionActions|purchaseRequestRejectSchemaType|receivedAssetSchemaType|receivedAssetShowType|metaProps|current_page|per_page|next_page_url|prev_page_url)\b" app components data lib
rg -n "ColumnFiltersState|SortingState|VisibilityState|getFilteredRowModel|getSortedRowModel|setRowSelection" "components/ui/data-table.tsx"
rg -n 'className=\{cn\("text-2xl"\)\}' app -g "*.tsx"
git status --short
git diff --cached --name-only
```

Expected: first three commands no output; staged baseline unchanged; unrelated dirty files preserved.

- [ ] **Step 8: Report truthfully**

Report each command result, four reviewer outcomes, applied review fixes, build result or blocker, and remaining unrelated dirty files. Do not stage or commit.
