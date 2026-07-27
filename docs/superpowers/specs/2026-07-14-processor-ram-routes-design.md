# Processor and RAM Routes Design

## Goal

Create separate Processor and RAM CRUD masters under `/asset`, matching `app/(dashboard)/asset/brand` without introducing shared abstractions.

Each master stores one required `name` value and supports browse, search, create, and update flows.

## Database

Add two tables to `drizzle/schemas/master-asset.ts`:

- `processors`
- `rams`

Both tables match `asset_brands` fields:

- `id`
- `name`
- `createdBy`
- `updatedBy`
- `createdAt`
- `updatedAt`

Generate and inspect a Drizzle migration for both tables and their user foreign keys.

## Routes

Processor:

```txt
app/(dashboard)/asset/processor/
  page.tsx
  action.ts
  column.tsx
  new/page.tsx
  [processorId]/edit/page.tsx
  _components/ProcessorForm.tsx
```

RAM:

```txt
app/(dashboard)/asset/ram/
  page.tsx
  action.ts
  column.tsx
  new/page.tsx
  [ramId]/edit/page.tsx
  _components/RamForm.tsx
```

Add Processor and RAM links to `app/(dashboard)/asset/page.tsx`.

## Support Files

```txt
data/processor.ts
data/ram.ts
lib/formSchemas/processor-schema.ts
lib/formSchemas/ram-schema.ts
```

Each Zod schema accepts one required `name` string.

## List Pages

Each list page follows Asset Brand behavior:

- reads `page`, `size`, and `q` from `searchParams`
- renders title, Add New button, `SearchBox`, and `DataTable`
- uses `Suspense` and `DataTableSkeleton`
- searches `name` case-insensitively
- displays Name and Action columns
- links Edit action to matching edit route

## Data Layer

Processor exports:

- `processorIndex(currentPage, size, query)`
- `processorShow(id)`
- inferred index and show types

RAM exports:

- `ramIndex(currentPage, size, query)`
- `ramShow(id)`
- inferred index and show types

Index functions:

- call `requireUser()`
- call `requirePermission()` with `processor:browse` or `ram:browse`
- paginate through `paginationParams()` and `paginatedResponse()`
- search by trimmed `name`

Show functions:

- call `requireUser()`
- call `requirePermission()` with `processor:read` or `ram:read`
- fetch by ID
- call `notFound()` when no record exists

## Server Actions

Processor actions:

- `processorStore(values)`
- `processorUpdate(id, values)`

RAM actions:

- `ramStore(values)`
- `ramUpdate(id, values)`

Action behavior:

- call `requireUser()`
- authorize with `processor:create`, `processor:update`, `ram:create`, or `ram:update`
- validate with matching Zod schema
- create writes `createdBy: user.id`
- update writes `updatedBy: user.id`
- return `{ success: boolean, message: string }`

Errors follow Asset Brand:

- invalid input returns `Invalid form data`
- caught DB errors return `error.message` or `Something went wrong`

## Forms

`ProcessorForm` and `RamForm` follow `AssetBrandForm`:

- client component
- React Hook Form with Zod resolver
- one required Name input
- `LoadingSwap` submit state
- create or update action selected from presence of record ID
- success toast and redirect to matching list
- error toast on failure

## Out of Scope

- Delete actions or buttons
- Shared generic master-data abstractions
- Extra fields beyond `name` and standard audit fields
- Permission, menu, or role seed records
- Changes to existing Processor and RAM asset-spec names

## Verification

After implementation:

- inspect generated migration
- run `pnpm typecheck`
- run `pnpm lint`
- exercise list, create, and edit flows for both routes
