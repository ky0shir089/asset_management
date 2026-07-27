# Received Asset Quantity and File Warning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Receive multiple physical assets in one submission, require separate photo uploads for each asset, and enforce a 1 MB maximum per uploaded photo.

**Architecture:** Keep one `receive_assets` row per physical asset. Client renders one photo upload group per requested asset quantity. Server validates grouped files, locks the selected PO detail, creates sequential asset rows in one transaction, then saves each group of photos and QR code against its matching receive asset.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict mode, shadcn-style UI primitives, Zod, Drizzle ORM, PostgreSQL, Sonner toasts.

## Global Constraints

- Do not add a test runner; repository currently has no `test` script.
- Verify with `pnpm typecheck`, `pnpm lint`, and manual app flow.
- Do not run `git commit` unless the user explicitly asks.
- If user asks for a commit, include `Co-Authored-By: Claude <noreply@anthropic.com>` in the commit message body.
- One `receive_assets` row represents one physical asset.
- Remaining quantity derives from counting `receive_assets` rows per PO detail.
- Allowed upload MIME types stay exactly `image/jpeg`, `image/png`, and `image/webp`.
- Max upload size is exactly `1 * 1024 * 1024` bytes per photo.
- Client must show a toast when a selected photo exceeds 1 MB.
- Client must block submit while any selected photo exceeds 1 MB.
- Server must reject oversized photos even if client validation is bypassed.

---

## File Structure

- Modify `lib/formSchemas/received-asset-schema.ts`  
  Owns non-file form validation. Add `receivedQuantity` as a coerced positive integer.

- Modify `lib/local-upload.ts`  
  Owns physical file writes and final server-side upload safety. Export shared server constants for the 1 MB limit and update `savePhotos()` error message.

- Modify `app/(dashboard)/asset-transaction/received-asset/_components/ReceivedAssetForm.tsx`  
  Owns UI state, quantity input, per-asset photo upload groups, toast on oversized file selection, client submit blocking, and grouped `FormData` keys.

- Modify `app/(dashboard)/asset-transaction/received-asset/action.ts`  
  Owns server action validation, ownership checks, remaining quantity checks, transaction insert of multiple asset rows, per-asset photo saving, QR generation, and response message.

---

### Task 1: Schema and Upload Limit Constants

**Files:**
- Modify: `lib/formSchemas/received-asset-schema.ts:3-13`
- Modify: `lib/local-upload.ts:13-50`

**Interfaces:**
- Consumes: existing `receivedAssetSchema.safeParse(raw)` from `receivedAssetStore()`.
- Produces: `receivedAssetSchema` data with `receivedQuantity: number`.
- Produces: `MAX_PHOTO_FILE_SIZE_BYTES` and `MAX_PHOTO_FILE_SIZE_MB` exported from `lib/local-upload.ts` for server action reuse.

- [ ] **Step 1: Update received asset schema**

Replace `lib/formSchemas/received-asset-schema.ts` with:

```ts
import z from "zod"

export const receivedAssetSchema = z.object({
  poId: z.string().uuid(),
  poDetailId: z.string().uuid(),
  outletId: z.string().uuid(),
  condition: z.enum([
    "BARU dan BAIK",
    "BARU dan RUSAK",
    "BEKAS dan BAIK",
    "BEKAS dan RUSAK",
  ]),
  receivedQuantity: z.coerce
    .number()
    .int("Received quantity must be a whole number")
    .min(1, "Received quantity must be at least 1"),
})

export type receivedAssetSchemaType = z.infer<typeof receivedAssetSchema>
```

- [ ] **Step 2: Update upload size constants**

In `lib/local-upload.ts`, replace:

```ts
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
```

with:

```ts
export const MAX_PHOTO_FILE_SIZE_MB = 1
export const MAX_PHOTO_FILE_SIZE_BYTES = MAX_PHOTO_FILE_SIZE_MB * 1024 * 1024
```

Then replace:

```ts
      if (file.size > MAX_FILE_SIZE) {
        throw new Error(
          `File "${file.name}" exceeds 5 MB limit`
        )
      }
```

with:

```ts
      if (file.size > MAX_PHOTO_FILE_SIZE_BYTES) {
        throw new Error(
          `File "${file.name}" exceeds ${MAX_PHOTO_FILE_SIZE_MB} MB limit`
        )
      }
```

- [ ] **Step 3: Run typecheck for validation constants**

Run:

```bash
pnpm typecheck
```

Expected: command exits 0. If it fails because later tasks are not done, record exact TypeScript errors before continuing.

- [ ] **Step 4: Checkpoint**

Do not commit. If user explicitly asks to commit this task, run:

```bash
git add lib/formSchemas/received-asset-schema.ts lib/local-upload.ts
git commit -m "feat: add received asset quantity validation" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: Client Quantity Input and Per-Asset Photo Groups

**Files:**
- Modify: `app/(dashboard)/asset-transaction/received-asset/_components/ReceivedAssetForm.tsx:3-344`

**Interfaces:**
- Consumes: `selectedPoDetail.remainingQuantity` from `purchaseOrderDetailOptionForReceiveType`.
- Produces: `FormData` keys `receivedQuantity`, `photos-0`, `photos-1`, through `photos-(receivedQuantity - 1)`.
- Produces: client-side toast for first oversized photo in a changed group.

- [ ] **Step 1: Extend field imports**

Replace the field import at top of `ReceivedAssetForm.tsx`:

```ts
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
```

with:

```ts
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
```

- [ ] **Step 2: Add constants and photo group type**

After imports and before `interface ReceivedAssetFormProps`, add:

```ts
const MAX_PHOTO_FILE_SIZE_MB = 1
const MAX_PHOTO_FILE_SIZE_BYTES = MAX_PHOTO_FILE_SIZE_MB * 1024 * 1024

interface PhotoGroup {
  files: File[]
  oversizedFileNames: string[]
}

function createEmptyPhotoGroups(count: number): PhotoGroup[] {
  return Array.from({ length: count }, () => ({
    files: [],
    oversizedFileNames: [],
  }))
}
```

- [ ] **Step 3: Replace selected file state**

Replace:

```ts
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null)
```

with:

```ts
  const [receivedQuantity, setReceivedQuantity] = useState(1)
  const [photoGroups, setPhotoGroups] = useState<PhotoGroup[]>(
    createEmptyPhotoGroups(1)
  )
```

- [ ] **Step 4: Add derived photo validation values**

After:

```ts
  const selectedSpecifications = selectedPoDetail?.specifications ?? []
```

add:

```ts
  const maxReceivableQuantity = selectedPoDetail?.remainingQuantity ?? 1
  const hasOversizedFiles = photoGroups.some(
    (group) => group.oversizedFileNames.length > 0
  )
```

- [ ] **Step 5: Reset quantity and photos when PO changes**

Replace `handlePurchaseOrderChange` with:

```ts
  function handlePurchaseOrderChange(value: string) {
    setSelectedPoId(value)
    setSelectedPoDetailId("")
    setSelectedOutletId("")
    setReceivedQuantity(1)
    setPhotoGroups(createEmptyPhotoGroups(1))
  }
```

Replace `handlePoDetailChange` with:

```ts
  function handlePoDetailChange(value: string) {
    setSelectedPoDetailId(value)
    setSelectedOutletId("")
    setReceivedQuantity(1)
    setPhotoGroups(createEmptyPhotoGroups(1))
  }
```

- [ ] **Step 6: Replace file change handler with quantity and grouped file handlers**

Replace:

```ts
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSelectedFiles(e.target.files)
  }
```

with:

```ts
  function handleReceivedQuantityChange(e: React.ChangeEvent<HTMLInputElement>) {
    const parsedValue = Number(e.target.value)
    const nextQuantity = Number.isFinite(parsedValue)
      ? Math.min(Math.max(Math.trunc(parsedValue), 1), maxReceivableQuantity)
      : 1

    setReceivedQuantity(nextQuantity)
    setPhotoGroups((current) =>
      Array.from(
        { length: nextQuantity },
        (_, index) =>
          current[index] ?? { files: [], oversizedFileNames: [] }
      )
    )
  }

  function handleFileChange(
    groupIndex: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const files = Array.from(e.target.files ?? [])
    const oversizedFileNames = files
      .filter((file) => file.size > MAX_PHOTO_FILE_SIZE_BYTES)
      .map((file) => file.name)

    if (oversizedFileNames.length > 0) {
      toast.error(
        `File "${oversizedFileNames[0]}" exceeds ${MAX_PHOTO_FILE_SIZE_MB} MB limit`
      )
    }

    setPhotoGroups((current) =>
      current.map((group, index) =>
        index === groupIndex
          ? { files, oversizedFileNames }
          : group
      )
    )
  }
```

- [ ] **Step 7: Update submit validation and grouped FormData**

In `handleSubmit`, after outlet validation and before creating `FormData`, replace the existing selected-files block:

```ts
    if (!selectedFiles || !Array.from(selectedFiles).some((file) => file.size > 0)) {
      toast.error("Please upload at least one asset photo")
      return
    }
```

with:

```ts
    if (!Number.isInteger(receivedQuantity) || receivedQuantity < 1) {
      toast.error("Received quantity must be at least 1")
      return
    }
    if (receivedQuantity > maxReceivableQuantity) {
      toast.error(`Only ${maxReceivableQuantity} asset(s) remaining`)
      return
    }

    const missingPhotoGroupIndex = photoGroups.findIndex(
      (group) => group.files.length < 1
    )
    if (missingPhotoGroupIndex >= 0) {
      toast.error(
        `Please upload at least one asset photo for asset ${missingPhotoGroupIndex + 1}`
      )
      return
    }

    if (hasOversizedFiles) {
      toast.error(`Replace photos over ${MAX_PHOTO_FILE_SIZE_MB} MB before submitting`)
      return
    }
```

Then after:

```ts
    formData.set("condition", condition)
```

add:

```ts
    formData.set("receivedQuantity", String(receivedQuantity))
```

Replace:

```ts
    if (selectedFiles) {
      for (let i = 0; i < selectedFiles.length; i++) {
        formData.append("photos", selectedFiles[i])
      }
    }
```

with:

```ts
    photoGroups.forEach((group, groupIndex) => {
      for (const file of group.files) {
        formData.append(`photos-${groupIndex}`, file)
      }
    })
```

- [ ] **Step 8: Add received quantity input to receive info grid**

In the `Receive Asset Info` grid, after the `Condition` field, add:

```tsx
            <Field>
              <FieldLabel htmlFor="receivedQuantity">Received Quantity</FieldLabel>
              <Input
                id="receivedQuantity"
                name="receivedQuantity"
                type="number"
                min={1}
                max={maxReceivableQuantity}
                value={receivedQuantity}
                onChange={handleReceivedQuantityChange}
                disabled={!selectedPoDetail}
                required
              />
              <FieldDescription>
                Maximum receivable: {selectedPoDetail ? maxReceivableQuantity : 0}
              </FieldDescription>
            </Field>
```

- [ ] **Step 9: Replace Photos section with per-asset groups**

Replace the whole Photos section from:

```tsx
      {/* Photos */}
      <div className="rounded-lg border p-4">
        <h3 className="mb-4 font-semibold">Photos</h3>
        <Field>
          <FieldLabel htmlFor="photos">Asset Photos</FieldLabel>
          <Input
            id="photos"
            name="photos"
            type="file"
            multiple
            required
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
          />
          <p className="text-sm text-muted-foreground">
            Upload at least one asset photo before receiving.
          </p>
        </Field>

        {selectedFiles && selectedFiles.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {Array.from(selectedFiles).map((file, i) => (
              <div key={i} className="group relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  className="h-24 w-full rounded border object-cover"
                />
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {file.name}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
```

with:

```tsx
      {/* Photos */}
      <div className="rounded-lg border p-4">
        <h3 className="mb-4 font-semibold">Photos</h3>
        {selectedPoDetail ? (
          <div className="grid gap-4">
            {photoGroups.map((group, groupIndex) => (
              <div
                key={`${selectedPoDetailId}-${groupIndex}`}
                className="rounded-md border p-3"
              >
                <Field>
                  <FieldLabel htmlFor={`photos-${groupIndex}`}>
                    Asset {groupIndex + 1} Photos
                  </FieldLabel>
                  <Input
                    id={`photos-${groupIndex}`}
                    name={`photos-${groupIndex}`}
                    type="file"
                    multiple
                    required
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => handleFileChange(groupIndex, e)}
                  />
                  <FieldDescription>
                    Upload at least one photo for this asset. Max {MAX_PHOTO_FILE_SIZE_MB} MB per file.
                  </FieldDescription>
                  {group.oversizedFileNames.length > 0 && (
                    <FieldError>
                      Files over {MAX_PHOTO_FILE_SIZE_MB} MB: {group.oversizedFileNames.join(", ")}
                    </FieldError>
                  )}
                </Field>

                {group.files.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                    {group.files.map((file, fileIndex) => (
                      <div key={`${file.name}-${fileIndex}`} className="group relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          className="h-24 w-full rounded border object-cover"
                        />
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {file.name}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Select a PO line before uploading asset photos.
          </p>
        )}
      </div>
```

- [ ] **Step 10: Disable submit while oversized files exist**

Replace:

```tsx
        <Button type="submit" disabled={isPending}>
```

with:

```tsx
        <Button type="submit" disabled={isPending || hasOversizedFiles}>
```

- [ ] **Step 11: Run client typecheck**

Run:

```bash
pnpm typecheck
```

Expected: command exits 0. If TypeScript reports a JSX line-wrap formatting issue only, run `pnpm format` after all code tasks finish instead of changing logic.

- [ ] **Step 12: Checkpoint**

Do not commit. If user explicitly asks to commit this task, run:

```bash
git add app/(dashboard)/asset-transaction/received-asset/_components/ReceivedAssetForm.tsx
git commit -m "feat: add received asset photo groups" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: Server Action Multiple Asset Creation

**Files:**
- Modify: `app/(dashboard)/asset-transaction/received-asset/action.ts:13-269`

**Interfaces:**
- Consumes: `receivedAssetSchema` data with `receivedQuantity: number`.
- Consumes: grouped file keys `photos-0`, `photos-1`, through `photos-(receivedQuantity - 1)`.
- Consumes: `MAX_PHOTO_FILE_SIZE_BYTES` and `MAX_PHOTO_FILE_SIZE_MB` from `lib/local-upload.ts`.
- Produces: one `receiveAssets` row per requested asset.
- Produces: `data.assets: { id: string; nomorAssets: string; qrCodePath: string | null }[]`.

- [ ] **Step 1: Update local-upload import**

Replace:

```ts
import { cleanupReceiveFiles, savePhotos, saveQRCode } from "@/lib/local-upload"
```

with:

```ts
import {
  MAX_PHOTO_FILE_SIZE_BYTES,
  MAX_PHOTO_FILE_SIZE_MB,
  cleanupReceiveFiles,
  savePhotos,
  saveQRCode,
} from "@/lib/local-upload"
```

- [ ] **Step 2: Add server helper types and grouped photo parser**

After `isSuperAdmin()` and before `receivedAssetStore()`, add:

```ts
const ALLOWED_PHOTO_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"]

type CreatedReceiveAsset = {
  id: string
  nomorAssets: string
}

function collectPhotoGroups(
  formData: FormData,
  receivedQuantity: number
): File[][] {
  const photoGroups: File[][] = []

  for (let index = 0; index < receivedQuantity; index++) {
    const files = formData
      .getAll(`photos-${index}`)
      .filter((entry): entry is File => entry instanceof File && entry.size > 0)

    if (files.length < 1) {
      throw new Error(
        `Please upload at least one asset photo for asset ${index + 1}`
      )
    }

    for (const file of files) {
      if (!ALLOWED_PHOTO_MIME_TYPES.includes(file.type)) {
        throw new Error(
          `Invalid file type "${file.type}". Allowed: image/jpeg, image/png, image/webp`
        )
      }
      if (file.size > MAX_PHOTO_FILE_SIZE_BYTES) {
        throw new Error(
          `File "${file.name}" exceeds ${MAX_PHOTO_FILE_SIZE_MB} MB limit`
        )
      }
    }

    photoGroups.push(files)
  }

  return photoGroups
}
```

- [ ] **Step 3: Include receivedQuantity in raw parse**

Replace:

```ts
    const raw = {
      poId: formData.get("poId"),
      poDetailId: formData.get("poDetailId"),
      outletId: formData.get("outletId"),
      condition: formData.get("condition"),
    }
```

with:

```ts
    const raw = {
      poId: formData.get("poId"),
      poDetailId: formData.get("poDetailId"),
      outletId: formData.get("outletId"),
      condition: formData.get("condition"),
      receivedQuantity: formData.get("receivedQuantity"),
    }
```

Replace:

```ts
    if (!validation.success) {
      return { success: false, message: "Invalid form data" }
    }

    const { poId, poDetailId, outletId, condition } = validation.data
```

with:

```ts
    if (!validation.success) {
      return {
        success: false,
        message: validation.error.issues[0]?.message ?? "Invalid form data",
      }
    }

    const { poId, poDetailId, outletId, condition, receivedQuantity } = validation.data
```

- [ ] **Step 4: Remove old ungrouped photo collection**

Delete this block:

```ts
    // --- Collect and validate photo files ---
    const photoFiles: File[] = []
    for (const entry of formData.getAll("photos")) {
      if (entry instanceof File && entry.size > 0) {
        photoFiles.push(entry)
      }
    }
    if (photoFiles.length < 1) {
      return { success: false, message: "Please upload at least one asset photo" }
    }
    for (const file of photoFiles) {
      const allowed = ["image/jpeg", "image/png", "image/webp"]
      if (!allowed.includes(file.type)) {
        return {
          success: false,
          message: `Invalid file type "${file.type}". Allowed: image/jpeg, image/png, image/webp`,
        }
      }
      if (file.size > 5 * 1024 * 1024) {
        return {
          success: false,
          message: `File "${file.name}" exceeds 5 MB limit`,
        }
      }
    }
```

- [ ] **Step 5: Add remaining quantity precheck before reading grouped files**

After outlet company match check and before asset-code snapshot, add:

```ts
    const [{ count: receivedCountBeforeLock }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(receiveAssets)
      .where(eq(receiveAssets.poDetailId, poDetailId))

    const remainingBeforeLock = Math.max(
      0,
      (pod.quantity ?? 0) - Number(receivedCountBeforeLock)
    )

    if (receivedQuantity > remainingBeforeLock) {
      return {
        success: false,
        message: `Only ${remainingBeforeLock} asset(s) remaining for this purchase order detail`,
      }
    }

    let photoGroups: File[][]
    try {
      photoGroups = collectPhotoGroups(formData, receivedQuantity)
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : "Invalid photo upload",
      }
    }
```

- [ ] **Step 6: Replace single asset transaction variables**

Replace:

```ts
    const receiveId = crypto.randomUUID()

    // --- Transaction: lock, check remaining, insert receive asset, allocate counter ---
    let generateNomorAssets = ""
    let qrPath: string | undefined
```

with:

```ts
    // --- Transaction: lock, check remaining, insert receive assets, allocate counters ---
    const createdAssets: CreatedReceiveAsset[] = []
    const qrPaths: Array<string | null> = []
```

- [ ] **Step 7: Replace transaction body with multi-row creation**

Inside `try { await db.transaction(async (tx) => { ... }) }`, replace current transaction callback body from lock through insert with:

```ts
        // 1. Lock PO detail
        const [lockedPod] = await tx
          .select({ id: poDetails.id, quantity: poDetails.quantity })
          .from(poDetails)
          .where(eq(poDetails.id, poDetailId))
          .for("update")

        if (!lockedPod) {
          throw new Error("Purchase order detail not found")
        }

        // 2. Count already received
        const [{ count: receivedCount }] = await tx
          .select({ count: sql<number>`count(*)` })
          .from(receiveAssets)
          .where(eq(receiveAssets.poDetailId, poDetailId))

        const orderedQty = lockedPod.quantity ?? 0
        const remainingQty = orderedQty - Number(receivedCount)
        if (remainingQty <= 0) {
          throw new Error("No remaining quantity available for this purchase order detail")
        }
        if (receivedQuantity > remainingQty) {
          throw new Error(
            `Only ${remainingQty} asset(s) remaining for this purchase order detail`
          )
        }

        // 3. Allocate nomor_assets sequence from last existing
        const now = new Date()
        const year = now.getFullYear()
        const month = now.getMonth() + 1
        const prefix = `${year}/${String(month).padStart(2, "0")}/${normalizeSlug(categoryName)}/${normalizeSlug(codeValue)}/`

        await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${prefix}))`)

        const lastMatch = await tx
          .select({ nomorAssets: receiveAssets.nomorAssets })
          .from(receiveAssets)
          .where(like(receiveAssets.nomorAssets, `${prefix}%`))
          .orderBy(sql`length(${receiveAssets.nomorAssets}) desc, ${receiveAssets.nomorAssets} desc`)
          .limit(1)

        const lastSeq = lastMatch.length > 0
          ? Number(lastMatch[0].nomorAssets.split("/").pop() ?? 0)
          : 0

        const assetsToCreate = Array.from(
          { length: receivedQuantity },
          (_, index) => ({
            id: crypto.randomUUID(),
            nomorAssets: `${prefix}${String(lastSeq + index + 1).padStart(5, "0")}`,
          })
        )

        // 4. Insert receive assets (no photo/QR data yet)
        await tx.insert(receiveAssets).values(
          assetsToCreate.map((asset) => ({
            id: asset.id,
            poDetailId,
            outletId,
            condition,
            status: "TERSEDIA",
            nomorAssets: asset.nomorAssets,
            createdBy: user.id,
          }))
        )

        createdAssets.push(...assetsToCreate)
```

- [ ] **Step 8: Replace post-transaction photo and QR handling**

Replace current post-transaction block:

```ts
      // --- Post-transaction: save photos & QR ---
      if (photoFiles.length > 0) {
        try {
          const savedPhotos = await savePhotos(receiveId, photoFiles)
          // Insert photo metadata rows
          if (savedPhotos.length > 0) {
            await db.insert(photoAssets).values(
              savedPhotos.map((p) => ({
                receiveId,
                name: p.name,
                path: p.path,
                createdBy: user.id,
              }))
            )
          }
        } catch {
          // Photo save failed — clean up files but keep receive asset
          await cleanupReceiveFiles(receiveId).catch(() => {})
        }
      }

      try {
        qrPath = await saveQRCode(receiveId, generateNomorAssets)
        await db
          .update(receiveAssets)
          .set({ qrCodePath: qrPath })
          .where(eq(receiveAssets.id, receiveId))
      } catch {
        // QR failure — asset exists, number is valid
        qrPath = undefined
      }
```

with:

```ts
      // --- Post-transaction: save photos & QR per created asset ---
      for (const [index, asset] of createdAssets.entries()) {
        try {
          const savedPhotos = await savePhotos(asset.id, photoGroups[index] ?? [])
          if (savedPhotos.length > 0) {
            await db.insert(photoAssets).values(
              savedPhotos.map((p) => ({
                receiveId: asset.id,
                name: p.name,
                path: p.path,
                createdBy: user.id,
              }))
            )
          }
        } catch {
          // Photo save failed — clean up files but keep receive asset
          await cleanupReceiveFiles(asset.id).catch(() => {})
        }

        try {
          const qrPath = await saveQRCode(asset.id, asset.nomorAssets)
          await db
            .update(receiveAssets)
            .set({ qrCodePath: qrPath })
            .where(eq(receiveAssets.id, asset.id))
          qrPaths[index] = qrPath
        } catch {
          // QR failure — asset exists, number is valid
          qrPaths[index] = null
        }
      }
```

- [ ] **Step 9: Update transaction failure cleanup**

Replace:

```ts
    } catch (err) {
      await cleanupReceiveFiles(receiveId).catch(() => {})
      return {
        success: false,
        message: err instanceof Error ? err.message : "Something went wrong",
      }
    }
```

with:

```ts
    } catch (err) {
      await Promise.all(
        createdAssets.map((asset) => cleanupReceiveFiles(asset.id).catch(() => {}))
      )
      return {
        success: false,
        message: err instanceof Error ? err.message : "Something went wrong",
      }
    }
```

- [ ] **Step 10: Update success response**

Replace:

```ts
    return {
      success: true,
      message: `Asset received successfully. Number: ${generateNomorAssets}`,
      data: {
        id: receiveId,
        nomorAssets: generateNomorAssets,
        qrCodePath: qrPath ?? null,
      },
    }
```

with:

```ts
    const firstAsset = createdAssets[0]
    const lastAsset = createdAssets[createdAssets.length - 1]
    const message = createdAssets.length === 1
      ? `Asset received successfully. Number: ${firstAsset.nomorAssets}`
      : `Assets received successfully. Count: ${createdAssets.length}. Numbers: ${firstAsset.nomorAssets} - ${lastAsset.nomorAssets}`

    return {
      success: true,
      message,
      data: {
        assets: createdAssets.map((asset, index) => ({
          id: asset.id,
          nomorAssets: asset.nomorAssets,
          qrCodePath: qrPaths[index] ?? null,
        })),
      },
    }
```

- [ ] **Step 11: Run server typecheck**

Run:

```bash
pnpm typecheck
```

Expected: command exits 0.

- [ ] **Step 12: Checkpoint**

Do not commit. If user explicitly asks to commit this task, run:

```bash
git add app/(dashboard)/asset-transaction/received-asset/action.ts
git commit -m "feat: create multiple received assets per submission" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: Format, Lint, and Manual Verification

**Files:**
- Verify: `app/(dashboard)/asset-transaction/received-asset/_components/ReceivedAssetForm.tsx`
- Verify: `app/(dashboard)/asset-transaction/received-asset/action.ts`
- Verify: `lib/formSchemas/received-asset-schema.ts`
- Verify: `lib/local-upload.ts`

**Interfaces:**
- Consumes: completed Tasks 1-3.
- Produces: verified working receive flow with multiple assets and 1 MB upload limit.

- [ ] **Step 1: Format changed TypeScript files**

Run:

```bash
pnpm format
```

Expected: Prettier formats changed `.ts` and `.tsx` files without errors.

- [ ] **Step 2: Run typecheck**

Run:

```bash
pnpm typecheck
```

Expected: command exits 0.

- [ ] **Step 3: Run lint**

Run:

```bash
pnpm lint
```

Expected: command exits 0. If repository has pre-existing lint failures outside changed files, capture exact output and identify changed-file status separately.

- [ ] **Step 4: Start app for manual verification**

Run:

```bash
pnpm dev
```

Expected: Next.js dev server starts and prints local URL, usually `http://localhost:3000`.

- [ ] **Step 5: Verify quantity-driven photo groups**

Manual browser flow:

1. Log in as a user with `received-asset:create` permission.
2. Go to `/asset-transaction/received-asset/new`.
3. Select a purchase order with a PO detail whose remaining quantity is at least `2`.
4. Select the PO detail and outlet.
5. Set `Received Quantity` to `2`.
6. Confirm `Asset 1 Photos` and `Asset 2 Photos` upload groups appear.
7. Upload one valid JPEG, PNG, or WebP under 1 MB in each group.
8. Submit.
9. Expected toast: success message with count `2` and generated asset number range.
10. Expected database/UI result: list page shows two newly received assets for the selected PO detail.

- [ ] **Step 6: Verify 1 MB client blocking**

Manual browser flow:

1. Return to `/asset-transaction/received-asset/new`.
2. Select a receivable PO detail.
3. Set `Received Quantity` to `1`.
4. Select an image file larger than `1 MB`.
5. Expected toast: `File "<name>" exceeds 1 MB limit`.
6. Expected inline error under upload group: `Files over 1 MB: <name>`.
7. Expected submit button disabled until the file is replaced.
8. Replace with an image under `1 MB`.
9. Expected inline error disappears and submit button enables.

- [ ] **Step 7: Verify server-side 1 MB rejection**

Manual server-action bypass check with browser devtools or a temporary request helper:

1. Submit form data containing `receivedQuantity=1` and `photos-0` with a file larger than `1 MB`.
2. Expected server response message: `File "<name>" exceeds 1 MB limit`.
3. Expected database result: no new `receive_assets` row for that failed request.

- [ ] **Step 8: Final checkpoint**

Do not commit. If user explicitly asks for one final commit, run:

```bash
git add lib/formSchemas/received-asset-schema.ts lib/local-upload.ts app/(dashboard)/asset-transaction/received-asset/_components/ReceivedAssetForm.tsx app/(dashboard)/asset-transaction/received-asset/action.ts docs/superpowers/specs/2026-07-06-received-asset-quantity-file-warning-design.md docs/superpowers/plans/2026-07-06-received-asset-quantity-file-warning.md
git commit -m "feat: receive multiple assets with per-asset photos" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Self-Review Notes

- Spec coverage: quantity input, max remaining, grouped photo uploads, per-group required photos, 1 MB toast, client block, server hard limit, multi-row transaction, sequential asset numbers, per-asset photos, per-asset QR, and manual verification all map to tasks above.
- Type names match across tasks: `receivedQuantity`, `photoGroups`, `photos-${index}`, `MAX_PHOTO_FILE_SIZE_BYTES`, `MAX_PHOTO_FILE_SIZE_MB`, `CreatedReceiveAsset`.
- Scope stays in existing form, schema, upload helper, and server action. No database schema change required.
