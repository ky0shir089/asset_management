# Network Routes Design

## Goal

Create flat network CRUD routes for Company, Branch, and Outlet based on `drizzle/schemas/network.ts`, using `app/(dashboard)/setup-aplikasi/module` as reference.

Routes live under `/network`, not `/setup-aplikasi`. No menu/sidebar/permission records will be added.

## Routes

Company:

```txt
app/(dashboard)/network/company/
  page.tsx
  action.ts
  column.tsx
  new/page.tsx
  [companyId]/edit/page.tsx
  _components/CompanyForm.tsx
```

Branch:

```txt
app/(dashboard)/network/branch/
  page.tsx
  action.ts
  column.tsx
  new/page.tsx
  [branchId]/edit/page.tsx
  _components/BranchForm.tsx
```

Outlet:

```txt
app/(dashboard)/network/outlet/
  page.tsx
  action.ts
  column.tsx
  new/page.tsx
  [outletId]/edit/page.tsx
  _components/OutletForm.tsx
```

## Support Files

```txt
data/company.ts
data/branch.ts
data/outlet.ts
lib/formSchemas/company-schema.ts
lib/formSchemas/branch-schema.ts
lib/formSchemas/outlet-schema.ts
data/select.ts
```

`data/select.ts` will add:

- `companyOptions()` for Branch form
- `branchOptions()` for Outlet form

## Fields

Company form:

- `name`
- `code`
- `isActive`

Branch form:

- `companyId`
- `name`
- `isActive`

Outlet form:

- `branchId`
- `name`
- `isActive`

## List Pages

Each list page follows existing module/menu pattern:

- reads `page`, `size`, `q` from `searchParams`
- renders page title, Add New button, `SearchBox`, `DataTable`
- uses `Suspense` and `DataTableSkeleton`

Columns:

- Company: ID, Name, Code, Status, Action
- Branch: ID, Company, Name, Status, Action
- Outlet: ID, Branch, Name, Status, Action

Outlet can include Company later if needed, but first pass keeps relation display simple and aligned with schema.

## Data Layer

Each entity gets:

- `*Index(currentPage, size, query)`
- `*Show(id)`
- exported show type for table/form typing

Index functions:

- call `requireUser()`
- paginate with `paginationParams()` and `paginatedResponse()`
- search by `name`
- include parent relation display where needed:
  - Branch includes Company name
  - Outlet includes Branch name

Show functions:

- call `requireUser()`
- fetch by ID
- call `notFound()` when no record exists

## Server Actions

Actions:

- `companyStore(values)` / `companyUpdate(id, values)`
- `branchStore(values)` / `branchUpdate(id, values)`
- `outletStore(values)` / `outletUpdate(id, values)`

Action behavior:

- call `requireUser()`
- validate with Zod schema
- create writes `createdBy: user.id`
- update writes `updatedBy: user.id`
- no `revalidatePath()` calls
- return `{ success: boolean, message: string }`

Errors:

- invalid form data returns `Invalid form data`
- caught errors return `error.message` or `Something went wrong`

## Forms

Forms use current project pattern:

- client component
- React Hook Form
- Zod resolver
- `Controller`
- `Field`, `Input`, `Select`, `Switch`
- `LoadingSwap`
- `toast.success` / `toast.error`
- `router.push()` back to list on success

Parent selects:

- Branch form loads companies via `companyOptions()`
- Outlet form loads branches via `branchOptions()`
- Select disabled when options array empty

## Out of Scope

- Delete actions/buttons
- Sidebar/menu/permission seed changes
- Nested network routes
- Bulk operations
- Advanced filters beyond name search

## Verification

Run available checks after implementation:

- TypeScript check if script exists
- Lint if script exists
- Optional app smoke test for list/create/edit flows
