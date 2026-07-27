# Asset Lease Schema Sync and Decision UX

**Date:** 2026-07-27
**Status:** Approved design

## Goal

Align `/distribution/asset-lease` with current `drizzle/schemas/distribution.ts` contract and add minimal approval UX. Lease requests target companies, not outlets or customers. Pending requests do not move or reserve assets. Authorized users approve or reject requests from lease detail page.

## Scope

Included:

- Company-only lease creation
- Per-asset amount and required photos
- `NEW`, `APPROVED`, and `REJECTED` lifecycle
- Approval with user-selected physical receive date
- Rejection with required visible reason
- Approval-time asset claiming
- Company-aware list/detail views
- Photo display on lease detail
- Schema relation correction and generated migration

Excluded:

- Lease editing
- Asset return flow
- Partial approval
- Status tabs or work-queue filters
- Asset transfer creation or location changes
- `dateEnd` management
- New upload or form dependencies

## Data Contract

### Lease header

`rentAssets` represents one request for one external company:

- `companyId` references `companies.id`.
- `rentDate` records requested lease start date.
- `receiveDate` records physical receive date supplied during approval.
- `status` uses `NEW`, `APPROVED`, or `REJECTED`.
- `reason` stores rejection reason and remains null otherwise.
- `note` remains optional.

`rentAssetsRelations` exposes a `company` relation joining `rentAssets.companyId` to `companies.id`. Existing relation named `outlet`, which joins company ID to outlet ID, must be corrected.

### Lease details

Each `rentAssetDetails` row contains:

- leased asset
- `dateStart`, copied from header `rentDate` during creation
- optional `dateEnd`, unused in this scope
- non-negative integer amount
- audit fields

Customer does not belong to lease header or detail. Current customer field, relation, selection, filtering, validation, insert, query, and rendering must be removed.

### Photos

Each detail requires at least one `rentPhotoAssets` row. Accepted uploads remain JPEG, PNG, or WebP, up to 1 MB each, with at most 10 photos per asset detail. Validation limits apply per detail, not across whole request.

### Asset and transfer state

Creating a pending request does not change `assetDatas.status`, `assetDatas.outletId`, or `assetTransfers`. Company-only lease has no unique destination outlet, so movement cannot be inferred safely.

Approval atomically changes every requested asset from `TERSEDIA` to `DISEWA`. Asset location remains unchanged. Rejection leaves assets unchanged.

## Lifecycle and Authorization

### Create

1. User with `asset-lease:create` opens new form.
2. User selects an active company whose code is not `LSA`.
3. User supplies lease date, optional note, and one or more asset details.
4. Every detail supplies a unique `TERSEDIA` asset currently located at an outlet under company code `LSA`, plus amount and required photos.
5. Server repeats asset eligibility validation, stores files, then inserts header, details, and photo metadata.
6. Lease starts with status `NEW`.
7. Asset status and location remain unchanged.
8. Existing rent-number generation remains unchanged and uses current Jakarta year/month rather than selected lease date.

### Approve

1. Only users with `asset-lease:update` can approve.
2. Lease must still be `NEW`.
3. Approver supplies required receive date using native date input.
4. Receive date cannot precede lease date.
5. One DB transaction conditionally changes every selected asset from `TERSEDIA` to `DISEWA`.
6. If any asset is unavailable, transaction rolls back all asset changes and lease remains `NEW`.
7. Successful transaction changes lease to `APPROVED`, stores receive date, clears reason, and updates audit fields.

No partial approval exists.

### Reject

1. Only users with `asset-lease:update` can reject.
2. Lease must still be `NEW`.
3. Approver supplies required reason up to 255 characters.
4. Server changes lease to `REJECTED`, stores reason, clears receive date, and updates audit fields.
5. Assets remain unchanged.

### Visibility

- Super Administrator retains current broad visibility.
- Users without `asset-lease:update` see only leases they created.
- Users with `asset-lease:update` see their own leases plus every `NEW` lease, providing a pending decision queue without new list filters.
- List loader still requires `asset-lease:browse`; detail loader still requires `asset-lease:read`. Update permission broadens row visibility only when user also holds route permission.
- Update permission allows detail access to all `NEW` leases after `asset-lease:read` passes.
- After a cross-owner lease is decided, it leaves that approver's visible set unless they are Super Administrator or original creator.
- Server actions require `asset-lease:update` and enforce transition rules independently from UI visibility. Action success does not depend on `asset-lease:browse` or `asset-lease:read`.

## UI Design

### List page

Columns:

- Lease Date
- Lease No
- Company
- Receive Date
- Status
- Action

Search matches lease number, company name, note, and status. Status uses distinct accessible badges for `NEW`, `APPROVED`, and `REJECTED`. Missing receive date renders a neutral placeholder. Existing pagination and data table components remain unchanged.

### New form

Header fields:

- Company selector first, populated with active companies excluding code `LSA`
- Lease Date using native date input, defaulting to current Jakarta date
- optional Note

Each repeating detail contains:

- Asset selector
- Amount input
- required Photos upload

Customer selection and outlet-driven reset/filter logic disappear. Duplicate assets remain blocked. Photo field clearly states required status and constraints: JPEG/PNG/WebP, 1 MB per file, 10 files per asset.

### Detail page

Use approved Layout B, a full-width decision banner:

1. Page header shows back navigation, lease number, company, and status badge.
2. For authorized users viewing a `NEW` lease, decision banner shows pending summary plus Reject and Approve actions.
3. On narrow screens, banner summary and buttons stack vertically.
4. Lease information card shows lease date, receive date, company, note, and rejection reason when present.
5. Assets table shows asset number, asset name, amount, start date, and photos.
6. Photo thumbnails open the full stored image in a new browser tab.
7. Decision banner disappears after approval or rejection.

### Approval dialog

- Uses existing dialog and form primitives.
- Requires native date input.
- Defaults to current Jakarta date.
- Preserves entered date when server returns an error.
- Disables controls during submission.
- Shows server result through existing Sonner pattern.

### Rejection dialog

- Uses existing dialog and textarea primitives.
- Requires non-empty reason, maximum 255 characters.
- Preserves entered reason when server returns an error.
- Disables controls during submission.
- Shows server result through existing Sonner pattern.

## Validation and Error Handling

Shared Zod schemas validate create, approve, and reject payloads. Server independently validates all trust-boundary rules:

- company exists, is active, and code is not `LSA`
- at least one detail exists
- assets are unique, `TERSEDIA`, and currently located under company code `LSA` at creation
- assets are still `TERSEDIA` at approval; current physical location does not change
- amount is a non-negative integer
- every detail has one to 10 valid photos
- each photo uses allowed MIME type and does not exceed 1 MB
- lease remains `NEW` before a decision
- approval receive date is valid and not before lease date
- rejection reason is non-empty and at most 255 characters

Creation preserves existing compensating cleanup: if file or DB work fails after files are saved, saved files are removed best-effort. Approval contains no file work and uses one DB transaction. Conflict errors name unavailable assets when practical and instruct user to review request; no partial state may survive.

Decision actions return typed success/error results compatible with current server action and Sonner patterns. Dialogs stay open after errors and close after success. A successful action revalidates list and detail routes.

## Data Access Changes

- Company option loader returns active companies excluding `LSA` for lease form.
- Lease list joins company instead of outlet.
- List predicate combines ownership with pending approver access.
- Detail query loads company, asset metadata, and photo rows.
- Detail authorization mirrors list visibility.
- Customer query branches disappear from lease flow.

Existing permission helpers, pagination helpers, upload helpers, data-table primitives, dialog primitives, and received-asset photo presentation pattern should be reused. No new dependency or abstraction is needed.

## Migration

Generate a Drizzle migration reflecting current schema changes:

- add `receive_date`
- replace lease header `outlet_id` with `company_id`
- add `reason`
- remove detail `customer_id`
- update foreign keys and indexes as generated

Migration generation is in scope. Applying migration with `pnpm db:migrate` or `pnpm db:push` is not in scope. Generated SQL must be inspected before acceptance, especially because existing rows may need explicit data handling when replacing required `outlet_id` with required `company_id`.

If generated SQL cannot safely migrate populated rows without a mapping, implementation must stop before applying anything and report required data migration decision. No migration command that mutates database runs without separate user instruction.

## Verification

Run:

- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`

Leave smallest runnable validation check covering approval date and rejection reason boundaries. Repository has no configured test runner, so do not add a test framework solely for this change.

Manual browser verification covers:

- company-only creation
- excluded `LSA` company
- duplicate asset prevention
- required per-asset photos and limits
- creator list/detail access
- pending approver list/detail access
- approval conflict rollback
- successful approval and receive date display
- rejection and visible reason
- photo thumbnails
- responsive decision banner

## Success Criteria

- TypeScript and Drizzle queries match updated schema.
- Lease form contains no outlet or customer contract.
- Pending create does not move or lease assets.
- Approval is only operation that claims assets.
- Failed approval leaves all assets and lease unchanged.
- Rejection stores visible reason and changes no assets.
- Required photos validate per asset and display on detail page.
- Users with update permission can decide pending requests without gaining permanent access to unrelated decided requests.
- UI follows Layout B and existing project components without new dependencies.
