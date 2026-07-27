# Network Routes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement flat network CRUD routes for Company, Branch, and Outlet.

**Architecture:** Use established module/menu CRUD pattern. Each entity gets its own list, form, and action files.

**Tech Stack:** Next.js, Drizzle ORM, Zod, React Hook Form, Shadcn UI.

## Global Constraints

- No `revalidatePath()` calls in actions.
- Routes under `/network`.
- No menu/sidebar/permission changes.
- Parent selects disabled when empty.

---

### Task 1: Scaffolding and Schemas

**Files:**
- Create: `lib/formSchemas/company-schema.ts`
- Create: `lib/formSchemas/branch-schema.ts`
- Create: `lib/formSchemas/outlet-schema.ts`
- Create: `data/select.ts` (if not exists, update)

**Interfaces:**
- Produces: `CompanySchema`, `BranchSchema`, `OutletSchema`

- [ ] **Step 1: Create company-schema.ts**

```typescript
import z from "zod"

export const companySchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  isActive: z.boolean(),
})
export type companySchemaType = z.infer<typeof companySchema>
```

- [ ] **Step 2: Create branch-schema.ts**

```typescript
import z from "zod"

export const branchSchema = z.object({
  companyId: z.string().uuid(),
  name: z.string().min(1),
  isActive: z.boolean(),
})
export type branchSchemaType = z.infer<typeof branchSchema>
```

- [ ] **Step 3: Create outlet-schema.ts**

```typescript
import z from "zod"

export const outletSchema = z.object({
  branchId: z.string().uuid(),
  name: z.string().min(1),
  isActive: z.boolean(),
})
export type outletSchemaType = z.infer<typeof outletSchema>
```

- [ ] **Step 4: Update/Create data/select.ts**

```typescript
// Add companyOptions and branchOptions fetching
```

- [ ] **Step 5: Commit**

```bash
git add lib/formSchemas/company-schema.ts lib/formSchemas/branch-schema.ts lib/formSchemas/outlet-schema.ts data/select.ts
git commit -m "feat: network route schemas and options"
```

### Task 2: Data Layer and Actions

**Files:**
- Create: `data/company.ts`, `data/branch.ts`, `data/outlet.ts`
- Create: `app/(dashboard)/network/company/action.ts`
- Create: `app/(dashboard)/network/branch/action.ts`
- Create: `app/(dashboard)/network/outlet/action.ts`

**Interfaces:**
- Consumes: Schemas from Task 1
- Produces: `*Index`, `*Show`, `*Store`, `*Update`

- [ ] **Step 1: Implement data/company.ts**
- [ ] **Step 2: Implement data/branch.ts**
- [ ] **Step 3: Implement data/outlet.ts**
- [ ] **Step 4: Implement actions**
- [ ] **Step 5: Commit**

### Task 3: UI Components and Pages

**Files:**
- Create: `app/(dashboard)/network/company/...`
- Create: `app/(dashboard)/network/branch/...`
- Create: `app/(dashboard)/network/outlet/...`

**Interfaces:**
- Consumes: Data and actions from Task 2

- [ ] **Step 1: Implement Company routes**
- [ ] **Step 2: Implement Branch routes**
- [ ] **Step 3: Implement Outlet routes**
- [ ] **Step 4: Commit**

```bash
git add app/(dashboard)/network/
git commit -m "feat: network CRUD routes"
```
