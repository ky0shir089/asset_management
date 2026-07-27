# Permission Helper Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add cached permission checks for dashboard data reads and mutation actions.

**Architecture:** Store each login session's permission names on the `sessions` row, populate that cache on sign-in, and use a server-only helper to check permissions. Data functions redirect unauthorized users to `/unauthorized`; actions return `{ success: false, message: "Unauthorized" }` so existing client forms show toast errors.

**Tech Stack:** Next.js App Router, Better Auth, Drizzle ORM, PostgreSQL, Zod, React Server Components, server actions.

## Global Constraints

- Permission names use `<key>:<action>`.
- `*Index` uses `<key>:browse`.
- `*Show` uses `<key>:read`.
- `*Store` uses `<key>:create`.
- `*Update` uses `<key>:update`.
- Data/page unauthorized access redirects to `/unauthorized`.
- Action unauthorized access returns `{ success: false, message: "Unauthorized" }`.
- Existing login hook behavior that deletes other sessions must remain.
- Session permissions can remain stale until user logs in again after role permission changes.
- Do not add delete permission checks because delete actions do not exist yet.
- Do not add middleware route-level permission checks.
- Do not change menu/sidebar behavior.
- Do not commit unless user explicitly asks.

---

## File Structure

Create:

- `lib/auth/permission.ts` — server-only permission cache/query/check helpers.
- `app/(dashboard)/unauthorized/page.tsx` — dashboard unauthorized page.

Modify:

- `drizzle/schemas/auth-schema.ts` — add `sessions.permissions` JSONB column.
- `lib/auth/auth.ts` — populate `sessions.permissions` during successful username sign-in.
- `data/module.ts`, `data/menu.ts`, `data/role.ts`, `data/user.ts`, `data/company.ts`, `data/branch.ts`, `data/outlet.ts` — guard `Index` and `Show` functions.
- `app/(dashboard)/setup-aplikasi/module/action.ts`, `app/(dashboard)/setup-aplikasi/menu/action.ts`, `app/(dashboard)/setup-aplikasi/role/action.ts`, `app/(dashboard)/setup-aplikasi/user/action.ts`, `app/(dashboard)/network/company/action.ts`, `app/(dashboard)/network/branch/action.ts`, `app/(dashboard)/network/outlet/action.ts` — guard `Store` and `Update` functions.

Verification:

- `pnpm typecheck`
- `pnpm lint`

---

### Task 1: Session Permission Cache Schema

**Files:**
- Modify: `drizzle/schemas/auth-schema.ts`

**Interfaces:**
- Produces: `sessions.permissions` typed as `string[] | null` or `string[]` depending Drizzle inference.
- Later tasks consume: `sessions.permissions` in `lib/auth/permission.ts` and `lib/auth/auth.ts`.

- [ ] **Step 1: Add jsonb import**

In `drizzle/schemas/auth-schema.ts`, update pg-core imports from:

```ts
import {
  pgTable,
  text,
  timestamp,
  boolean,
  index,
  serial,
  uuid,
} from "drizzle-orm/pg-core"
```

to:

```ts
import {
  pgTable,
  text,
  timestamp,
  boolean,
  index,
  serial,
  uuid,
  jsonb,
} from "drizzle-orm/pg-core"
```

- [ ] **Step 2: Add permissions column to sessions table**

In `sessions` table fields, after `userId`, add:

```ts
    permissions: jsonb("permissions").$type<string[]>().default([]),
```

Final `sessions` fields should include:

```ts
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    permissions: jsonb("permissions").$type<string[]>().default([]),
```

- [ ] **Step 3: Run typecheck**

Run:

```bash
pnpm typecheck
```

Expected: either pass, or fail only for later missing helper imports that have not been added yet. If this task is run alone before later tasks, no missing helper imports should exist.

---

### Task 2: Permission Helper

**Files:**
- Create: `lib/auth/permission.ts`

**Interfaces:**
- Consumes: `requireSession()` from `data/require-user.ts`, Drizzle `db`, `roleUser`, `permissionRole`, `permissions`, `sessions`.
- Produces:
  - `UNAUTHORIZED_RESPONSE: { success: false; message: "Unauthorized" }`
  - `getUserPermissionNames(userId: string): Promise<string[]>`
  - `getSessionPermissions(): Promise<string[]>`
  - `can(permissionName: string): Promise<boolean>`
  - `requirePermission(permissionName: string): Promise<void>`
  - `authorizeAction(permissionName: string): Promise<{ authorized: true } | { authorized: false; response: typeof UNAUTHORIZED_RESPONSE }>`

- [ ] **Step 1: Create helper file**

Create `lib/auth/permission.ts`:

```ts
import "server-only"

import { requireSession } from "@/data/require-user"
import { db } from "@/drizzle/db"
import {
  permissionRole,
  permissions,
  roleUser,
  sessions,
} from "@/drizzle/schema"
import { and, eq, inArray } from "drizzle-orm"
import { redirect } from "next/navigation"

export const UNAUTHORIZED_RESPONSE = {
  success: false,
  message: "Unauthorized",
} as const

export async function getUserPermissionNames(userId: string) {
  const userRoles = await db.query.roleUser.findMany({
    columns: {
      roleId: true,
    },
    where: and(eq(roleUser.userId, userId), eq(roleUser.isActive, true)),
  })

  const roleIds = userRoles.map((role) => role.roleId)

  if (!roleIds.length) {
    return []
  }

  const rows = await db
    .select({
      name: permissions.name,
    })
    .from(permissionRole)
    .innerJoin(permissions, eq(permissionRole.permissionId, permissions.id))
    .where(inArray(permissionRole.roleId, roleIds))

  return Array.from(new Set(rows.map((row) => row.name)))
}

export async function getSessionPermissions() {
  const session = await requireSession()

  const data = await db.query.sessions.findFirst({
    columns: {
      permissions: true,
    },
    where: eq(sessions.id, session.session.id),
  })

  return data?.permissions ?? []
}

export async function can(permissionName: string) {
  const permissionNames = await getSessionPermissions()

  return permissionNames.includes(permissionName)
}

export async function requirePermission(permissionName: string) {
  const authorized = await can(permissionName)

  if (!authorized) {
    redirect("/unauthorized")
  }
}

export async function authorizeAction(permissionName: string) {
  const authorized = await can(permissionName)

  if (!authorized) {
    return {
      authorized: false,
      response: UNAUTHORIZED_RESPONSE,
    } as const
  }

  return {
    authorized: true,
  } as const
}
```

- [ ] **Step 2: Run typecheck for helper**

Run:

```bash
pnpm typecheck
```

Expected: helper compiles with existing schema after Task 1.

---

### Task 3: Populate Permission Cache on Login

**Files:**
- Modify: `lib/auth/auth.ts`

**Interfaces:**
- Consumes: `getUserPermissionNames(userId: string): Promise<string[]>` from `lib/auth/permission.ts`.
- Produces: New sessions get `sessions.permissions` updated on `/sign-in/username` success.

- [ ] **Step 1: Add imports**

In `lib/auth/auth.ts`, add:

```ts
import { getUserPermissionNames } from "./permission"
```

Keep existing imports.

- [ ] **Step 2: Update sign-in hook**

Inside existing hook, after `if (!newSession) return`, add permission cache update before deleting other sessions:

```ts
      const permissionNames = await getUserPermissionNames(newSession.user.id)

      await db
        .update(schema.sessions)
        .set({
          permissions: permissionNames,
        })
        .where(eq(schema.sessions.id, newSession.session.id))
```

Final hook body should keep existing session cleanup:

```ts
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-in/username") return

      const newSession = ctx.context.newSession

      if (!newSession) return

      const permissionNames = await getUserPermissionNames(newSession.user.id)

      await db
        .update(schema.sessions)
        .set({
          permissions: permissionNames,
        })
        .where(eq(schema.sessions.id, newSession.session.id))

      await db
        .delete(schema.sessions)
        .where(
          and(
            eq(schema.sessions.userId, newSession.user.id),
            ne(schema.sessions.id, newSession.session.id)
          )
        )
    }),
  },
```

- [ ] **Step 3: Run typecheck**

Run:

```bash
pnpm typecheck
```

Expected: no auth hook type errors.

---

### Task 4: Unauthorized Page

**Files:**
- Create: `app/(dashboard)/unauthorized/page.tsx`

**Interfaces:**
- Consumes: `Card`, `CardContent`, `CardHeader`, `CardTitle`, `cn`.
- Produces: redirect target for `requirePermission()`.

- [ ] **Step 1: Create page**

Create `app/(dashboard)/unauthorized/page.tsx`:

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export default function UnauthorizedPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className={cn("text-2xl")}>Unauthorized</CardTitle>
      </CardHeader>

      <CardContent>
        <p>You don't have permission to access this page.</p>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Run typecheck**

Run:

```bash
pnpm typecheck
```

Expected: unauthorized page compiles.

---

### Task 5: Guard Data Functions

**Files:**
- Modify: `data/module.ts`
- Modify: `data/menu.ts`
- Modify: `data/role.ts`
- Modify: `data/user.ts`
- Modify: `data/company.ts`
- Modify: `data/branch.ts`
- Modify: `data/outlet.ts`

**Interfaces:**
- Consumes: `requirePermission(permissionName: string): Promise<void>`.
- Produces: all `*Index` and `*Show` functions enforce read permissions.

- [ ] **Step 1: Import helper in each data file**

Add this import to every listed file:

```ts
import { requirePermission } from "@/lib/auth/permission"
```

- [ ] **Step 2: Add module guards**

In `data/module.ts`:

```ts
export async function moduleIndex(
  currentPage: number,
  size: number,
  query?: string
) {
  await requireUser()
  await requirePermission("module:browse")
```

```ts
export async function moduleShow(id: string) {
  await requireUser()
  await requirePermission("module:read")
```

- [ ] **Step 3: Add menu guards**

In `data/menu.ts`:

```ts
export async function menuIndex(
  currentPage: number,
  size: number,
  query?: string
) {
  await requireUser()
  await requirePermission("menu:browse")
```

```ts
export async function menuShow(id: string) {
  await requireUser()
  await requirePermission("menu:read")
```

- [ ] **Step 4: Add role guards**

In `data/role.ts`:

```ts
export async function roleIndex(
  currentPage: number,
  size: number,
  query?: string
) {
  await requireUser()
  await requirePermission("role:browse")
```

```ts
export async function roleShow(id: string) {
  await requireUser()
  await requirePermission("role:read")
```

- [ ] **Step 5: Add user guards**

In `data/user.ts`:

```ts
export async function userIndex(
  currentPage: number,
  size: number,
  query?: string
) {
  await requireUser()
  await requirePermission("user:browse")
```

```ts
export async function userShow(id: string) {
  await requireUser()
  await requirePermission("user:read")
```

- [ ] **Step 6: Add network guards**

In `data/company.ts`:

```ts
await requirePermission("company:browse")
await requirePermission("company:read")
```

In `data/branch.ts`:

```ts
await requirePermission("branch:browse")
await requirePermission("branch:read")
```

In `data/outlet.ts`:

```ts
await requirePermission("outlet:browse")
await requirePermission("outlet:read")
```

Place browse checks in `*Index` functions and read checks in `*Show` functions, immediately after `await requireUser()`.

- [ ] **Step 7: Run typecheck**

Run:

```bash
pnpm typecheck
```

Expected: no data helper import or function errors.

---

### Task 6: Guard Action Functions

**Files:**
- Modify: `app/(dashboard)/setup-aplikasi/module/action.ts`
- Modify: `app/(dashboard)/setup-aplikasi/menu/action.ts`
- Modify: `app/(dashboard)/setup-aplikasi/role/action.ts`
- Modify: `app/(dashboard)/setup-aplikasi/user/action.ts`
- Modify: `app/(dashboard)/network/company/action.ts`
- Modify: `app/(dashboard)/network/branch/action.ts`
- Modify: `app/(dashboard)/network/outlet/action.ts`

**Interfaces:**
- Consumes: `authorizeAction(permissionName: string)` from `lib/auth/permission.ts`.
- Produces: all create/update actions return unauthorized response before mutation when permission missing.

- [ ] **Step 1: Import helper in each action file**

Add:

```ts
import { authorizeAction } from "@/lib/auth/permission"
```

- [ ] **Step 2: Guard store actions**

In each `*Store` action, after `const user = await requireUser()` or immediately after entering the `try` when `requireUser()` already lives inside `try`, add:

```ts
  const permission = await authorizeAction("<key>:create")

  if (!permission.authorized) {
    return permission.response
  }
```

Use exact keys:

- `module:create`
- `menu:create`
- `role:create`
- `company:create`
- `branch:create`
- `outlet:create`

`userStore` does not exist, so do not add one.

- [ ] **Step 3: Guard update actions**

In each `*Update` action, after `const user = await requireUser()` or immediately after entering the `try` when `requireUser()` already lives inside `try`, add:

```ts
  const permission = await authorizeAction("<key>:update")

  if (!permission.authorized) {
    return permission.response
  }
```

Use exact keys:

- `module:update`
- `menu:update`
- `role:update`
- `user:update`
- `company:update`
- `branch:update`
- `outlet:update`

- [ ] **Step 4: Preserve existing return shape**

Each action must still return objects compatible with existing forms:

```ts
{ success: true, message: "..." }
{ success: false, message: "..." }
```

Unauthorized response must remain:

```ts
{ success: false, message: "Unauthorized" }
```

- [ ] **Step 5: Run typecheck**

Run:

```bash
pnpm typecheck
```

Expected: no action return type or import errors.

---

### Task 7: Final Verification

**Files:**
- All files changed by Tasks 1-6.

**Interfaces:**
- Consumes: completed Tasks 1-6.
- Produces: verification evidence.

- [ ] **Step 1: Run typecheck**

Run:

```bash
pnpm typecheck
```

Expected: exits 0.

- [ ] **Step 2: Run lint**

Run:

```bash
pnpm lint
```

Expected: exits 0.

- [ ] **Step 3: Search for missing data guards**

Run:

```bash
rg "export async function .*Index|export async function .*Show" data
```

Expected: each listed function has matching `requirePermission("<key>:browse")` or `requirePermission("<key>:read")` in the function body.

- [ ] **Step 4: Search for missing action guards**

Run:

```bash
rg "export async function .*Store|export async function .*Update" app
```

Expected: each listed dashboard action has matching `authorizeAction("<key>:create")` or `authorizeAction("<key>:update")` in the function body, except nonexistent `userStore`.

- [ ] **Step 5: Manual smoke checks**

With a user lacking a permission:

- Visit list page without `<key>:browse`; expected redirect to `/unauthorized`.
- Visit edit page without `<key>:read`; expected redirect to `/unauthorized`.
- Submit create form without `<key>:create`; expected toast text `Unauthorized`.
- Submit update form without `<key>:update`; expected toast text `Unauthorized`.

- [ ] **Step 6: Report verification results**

Report exact command outputs and any manual check results. If a command cannot run, state the reason and do not claim it passed.
