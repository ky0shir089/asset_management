# Asset Lease Index Totals

**Date:** 2026-07-29
**Status:** Approved design

## Goal

Show asset count and total lease amount for every row on `/distribution/asset-lease`.

## Data

Extend `assetLeaseIndex()` to load each lease detail's `id` and `amount`. Keep `assetLeaseIndexType` inferred from query result.

- `Total Asset` equals `details.length`.
- `Amount` equals sum of all `detail.amount` values.
- Lease without details shows `0` for both columns.

No schema, migration, or new dependency is needed.

## UI

Add columns after `Receive Date` and before `Status` in `app/(dashboard)/distribution/asset-lease/column.tsx`:

- `Total Asset`: centered integer.
- `Amount`: right-aligned integer formatted with `toLocaleString("id-ID")`.

Follow existing purchase order list formatting.

## Error Handling

Detail `amount` is non-null with DB default `0`. Sum still starts from `0`, so empty detail arrays render safely.

## Verification

Run:

- `pnpm typecheck`
- `pnpm lint`

No test file needed because rendering uses direct array length, native `reduce`, and existing locale formatting patterns.

## Success Criteria

- Every lease row shows correct detail count.
- Every lease row shows sum of detail amounts.
- Empty leases show `0`.
- Existing pagination, search, authorization, and actions remain unchanged.
