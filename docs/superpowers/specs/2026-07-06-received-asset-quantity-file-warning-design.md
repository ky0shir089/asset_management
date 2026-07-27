# Received Asset Quantity and Photo Limit Design

## Goal

Allow receiving multiple assets in one submission while keeping photos tied to each physical asset. Reduce upload size limit to 1 MB per photo and notify users immediately when selected photos exceed that limit.

## Current behavior

`ReceivedAssetForm` receives one PO detail at a time, uploads one shared `photos` file group, and calls `receivedAssetStore`. The server creates one `receive_assets` row, saves photos against that receive ID, generates one asset number, and creates one QR code. Remaining quantity is derived by counting `receive_assets` rows for the PO detail.

## Approved behavior

- Add `receivedQuantity` number input to the receive form.
- Input accepts integers from `1` to selected PO detail `remainingQuantity`.
- Changing purchase order or PO detail resets quantity to `1` and clears selected photo groups.
- Quantity `N` renders `N` photo upload groups:
  - `Asset 1 Photos`
  - `Asset 2 Photos`
  - continuing through `Asset N Photos`
- Each asset group requires at least one image.
- Each group may contain multiple images.
- Allowed image types stay `image/jpeg`, `image/png`, and `image/webp`.
- Max file size becomes `1 MB` per photo.
- When a user selects any photo over `1 MB`, the form shows a toast error immediately and displays an inline warning near the affected upload group.
- Submit is blocked while any selected photo exceeds `1 MB`.
- Server enforces the same `1 MB` hard limit.

## Data flow

Client sends:

- `poId`
- `poDetailId`
- `outletId`
- `condition`
- `receivedQuantity`
- grouped files as `photos-0`, `photos-1`, through `photos-(N - 1)`

Server parses `receivedQuantity`, validates form fields with Zod, then reads each photo group by index.

## Server rules

`receivedAssetStore` must validate:

- user has `received-asset:create`
- PO detail exists and belongs to submitted PO
- user owns purchase order unless Super Administrator
- outlet belongs to same company as purchase request
- `receivedQuantity` is an integer between `1` and current remaining quantity
- each asset index has at least one photo
- every photo has allowed MIME type
- every photo is `<= 1 MB`

Inside one transaction, server locks selected PO detail, recounts already received rows, confirms remaining quantity can cover requested quantity, allocates sequential asset numbers, and inserts one `receive_assets` row per requested asset.

After transaction, server saves each photo group against its matching receive asset ID and generates one QR code per receive asset.

## Asset numbering

Existing prefix format remains:

`YYYY/MM/CATEGORY/CODE/00001`

For one submission receiving N assets, sequence numbers must increment contiguously from current last sequence. Example: if last sequence is `00010` and quantity is `3`, created numbers are `00011`, `00012`, and `00013`.

## Error handling

- Client shows toast on oversized file selection.
- Client blocks submit with a clear toast if any group has no photos or any photo exceeds `1 MB`.
- Server returns specific messages for invalid quantity, missing photos, invalid file type, oversized file, no remaining quantity, and company/ownership mismatches.
- If photo or QR save fails after rows are created, server keeps created assets, cleans up any partial local files it can, and returns success with generated asset numbers. This preserves current behavior where file failures do not roll back already-created assets.

## UI placement

- `receivedQuantity` goes in the existing `Receive Asset Info` grid near `Condition`.
- Selected PO line summary stays unchanged.
- Photos section changes from one file input to generated per-asset upload groups.
- Each group displays selected image thumbnails and file names.
- Inline file-size warning appears under the affected group.

## Verification

- Select PO detail with remaining quantity above 1.
- Enter quantity 2.
- Confirm two photo upload groups appear.
- Select one valid image in each group.
- Submit and confirm two assets are created with separate asset numbers and QR codes.
- Select a file over 1 MB and confirm toast appears, inline warning appears, and submit is blocked.
- Confirm server rejects an oversized file even if client validation is bypassed.
