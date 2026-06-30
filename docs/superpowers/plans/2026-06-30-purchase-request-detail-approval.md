# Purchase Request Detail Approval Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a read-only purchase request detail page from List Purchase Request, with approve/reject status actions and approved-only purchase order selection.

**Architecture:** The detail page is a server component that reuses `purchaseRequestShow(id)` for auth, permission, ownership, and data loading. A small client component owns Approve/Reject buttons and calls server actions from the existing purchase request action module. Purchase order selectors and purchase order server validation both switch from `REQUEST` PRs to `APPROVED` PRs.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict mode, Drizzle ORM, PostgreSQL, Better Auth permissions, shadcn-style UI primitives, Sonner toasts.

## Global Constraints

- Run all commands from the isolated worktree that contains the target app files.
- If `app/(dashboard)/asset-transaction/list-purchase-request/page.tsx` is missing, stop before implementation and ask user to move/copy the uncommitted app files into this worktree.
- Do not commit or push unless user explicitly asks; use diff checkpoints instead.
- Add no dependencies.
- Status strings are exactly `REQUEST`, `APPROVED`, and `REJECTED`.
- Approve/reject permission is existing `purchase-request:update`.
- Detail route is `/asset-transaction/list-purchase-request/[prId]`.
- Approve/reject controls live on detail page only.
- Purchase order creation and purchase order payload validation must accept only `APPROVED` purchase requests.
- Project has no configured test runner; use `pnpm typecheck`, `pnpm lint`, and manual browser sanity checks.

---

## File Structure

- Modify `data/purchase-request.ts`
  - Extend `purchaseRequestShow(id)` to load specification names through `prSpecifications.spec`.
- Modify `app/(dashboard)/asset-transaction/purchase-request/action.ts`
  - Add `purchaseRequestApprove(id: string)` and `purchaseRequestReject(id: string)` server actions.
- Create `app/(dashboard)/asset-transaction/list-purchase-request/_components/PurchaseRequestStatusActions.tsx`
  - Client-only approve/reject buttons, pending state, toast feedback, route refresh.
- Replace `app/(dashboard)/asset-transaction/list-purchase-request/[prId]/page.tsx`
  - Server-rendered PR detail page, read-only header and item table.
- Modify `app/(dashboard)/asset-transaction/list-purchase-request/column.tsx`
  - Change action column to always link to detail page with `View`.
- Modify `data/select.ts`
  - Use `APPROVED` PR status for PO header and detail option sources.
- Modify `app/(dashboard)/asset-transaction/purchase-order/action.ts`
  - Enforce `APPROVED` PR status in PO server-side payload validation.

---

### Task 0: Preflight Target Files

**Files:**
- Read: `app/(dashboard)/asset-transaction/list-purchase-request/page.tsx`
- Read: `app/(dashboard)/asset-transaction/list-purchase-request/column.tsx`
- Read: `app/(dashboard)/asset-transaction/purchase-request/action.ts`
- Read: `data/purchase-request.ts`
- Read: `data/select.ts`
- Read: `app/(dashboard)/asset-transaction/purchase-order/action.ts`

**Interfaces:**
- Consumes: current worktree file tree.
- Produces: verified implementation base containing target app files.

- [ ] **Step 1: Verify target files exist**

Run:

```bash
test -f 'app/(dashboard)/asset-transaction/list-purchase-request/page.tsx' \
  && test -f 'app/(dashboard)/asset-transaction/list-purchase-request/column.tsx' \
  && test -f 'app/(dashboard)/asset-transaction/purchase-request/action.ts' \
  && test -f 'data/purchase-request.ts' \
  && test -f 'data/select.ts' \
  && test -f 'app/(dashboard)/asset-transaction/purchase-order/action.ts'
```

Expected: exit code `0`.

- [ ] **Step 2: Stop if files are missing**

If Step 1 exits non-zero, stop and report exactly:

```text
Target app files are missing from this isolated worktree. Need user to move/copy uncommitted app files into this worktree before implementation.
```

Do not recreate missing app modules from scratch.

- [ ] **Step 3: Record working tree state**

Run:

```bash
git status --short
```

Expected: output includes existing uncommitted project files and no unexplained generated files from this task.

---

### Task 1: Extend PR Show Data and Add Status Server Actions

**Files:**
- Modify: `data/purchase-request.ts:115-125`
- Modify: `app/(dashboard)/asset-transaction/purchase-request/action.ts:1-436`

**Interfaces:**
- Consumes: `purchaseRequestShow(id: string)` existing data loader.
- Produces: `purchaseRequestShow(id)` returns detail specifications with `spec.name`.
- Produces: `purchaseRequestApprove(id: string): Promise<{ success: boolean; message: string }>`.
- Produces: `purchaseRequestReject(id: string): Promise<{ success: boolean; message: string }>`.

- [ ] **Step 1: Update PR show specification relation**

In `data/purchase-request.ts`, replace this code inside `purchaseRequestShow(id)`:

```ts
          specifications: true,
```

with:

```ts
          specifications: {
            with: {
              spec: {
                columns: {
                  name: true,
                },
              },
            },
          },
```

- [ ] **Step 2: Add cache revalidation import**

In `app/(dashboard)/asset-transaction/purchase-request/action.ts`, add this import after existing imports:

```ts
import { revalidatePath } from "next/cache"
```

- [ ] **Step 3: Add shared status update helper and exported actions**

In `app/(dashboard)/asset-transaction/purchase-request/action.ts`, insert this code after `validateDetailSpecifications` and before `purchaseRequestStore`:

```ts
type PurchaseRequestDecisionStatus = "APPROVED" | "REJECTED"

async function updatePurchaseRequestStatus(
  id: string,
  status: PurchaseRequestDecisionStatus
) {
  const user = await requireUser()

  try {
    const permission = await authorizeAction("purchase-request:update")

    if (!permission.authorized) {
      return permission.response
    }

    const existing = await db.query.purchaseRequests.findFirst({
      where: eq(purchaseRequests.id, id),
      columns: { id: true, status: true },
    })

    if (!existing) {
      return {
        success: false,
        message: "Purchase request not found",
      }
    }

    if (existing.status !== "REQUEST") {
      return {
        success: false,
        message:
          "Only purchase requests with status 'REQUEST' can be approved or rejected.",
      }
    }

    await db
      .update(purchaseRequests)
      .set({
        status,
        updatedBy: user.id,
      })
      .where(eq(purchaseRequests.id, id))

    revalidatePath("/asset-transaction/list-purchase-request")
    revalidatePath(`/asset-transaction/list-purchase-request/${id}`)

    return {
      success: true,
      message:
        status === "APPROVED"
          ? "Purchase request approved successfully"
          : "Purchase request rejected successfully",
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Something went wrong",
    }
  }
}

export async function purchaseRequestApprove(id: string) {
  return updatePurchaseRequestStatus(id, "APPROVED")
}

export async function purchaseRequestReject(id: string) {
  return updatePurchaseRequestStatus(id, "REJECTED")
}
```

- [ ] **Step 4: Verify TypeScript after server changes**

Run:

```bash
pnpm typecheck
```

Expected: exit code `0`. If unrelated pre-existing TypeScript errors appear, copy exact errors into checkpoint notes before continuing.

- [ ] **Step 5: Diff checkpoint**

Run:

```bash
git diff -- data/purchase-request.ts 'app/(dashboard)/asset-transaction/purchase-request/action.ts'
```

Expected: diff only adds spec-name relation loading, `revalidatePath` import, and approve/reject status actions.

---

### Task 2: Build Detail Page and Approve/Reject Client Buttons

**Files:**
- Create: `app/(dashboard)/asset-transaction/list-purchase-request/_components/PurchaseRequestStatusActions.tsx`
- Replace: `app/(dashboard)/asset-transaction/list-purchase-request/[prId]/page.tsx`

**Interfaces:**
- Consumes: `purchaseRequestShow(id: string)` with `details[].specifications[].spec.name`.
- Consumes: `purchaseRequestApprove(id: string)` and `purchaseRequestReject(id: string)` from `../../purchase-request/action`.
- Produces: detail route `/asset-transaction/list-purchase-request/[prId]`.
- Produces: client component `PurchaseRequestStatusActions({ id, status }: { id: string; status: string })`.

- [ ] **Step 1: Create client status action component**

Create `app/(dashboard)/asset-transaction/list-purchase-request/_components/PurchaseRequestStatusActions.tsx` with exactly:

```tsx
"use client"

import { Button } from "@/components/ui/button"
import { Check, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { toast } from "sonner"
import {
  purchaseRequestApprove,
  purchaseRequestReject,
} from "../../purchase-request/action"

type StatusAction = (id: string) => Promise<{
  success: boolean
  message: string
}>

interface PurchaseRequestStatusActionsProps {
  id: string
  status: string
}

export default function PurchaseRequestStatusActions({
  id,
  status,
}: PurchaseRequestStatusActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  if (status !== "REQUEST") {
    return null
  }

  function runAction(action: StatusAction) {
    startTransition(async () => {
      const result = await action(id)

      if (result.success) {
        toast.success(result.message)
        router.refresh()
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        size="sm"
        onClick={() => runAction(purchaseRequestApprove)}
        disabled={isPending}
      >
        <Check data-icon="inline-start" />
        Approve
      </Button>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        onClick={() => runAction(purchaseRequestReject)}
        disabled={isPending}
      >
        <X data-icon="inline-start" />
        Reject
      </Button>
    </div>
  )
}
```

- [ ] **Step 2: Replace detail route page**

Replace `app/(dashboard)/asset-transaction/list-purchase-request/[prId]/page.tsx` with exactly:

```tsx
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { purchaseRequestShow } from "@/data/purchase-request"
import Link from "next/link"
import PurchaseRequestStatusActions from "../_components/PurchaseRequestStatusActions"

type Params = Promise<{ prId: string }>
type PurchaseRequestDetail = Awaited<
  ReturnType<typeof purchaseRequestShow>
>["details"][number]

function formatCurrency(value: number | null | undefined) {
  return (value ?? 0).toLocaleString("id-ID")
}

function formatText(value: string | null | undefined) {
  return value?.trim() ? value : "-"
}

function formatAssetCode(detail: PurchaseRequestDetail) {
  return detail.assetCode
    ? `${detail.assetCode.code} - ${detail.assetCode.name}`
    : "-"
}

function formatSpecifications(
  specifications: PurchaseRequestDetail["specifications"]
) {
  if (!specifications.length) {
    return "-"
  }

  return specifications
    .map((specification) => {
      const name = specification.spec?.name ?? "-"
      const value = specification.specValue ?? "-"

      return `${name}: ${value}`
    })
    .join(", ")
}

function InfoItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-muted-foreground text-sm">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  )
}

export default async function PrDetailPage({ params }: { params: Params }) {
  const { prId } = await params
  const data = await purchaseRequestShow(prId)

  return (
    <Card>
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-2xl">Purchase Request Detail</CardTitle>
            <p className="text-muted-foreground text-sm">
              {formatText(data.description)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/asset-transaction/list-purchase-request"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Back
            </Link>
            <PurchaseRequestStatusActions id={data.id} status={data.status} />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <InfoItem label="Date" value={data.date} />
          <InfoItem label="Company" value={data.company?.code ?? "-"} />
          <InfoItem label="Category" value={data.assetCategory?.name ?? "-"} />
          <InfoItem label="Status" value={data.status} />
          <InfoItem label="Description" value={formatText(data.description)} />
          <InfoItem label="Total Qty" value={data.totalQuantity ?? 0} />
          <InfoItem label="Total Amount" value={formatCurrency(data.totalAmount)} />
        </div>

        <div>
          <h3 className="mb-3 font-semibold">Asset Details</h3>
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset Code</TableHead>
                  <TableHead>Specifications</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.details.length ? (
                  data.details.map((detail) => (
                    <TableRow key={detail.id}>
                      <TableCell className="font-medium">
                        {formatAssetCode(detail)}
                      </TableCell>
                      <TableCell className="max-w-[360px]">
                        {formatSpecifications(detail.specifications)}
                      </TableCell>
                      <TableCell className="text-right">
                        {detail.quantity ?? 0}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(detail.price)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(detail.total)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No asset details.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 3: Verify TypeScript after detail UI**

Run:

```bash
pnpm typecheck
```

Expected: exit code `0`. If `PurchaseRequestDetail["specifications"]` lacks `spec`, re-check Task 1 Step 1 and regenerate type inference by rerunning the command.

- [ ] **Step 4: Diff checkpoint**

Run:

```bash
git diff -- 'app/(dashboard)/asset-transaction/list-purchase-request/_components/PurchaseRequestStatusActions.tsx' 'app/(dashboard)/asset-transaction/list-purchase-request/[prId]/page.tsx'
```

Expected: diff creates one client action component and replaces stub page with read-only detail UI.

---

### Task 3: Change List Action to View Detail

**Files:**
- Modify: `app/(dashboard)/asset-transaction/list-purchase-request/column.tsx:1-58`

**Interfaces:**
- Consumes: route `/asset-transaction/list-purchase-request/[prId]` from Task 2.
- Produces: list action link text `View` and href `/asset-transaction/list-purchase-request/${row.original.id}`.

- [ ] **Step 1: Replace icon import**

In `app/(dashboard)/asset-transaction/list-purchase-request/column.tsx`, replace:

```ts
import { ClipboardEdit } from "lucide-react"
```

with:

```ts
import { Eye } from "lucide-react"
```

- [ ] **Step 2: Replace action cell**

In the `Action` column, replace the whole `cell` function with:

```tsx
    cell: ({ row }) => {
      return (
        <Link
          className={buttonVariants({ variant: "link", size: "sm" })}
          href={`/asset-transaction/list-purchase-request/${row.original.id}`}
        >
          <Eye data-icon="inline-start" />
          View
        </Link>
      )
    },
```

- [ ] **Step 3: Verify TypeScript after list link change**

Run:

```bash
pnpm typecheck
```

Expected: exit code `0`.

- [ ] **Step 4: Diff checkpoint**

Run:

```bash
git diff -- 'app/(dashboard)/asset-transaction/list-purchase-request/column.tsx'
```

Expected: diff removes `REQUEST` status guard from list action and points every row to detail page.

---

### Task 4: Switch Purchase Order Flow to Approved PRs

**Files:**
- Modify: `data/select.ts:335-436`
- Modify: `app/(dashboard)/asset-transaction/purchase-order/action.ts:36-48`

**Interfaces:**
- Consumes: PR status values set by `purchaseRequestApprove` and `purchaseRequestReject`.
- Produces: PO selection and PO payload validation accept `APPROVED` PRs only.

- [ ] **Step 1: Update PR options status filter**

In `data/select.ts`, replace:

```ts
  const conditions = [eq(purchaseRequests.status, "REQUEST")]
```

with:

```ts
  const conditions = [eq(purchaseRequests.status, "APPROVED")]
```

- [ ] **Step 2: Update PR detail options status filter**

In `data/select.ts`, replace:

```ts
      if (dtl.purchaseRequest.status !== "REQUEST") {
        return false
      }
```

with:

```ts
      if (dtl.purchaseRequest.status !== "APPROVED") {
        return false
      }
```

- [ ] **Step 3: Update PO payload validation status check**

In `app/(dashboard)/asset-transaction/purchase-order/action.ts`, replace:

```ts
  if (pr.status !== "REQUEST") {
    return { success: false, message: "Selected purchase request status must be REQUEST" }
  }
```

with:

```ts
  if (pr.status !== "APPROVED") {
    return {
      success: false,
      message: "Selected purchase request status must be APPROVED",
    }
  }
```

- [ ] **Step 4: Verify TypeScript after PO flow change**

Run:

```bash
pnpm typecheck
```

Expected: exit code `0`.

- [ ] **Step 5: Diff checkpoint**

Run:

```bash
git diff -- data/select.ts 'app/(dashboard)/asset-transaction/purchase-order/action.ts'
```

Expected: diff changes PR status requirements from `REQUEST` to `APPROVED` for PO option sources and server validation.

---

### Task 5: Final Verification

**Files:**
- Verify: all files changed in Tasks 1-4.

**Interfaces:**
- Consumes: complete feature from Tasks 1-4.
- Produces: verified working tree ready for user review.

- [ ] **Step 1: Run full typecheck**

Run:

```bash
pnpm typecheck
```

Expected: exit code `0`.

- [ ] **Step 2: Run lint**

Run:

```bash
pnpm lint
```

Expected: exit code `0`.

- [ ] **Step 3: Run production build if typecheck and lint passed**

Run:

```bash
pnpm build
```

Expected: exit code `0`.

- [ ] **Step 4: Manual browser sanity checks**

Run dev server:

```bash
pnpm dev
```

Open app and verify:

```text
1. /asset-transaction/list-purchase-request shows View action on each row.
2. View opens /asset-transaction/list-purchase-request/[prId].
3. Detail page shows Date, Company, Category, Description, Total Qty, Total Amount, Status.
4. Detail table shows Asset Code, Specifications, Qty, Price, Total.
5. REQUEST PR shows Approve and Reject buttons.
6. Approve changes status to APPROVED, shows success toast, hides buttons after refresh.
7. APPROVED PR appears in purchase order PR selection.
8. Reject changes status to REJECTED, shows success toast, hides buttons after refresh.
9. REJECTED PR does not appear in purchase order PR selection.
10. Calling approve/reject again on non-REQUEST PR returns error toast.
```

- [ ] **Step 5: Final diff review**

Run:

```bash
git diff --stat
git diff -- data/purchase-request.ts data/select.ts 'app/(dashboard)/asset-transaction/purchase-request/action.ts' 'app/(dashboard)/asset-transaction/list-purchase-request/column.tsx' 'app/(dashboard)/asset-transaction/list-purchase-request/[prId]/page.tsx' 'app/(dashboard)/asset-transaction/list-purchase-request/_components/PurchaseRequestStatusActions.tsx' 'app/(dashboard)/asset-transaction/purchase-order/action.ts'
```

Expected:

```text
Changed files match Tasks 1-4 only.
No dependency changes.
No generated files.
No commits unless user explicitly requested one.
```

---

## Plan Self-Review

- Spec coverage: route/navigation covered by Task 2 and Task 3; detail content covered by Task 2; status actions covered by Task 1 and Task 2; data changes covered by Task 1; PO flow covered by Task 4; error handling/race safety covered by Task 1 and Task 2; verification covered by Task 5.
- Placeholder scan: no `TBD`, `TODO`, `implement later`, or vague edge-case instructions remain.
- Type consistency: produced functions are `purchaseRequestApprove(id: string)` and `purchaseRequestReject(id: string)`; client imports those exact names; detail route consumes `purchaseRequestShow(id)` and spec relation `spec.name` added in Task 1.
