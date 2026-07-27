# Permission Helper Design

## Goal

Create a central permission helper that guards all `data/*` read functions and dashboard `action.ts` mutation functions.

## Permission Names

Permission names use existing menu permission naming format:

```txt
<key>:<action>
```

Actions:

- `browse` for index/list data reads
- `read` for show/detail data reads
- `create` for store/create actions
- `update` for update actions

Keys:

- `module`
- `menu`
- `role`
- `user`
- `company`
- `branch`
- `outlet`

Examples:

- `module:browse`
- `menu:read`
- `company:create`
- `outlet:update`

## Permission Source

Permissions are assigned through the existing `permissionRole` table.

Lookup path:

```txt
current user -> roleUser -> permissionRole -> permissions.name
```

Authorization succeeds when any active user role has a matching `permissions.name`.

## Session Cache

Add a permissions cache on the session row:

```ts
permissions: jsonb("permissions").$type<string[]>().default([])
```

On successful login, query the user's permission names once and update the new session row with the string array.

Existing login hook behavior that deletes other sessions must remain.

If role permissions change while a user is already logged in, the existing session can remain stale until the user logs in again. Refresh-on-role-change is out of scope for this pass.

## Helper API

Create a server-only helper, likely `lib/auth/permission.ts`.

Functions:

```ts
export async function getSessionPermissions(): Promise<string[]>
export async function can(permissionName: string): Promise<boolean>
export async function requirePermission(permissionName: string): Promise<void>
export async function authorizeAction(permissionName: string): Promise<
  | { authorized: true }
  | { authorized: false; response: { success: false; message: "Unauthorized" } }
>
```

Behavior:

- `getSessionPermissions()` reads permissions from the current session.
- `can()` returns whether the current session permission list includes `permissionName`.
- `requirePermission()` redirects to `/unauthorized` if permission is missing.
- `authorizeAction()` returns a reusable failed action response for client forms.

## Data Function Rules

Every data function must check permission after session/user requirement and before DB query.

Rules:

- `*Index` uses `<key>:browse`
- `*Show` uses `<key>:read`

Unauthorized data access redirects to `/unauthorized`.

## Action Rules

Every dashboard action must check permission before validation and mutation.

Rules:

- `*Store` uses `<key>:create`
- `*Update` uses `<key>:update`

Unauthorized action access returns:

```ts
{ success: false, message: "Unauthorized" }
```

Existing forms already call `toast.error(result.message)`, so unauthorized action attempts show a toast.

## Unauthorized Page

Add:

```txt
app/(dashboard)/unauthorized/page.tsx
```

Page content:

- Card layout matching dashboard pages
- Title: `Unauthorized`
- Message: `You don't have permission to access this page.`

## Scope

Included:

- session permission cache column
- login-time permission caching
- central permission helper
- guards for existing data/action functions
- unauthorized route

Excluded:

- delete permission checks because delete actions do not exist yet
- permission refresh when roles change
- middleware route-level permission checks
- menu/sidebar changes

## Verification

Run:

```bash
pnpm typecheck
pnpm lint
```

Manual checks:

- user without `<key>:browse` is redirected to `/unauthorized` on list page
- user without `<key>:read` is redirected on edit/detail page load
- user without `<key>:create` sees unauthorized toast on create submit
- user without `<key>:update` sees unauthorized toast on update submit
