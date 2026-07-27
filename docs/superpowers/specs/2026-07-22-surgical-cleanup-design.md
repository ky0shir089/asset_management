# Surgical Cleanup Design

## Goal

Remove confirmed dead code and repeated plumbing without changing application behavior, authorization, validation, query semantics, or loading UX.

## Scope

### Delete dead surface

- Delete unused `components/ui/breadcrumb.tsx`.
- Delete unused `lib/debug/memory.ts`.
- Delete stale `.gitkeep` files from populated `components`, `hooks`, `lib`, and `public` directories.
- Remove unused `react-select` and `tsx` direct dependencies, then regenerate `pnpm-lock.yaml` with pnpm.
- Delete unused option loaders and inferred types from `data/select.ts`.
- Delete unused exported types and constants from form schemas, received-asset data, and data-table code.
- Remove unused mono-font setup from root layout while preserving current layout behavior and user changes.

### Consolidate proven duplication

- Export `SearchParamValue` and `getSearchParam` from existing `lib/helper.ts`.
- Replace identical local declarations in 19 dashboard list pages with imports from `lib/helper.ts`.
- Add one shared `isSuperAdmin` query to existing auth query layer and reuse it from five callers.
- Preserve exact super-admin behavior: active role assignment plus role name exactly `Super Administrator`.

### Remove unused plumbing

- Remove unused TanStack sorting, filtering, visibility, and row-selection state and row models from `DataTable`.
- Keep core row model, manual pagination, current URL behavior, and rendered table behavior.
- Remove seven `Suspense` boundaries wrapping synchronous client forms; keep all async form boundaries.
- Remove `PaginationMeta.current_page`, `per_page`, `next_page_url`, and `prev_page_url`; no external compatibility is required.
- Keep `last_page`, `from`, `to`, and `total`.
- Replace literal `className={cn("text-2xl")}` calls with `className="text-2xl"` and remove imports made unused.

## Non-goals

- No generic list-page shell.
- No pruning inside generated shadcn primitives except deleting fully unused breadcrumb suite.
- No auth, permission, validation, DB query, upload, PDF, theme, or visible navigation changes.
- No broad formatting.
- No changes to active user work beyond targeted cleanup lines.
- No removal of optional purchase-order loader behavior.

## Implementation constraints

Repository contains many tracked and untracked user changes. Edits must be targeted. Do not use reset, clean, checkout, broad file replacement, or repository-wide formatting. Read each target before editing. Regenerate lockfile through pnpm instead of hand-editing dependency graph.

## Verification

Run:

```powershell
pnpm install --lockfile-only
pnpm typecheck
pnpm lint
git diff --check
pnpm install --frozen-lockfile
```

Run `pnpm build` when required environment variables are available. No test runner exists. Authorization consolidation also requires code review confirming exact role query semantics remain unchanged.

## Success criteria

- TypeScript and ESLint pass.
- Lockfile accepts frozen install.
- Diff contains only approved cleanup.
- Current runtime behavior and public route behavior remain unchanged.
- Expected reduction remains approximately 410 source lines and two direct dependencies.
