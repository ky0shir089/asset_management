# Create Role-Based Sidebar Navigation

## Context

Dashboard sidebar currently uses static sample navigation in `components/app-sidebar.tsx`. App already has database-backed `modules`, `menus`, `roles`, and role-to-menu mappings, but sidebar does not use them. Sidebar navigation should use modules as parent items and menus as children, filtered by current user's role.

Role source: add `roleId` to current user. Current user always has `id`.

Required sidebar data format:

```ts
[
  {
    icon: "",
    name: "",
    id: "",
    menus: [
      {
        id: "",
        name: "",
        path: "",
        position: "",
      },
    ],
  },
]
```

Intended outcome: after login, dashboard sidebar shows only active menus assigned to current user's role, grouped under parent modules and ordered by configured positions.

## Recommended Approach

Use current `user.id` to load the user row from DB, read `users.roleId`, then load role-allowed menus server-side from Drizzle before rendering dashboard layout. Keep `AppSidebar` as client UI only, with typed module/menu data passed from server.

## Critical Files

Modify later:

- `drizzle/schemas/auth-schema.ts` — add nullable `roleId` / `role_id` to `users`.
- `lib/auth/auth.ts` — expose/allow `roleId` as Better Auth user additional field if required by Better Auth docs.
- `data/sidebar.ts` — new server-only loader for role-filtered sidebar tree.
- `app/(dashboard)/layout.tsx` — load current user and sidebar nav, remove `console.log(session)`, pass data to sidebar.
- `components/app-sidebar.tsx` — replace sample static nav with prop-driven module/menu rendering.

Reuse:

- `data/require-user.ts` — `requireUser()` / session guard.
- `drizzle/schema.ts` exports — `users`, `modules`, `menus`, `menuRole`, `roles`.
- `components/ui/sidebar.tsx` — existing sidebar primitives.
- `components/nav-user.tsx` — existing user footer.

## Implementation Steps

### 1. Check docs before code

- Context7 for Better Auth custom user fields/session behavior, if tool available.
- Local Next.js docs per `AGENTS.md`; note `node_modules/next/dist/docs/` was not present during planning, so use available package docs/source or Context7 before writing Next-specific code.

### 2. Add user role field

- Add nullable `roleId` column mapped to `role_id` on `users`.
- Prefer DB-level foreign key to `roles.id` with `onDelete: "set null"` if import cycle can be avoided.
- If `auth-schema.ts` ↔ `role.ts` import cycle appears, keep schema column simple and enforce FK in migration, not runtime schema relation.
- Update Better Auth config only as docs require; do not rely on session exposing `roleId`.

### 3. Add sidebar data loader

Create `data/sidebar.ts`:

- Add `import "server-only"`.
- Call `requireUser()`; user always has `id`.
- Query DB user by `user.id` to read `roleId` from source of truth.
- If user has no `roleId`, return `[]`.
- Join `menuRole -> menus -> modules`.
- Filter:
  - `menuRole.role_id = dbUser.roleId`
  - `menuRole.isActive = true`
  - `menus.isActive = true`
- Order by `modules.position`, `menus.position`, then stable name/id tie-breaker.
- Return exact shape:

```ts
export type SidebarModule = {
  icon: string
  name: string
  id: string
  menus: SidebarMenu[]
}

export type SidebarMenu = {
  id: string
  name: string
  path: string
  position: number
}
```

- Group rows by module `id` in TypeScript.
- Convert missing `icon` to `""` only if DB can return null; current schema requires string.

### 4. Update dashboard layout

In `app/(dashboard)/layout.tsx`:

- Replace direct `auth.api.getSession()` with `requireUser()` and `getSidebarNavForCurrentUser()`.
- Remove `console.log(session)`.
- Build existing user footer object:
  - `name: user.displayUsername || ""`
  - `email: user.email || ""`
  - `avatar: user.image || "/avatars/shadcn.jpg"`
- Pass `<AppSidebar user={userViewModel} navMain={sidebarModules} />`.

### 5. Update `AppSidebar`

In `components/app-sidebar.tsx`:

- Remove static sample data.
- Accept `navMain: SidebarModule[]` prop.
- Render each module as collapsible parent using `module.name`, `module.id`, `module.icon`.
- Render child links from `module.menus` using `menu.name` and `menu.path`.
- Use `usePathname()` to mark active child menu:
  - exact match: `pathname === menu.path`
  - nested match: `pathname.startsWith(menu.path + "/")`
- Open parent collapsible by default when any child active.
- Use `next/link` for menu links after docs check.
- Keep header/sidebar/footer structure and `NavUser`.
- Empty state: show small muted text like `No menu available` when no role/menu found.
- Defer icon rendering or use safe local icon map only; do not dynamically render arbitrary icon names.

### 6. Generate and apply DB migration

Use existing scripts after code changes:

```bash
pnpm db:generate
pnpm db:migrate
```

If Better Auth schema generation is needed, update `lib/auth/auth.ts` first, then run:

```bash
pnpm auth:generate
```

Then inspect generated changes and preserve custom role linkage.

## Role Assignment Note

This plan enables sidebar filtering by `users.role_id`. It does not add a full user-management UI unless one already exists. For initial verification, assign `role_id` to test user manually in dev DB or via seed/admin script. A user-role assignment screen can be planned separately.

## Verification

Run:

1. `pnpm typecheck`
2. `pnpm lint`
3. `pnpm db:generate` and inspect migration for `users.role_id`.
4. `pnpm db:migrate` against dev DB.
5. Create test data:
   - 2 modules with different positions.
   - Several menus under both modules.
   - One inactive menu.
   - One role assigned only selected menus.
   - Test user with `role_id` set to that role.
6. Login as test user and verify:
   - Sidebar data shape is exactly `[{ icon, name, id, menus: [{ id, name, path, position }] }]`.
   - Sidebar shows only role-allowed active menus.
   - Parent module grouping is correct.
   - Module/menu ordering follows position.
   - Inactive menus are hidden.
   - Current route highlights child menu and opens parent.
   - User footer still renders.
   - User with no `role_id` sees empty sidebar state.
