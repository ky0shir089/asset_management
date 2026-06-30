# Purchase Request Detail Approval Design

## Goal

Create a purchase request detail page from the List Purchase Request screen, and move PR approval/rejection into that detail flow. Reviewers must see full request header, asset items, and specifications before changing PR status.

## Route and Navigation

- Keep `/asset-transaction/list-purchase-request` as the reviewer-facing list page.
- Replace current list action behavior with a `View` link for every row.
- Link each row to `/asset-transaction/list-purchase-request/[prId]`.
- Implement existing stub route at `app/(dashboard)/asset-transaction/list-purchase-request/[prId]/page.tsx`.

## Detail Page Content

The detail page is read-only and server-rendered.

Header section shows:

- Date
- Company code
- Asset category name
- Description
- Total quantity
- Total amount, formatted with `id-ID`
- Status

Item section shows each purchase request detail:

- Asset code and name
- Quantity
- Price, formatted with `id-ID`
- Total, formatted with `id-ID`
- Specifications as `Spec Name: Value`, joined in a readable list

Missing optional values display as `-`.

## Status Actions

Approve/reject controls live on the detail page only.

- Show buttons only when PR status is `REQUEST`.
- Hide buttons for `APPROVED` and `REJECTED` requests.
- Use existing `purchase-request:update` permission for both actions.
- Add server actions:
  - `purchaseRequestApprove(id)` sets status to `APPROVED`.
  - `purchaseRequestReject(id)` sets status to `REJECTED`.
- Both actions must:
  - require current user
  - authorize `purchase-request:update`
  - load PR by id
  - return failure when PR missing
  - return failure when current status is not `REQUEST`
  - update `status` and `updatedBy`
  - revalidate list path and concrete detail path
  - return `{ success, message }`

Use a small client component, `PurchaseRequestStatusActions`, for the buttons.

- Props: `id`, `status`
- Uses `useTransition` for pending UI
- Calls server action
- Shows Sonner toast
- Calls `router.refresh()` after success

## Data Changes

Reuse `purchaseRequestShow(id)` for detail page loading because it already applies:

- `purchase-request:read` permission
- authenticated user requirement
- super-admin bypass
- owner-only access for non-super-admin users
- `notFound()` on missing or unauthorized data

Extend `purchaseRequestShow(id)` to include specification relation names, so detail page can render human-readable spec labels instead of raw IDs.

## Purchase Order Flow

After approval, only approved PRs can be selected when creating purchase orders.

Update PO selector sources:

- `purchaseRequestOptionsForPurchaseOrder`
- `purchaseRequestDetailOptionsForPurchaseOrder`

Change their status filters from `REQUEST` to `APPROVED`.

Rejected requests must not appear in PO selectors.

## Error Handling and Race Safety

- Detail page missing/unauthorized data uses existing `notFound()` behavior.
- Buttons do not render for non-`REQUEST` statuses.
- Server actions still validate current status to prevent stale UI or double-submit races.
- Action failures show toast error and leave page unchanged.
- Action success refreshes the route so status and button visibility update immediately.

## Verification

After implementation:

1. Run `pnpm typecheck`.
2. Run `pnpm lint`.
3. If those pass and time permits, run `pnpm build`.

Manual sanity checks:

- List Purchase Request row opens detail page.
- Detail page shows header, totals, asset items, and spec names/values.
- `REQUEST` PR shows Approve and Reject buttons.
- Approve changes status to `APPROVED`, hides buttons, and makes PR available to PO selection.
- Reject changes status to `REJECTED`, hides buttons, and keeps PR unavailable to PO selection.
- Non-`REQUEST` PR cannot be approved/rejected through stale action calls.
