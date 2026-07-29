# Asset Lease Cascading Selector Implementation Plan

## 1. Context and Goals
Improve UX in the Asset Lease form by breaking a single massive asset dropdown into three cascading selectors (Category → Code → Number) and displaying asset details upon selection.

## 2. Technical Approach
Pass only categories to the form initially. Use Server Actions (`useTransition`) to dynamically fetch asset codes, then assets, based on user selection. Manage intermediate category and code selections in local component state to keep the Zod schema clean, mapping only the final `assetId` to React Hook Form.

## 3. Database Changes (if any)
- [ ] No schema changes required.
- [ ] No migration generation step required.

## 4. Backend & Data Layer
- [ ] Add `getAssetCodes(categoryId: string)` server action to `app/(dashboard)/distribution/asset-lease/action.ts` (returns codes with `TERSEDIA` assets in LSA).
- [ ] Add `getAssets(codeId: string)` server action to `app/(dashboard)/distribution/asset-lease/action.ts` (returns asset numbers, condition, and specs).

## 5. UI Components
- [ ] Refactor `AssetLeaseForm` loader to pass `categories` instead of all `assets`.
- [ ] Update `app/(dashboard)/distribution/asset-lease/_components/AssetLeaseDetailSection.tsx` to handle local state for `categoryId` and `codeId` per row.
- [ ] Implement Category, Code, and Number cascading dropdowns with loading/disabled states using `useTransition`.
- [ ] Add a read-only detail panel below the selectors to display the selected asset's condition and specifications.
- [ ] Ensure changing a parent selector resets downstream local state and the RHF `assetId`.

## 6. Testing & Verification
- [ ] Open the Asset Lease form and verify only Categories are loaded initially.
- [ ] Select a Category and verify Codes dropdown populates correctly (showing loading state during fetch).
- [ ] Select a Code and verify Asset Numbers dropdown populates correctly.
- [ ] Verify selecting a different Category resets Code, Number, and RHF state.
- [ ] Select a Number and verify the read-only detail panel displays correct condition and specs.
- [ ] Submit the form and verify `assetId` persists correctly to the database.
