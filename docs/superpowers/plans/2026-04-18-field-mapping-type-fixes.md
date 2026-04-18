# Field Mapping Type Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct `FieldMapping.fast` to match Quickwit's wire format (`boolean | { normalizer }`), add an `isFastFieldEnabled` helper, and add the missing `description` field.

**Architecture:** Pure type + helper patch. One source file (`src/types.ts`), one re-export file (`src/index.ts`), one test file (`tests/unit.test.ts`). No runtime behavior changes. Test-first.

**Tech Stack:** TypeScript strict, Bun (`bun test`, `bun run build`), no new dependencies.

**Spec:** [`docs/superpowers/specs/2026-04-18-field-mapping-type-fixes-design.md`](../specs/2026-04-18-field-mapping-type-fixes-design.md)

**House rule — commits:** This repo's owner commits manually. Do NOT run `git commit` at any point. Each task ends with a **Checkpoint** step instead — stop there, summarize what changed, and wait for the owner to review before moving to the next task.

---

## File Map

| File | Purpose | Change |
|------|---------|--------|
| `src/types.ts` | Public type definitions | Add `FastFieldNormalizer`, `FastFieldConfig` types; change `FieldMapping.fast`; add `FieldMapping.description`; add `isFastFieldEnabled` function. |
| `src/index.ts` | Public re-exports | Add type exports for `FastFieldConfig`, `FastFieldNormalizer`; add value export for `isFastFieldEnabled`. |
| `tests/unit.test.ts` | Unit tests | Add one `describe("isFastFieldEnabled", …)` block with 5 cases. |

No other files are touched. No new files are created.

---

## Task 1: Add the `isFastFieldEnabled` test block (failing)

TDD first. Tests go in before implementation.

**Files:**
- Modify: `tests/unit.test.ts` (imports at top + append new describe block at end of file)

- [ ] **Step 1.1: Extend the import from `../src`**

Open `tests/unit.test.ts`. Locate the existing import block (lines 2-14). Add `isFastFieldEnabled` to the imported value names and add a separate `type`-only import line for `FieldMapping`.

Replace:

```ts
import {
  QueryBuilder,
  AggregationBuilder,
  QuickwitError,
  QuickwitErrorCode,
  ConnectionError,
  TimeoutError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  createErrorFromStatus,
} from "../src";
```

With:

```ts
import {
  QueryBuilder,
  AggregationBuilder,
  QuickwitError,
  QuickwitErrorCode,
  ConnectionError,
  TimeoutError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  createErrorFromStatus,
  isFastFieldEnabled,
} from "../src";
import type { FieldMapping } from "../src";
```

- [ ] **Step 1.2: Append the new describe block to the end of the test file**

Append to the very end of `tests/unit.test.ts`:

```ts
// ============================================================================
// isFastFieldEnabled Tests
// ============================================================================

describe("isFastFieldEnabled", () => {
  const mk = (fast: FieldMapping["fast"]): FieldMapping => ({
    name: "f",
    type: "text",
    fast,
  });

  test("undefined → false", () => {
    expect(isFastFieldEnabled(mk(undefined))).toBe(false);
  });

  test("false → false", () => {
    expect(isFastFieldEnabled(mk(false))).toBe(false);
  });

  test("true → true", () => {
    expect(isFastFieldEnabled(mk(true))).toBe(true);
  });

  test("normalizer raw → true", () => {
    expect(isFastFieldEnabled(mk({ normalizer: "raw" }))).toBe(true);
  });

  test("normalizer lowercase → true", () => {
    expect(isFastFieldEnabled(mk({ normalizer: "lowercase" }))).toBe(true);
  });
});
```

- [ ] **Step 1.3: Run the tests to verify they fail for the expected reason**

Run: `bun test tests/unit.test.ts`

**Expected:** The test run fails at the **type-check / parse stage** (or at module load) because `isFastFieldEnabled` is not exported from `../src`. The error should mention `isFastFieldEnabled`. If instead the tests run and fail on assertions, something is wrong — stop and investigate before moving on.

- [ ] **Step 1.4: Checkpoint**

Summarize for the owner:
- Added `isFastFieldEnabled` + `type FieldMapping` imports to `tests/unit.test.ts`.
- Appended a 5-case describe block.
- Confirmed the test suite fails because the helper does not yet exist.

**Do not commit.** Wait for the owner before proceeding to Task 2.

---

## Task 2: Add `FastFieldNormalizer` and `FastFieldConfig` types, change `FieldMapping.fast`, add `description`

**Files:**
- Modify: `src/types.ts`
  - Insert new types immediately before the `FieldMapping` interface (which currently begins at line 145).
  - Modify the `fast` field inside `FieldMapping` (currently line 179).
  - Add a new `description` field inside `FieldMapping`.

- [ ] **Step 2.1: Insert `FastFieldNormalizer` and `FastFieldConfig` type declarations before `FieldMapping`**

In `src/types.ts`, find this block (starts at line 142):

```ts
/**
 * Field mapping configuration
 */
export interface FieldMapping {
```

Insert the following **before** the `/**` comment that starts the `FieldMapping` docblock:

```ts
/** Normalizer name for text/json fields with fast columnar storage. */
export type FastFieldNormalizer = "raw" | "lowercase";

/**
 * Quickwit serializes `fast` as one of:
 *   - `false`    — disabled
 *   - `true`     — enabled with default normalizer (text/json) or plain-fast (numeric)
 *   - `{ normalizer }` — enabled with a specific normalizer (text/json only)
 *
 * Use `isFastFieldEnabled(field)` to check whether fast storage is on — a
 * plain `=== true` check silently misses the object form.
 */
export type FastFieldConfig = boolean | { normalizer: FastFieldNormalizer };

```

(Note the trailing blank line so there is a separator before the `FieldMapping` docblock.)

- [ ] **Step 2.2: Change `FieldMapping.fast` type**

Still in `src/types.ts`, inside `FieldMapping`, replace:

```ts
  /** Whether to enable fast fields (columnar storage) */
  fast?: boolean;
```

With:

```ts
  /**
   * Fast columnar storage configuration.
   * See {@link FastFieldConfig} — can be `true`, `false`, or `{ normalizer }`.
   * Use {@link isFastFieldEnabled} to check whether fast is on.
   */
  fast?: FastFieldConfig;
```

- [ ] **Step 2.3: Add `description` field to `FieldMapping`**

Still in `src/types.ts`, inside `FieldMapping`, directly after the `name` field (which is the first field of the interface, around line 147), insert:

```ts
  /** Optional human-readable description of the field (Quickwit 0.8+). */
  description?: string;

```

So the top of the interface reads:

```ts
export interface FieldMapping {
  /** Field name */
  name: string;

  /** Optional human-readable description of the field (Quickwit 0.8+). */
  description?: string;

  /** Field type */
  type:
```

- [ ] **Step 2.4: Add the `isFastFieldEnabled` helper at the bottom of `src/types.ts`**

Append to the very end of `src/types.ts` (after the `FileEntry` interface, which is currently the last export in the file):

```ts

// ============================================================================
// Helpers
// ============================================================================

/**
 * Returns true if fast columnar storage is enabled for this field.
 *
 * Fast is ON when `fast` is `true` or a `{ normalizer }` object.
 * Fast is OFF when `fast` is `false` or missing.
 *
 * Prefer this over `f.fast === true`, which silently misses the object form
 * used by text/json fields with an explicit normalizer.
 */
export function isFastFieldEnabled(f: FieldMapping): boolean {
  return f.fast !== undefined && f.fast !== false;
}
```

- [ ] **Step 2.5: TypeScript sanity check**

Run: `bunx tsc --noEmit`

**Expected:** Clean exit (no errors). If there are errors, they will most likely be:
- Pre-existing errors unrelated to this change — note and continue.
- An error from `src/index.ts` about `isFastFieldEnabled` not being re-exported yet — **this is fine**; that's Task 3's job. The important check is that `src/types.ts` itself is well-formed and no OTHER files error.

If `src/index.ts` is the only file with errors, proceed. Otherwise, stop and fix.

- [ ] **Step 2.6: Checkpoint**

Summarize for the owner:
- Added `FastFieldNormalizer` and `FastFieldConfig` type exports.
- Changed `FieldMapping.fast` to `FastFieldConfig` and added `description?: string`.
- Added the `isFastFieldEnabled` helper at the bottom of `src/types.ts`.
- `tsc --noEmit` clean (or only complains about `src/index.ts` — will fix in Task 3).

**Do not commit.** Wait for the owner before proceeding to Task 3.

---

## Task 3: Re-export the new type and helper from `src/index.ts`

**Files:**
- Modify: `src/index.ts`

- [ ] **Step 3.1: Add a value export for `isFastFieldEnabled`**

Open `src/index.ts`. Locate the block:

```ts
// Query and aggregation builders
export { QueryBuilder } from "./search/query-builder";
export { AggregationBuilder } from "./search/aggregation-builder";
```

Add a new line immediately after the `AggregationBuilder` export, so the block becomes:

```ts
// Query and aggregation builders
export { QueryBuilder } from "./search/query-builder";
export { AggregationBuilder } from "./search/aggregation-builder";

// Type helpers
export { isFastFieldEnabled } from "./types";
```

- [ ] **Step 3.2: Add `FastFieldConfig` and `FastFieldNormalizer` to the type-only export block**

Still in `src/index.ts`, locate the `// Core types` block (currently starting around line 23):

```ts
// Core types
export type {
  QuickwitConfig,
  HealthResponse,
  IndexMetadata,
  IndexConfig,
  DocMapping,
  FieldMapping,
```

Add the two new type names directly after `FieldMapping`:

```ts
// Core types
export type {
  QuickwitConfig,
  HealthResponse,
  IndexMetadata,
  IndexConfig,
  DocMapping,
  FieldMapping,
  FastFieldConfig,
  FastFieldNormalizer,
```

Leave the rest of the export list unchanged.

- [ ] **Step 3.3: Run the unit tests**

Run: `bun test tests/unit.test.ts`

**Expected:** All tests pass, including the 5 new `isFastFieldEnabled` cases. No type errors.

If any test fails, stop and investigate. Common causes:
- Typo in export name → `isFastFieldEnabled is not a function` or undefined.
- Import path mismatch → module resolution error.

- [ ] **Step 3.4: Full type check**

Run: `bunx tsc --noEmit`

**Expected:** Clean exit. No errors from any file.

- [ ] **Step 3.5: Build**

Run: `bun run build`

**Expected:** Build succeeds, producing `dist/` outputs. If the `package.json` build script is missing or misnamed, run it as configured in the repo; otherwise skip this step and note it in the checkpoint.

- [ ] **Step 3.6: Checkpoint**

Summarize for the owner:
- Added `isFastFieldEnabled` value export and `FastFieldConfig` / `FastFieldNormalizer` type exports to `src/index.ts`.
- `bun test tests/unit.test.ts` — all green.
- `bunx tsc --noEmit` — clean.
- `bun run build` — succeeded.

**Do not commit.** Wait for the owner.

---

## Task 4: Final verification

This is a cross-cutting sanity pass. No code changes.

- [ ] **Step 4.1: Full unit test suite**

Run: `bun test tests/unit.test.ts`

**Expected:** All previously-passing tests still pass. New 5 cases pass.

- [ ] **Step 4.2: Integration test sanity (optional)**

If a live Quickwit cluster is available at the integration test's configured endpoint:

Run: `bun test tests/integration.test.ts`

**Expected:** Results unchanged from before the patch. This change is purely type-level, so integration tests should neither improve nor regress. If they were previously failing for unrelated reasons, note that and do not treat as a blocker.

If no live cluster is available, skip this step and note it in the checkpoint.

- [ ] **Step 4.3: Manual surface check**

Open any editor that shows TypeScript hover info (VS Code, etc.) and import from the package root:

```ts
import { isFastFieldEnabled, type FastFieldConfig, type FieldMapping } from "quickwit-js";
```

Hover checks:
- `FastFieldConfig` → shows `boolean | { normalizer: "raw" | "lowercase" }`.
- `FieldMapping.fast` → shows `FastFieldConfig | undefined`.
- `FieldMapping.description` → shows `string | undefined` with the JSDoc.
- `isFastFieldEnabled` → shows `(f: FieldMapping) => boolean` with the JSDoc.

If hover info doesn't match, the TS build output may be stale — re-run `bun run build`.

This step can be skipped if no editor is available in the execution environment; note the skip in the checkpoint.

- [ ] **Step 4.4: Final checkpoint**

Summarize for the owner:
- All tasks complete. Full list of files touched: `src/types.ts`, `src/index.ts`, `tests/unit.test.ts`.
- Unit tests green (include count of new tests: 5).
- Build green.
- Integration tests: [status or "skipped — no cluster configured"].
- Manual surface check: [confirmed or "skipped — no editor"].

Mention the non-goal finding from the spec: `desired_num_pipelines` / `max_num_pipelines_per_indexer` were investigated and intentionally NOT added (v0.7-only legacy fields). This should be relayed to Logwiz so they know to stop expecting them.

Stop. Owner commits.

---

## Self-Review Notes

- **Spec coverage:** Issue 1 → Task 2 + Task 3. Issue 3 → Task 2 (description). Helper → Tasks 1/2/3. Tests → Task 1 (TDD: failing first) + Task 3 (passing). Issue 2 non-goal → documented in final checkpoint. ✓
- **Placeholder scan:** No TBD/TODO. Every code block is the literal content to write or run. ✓
- **Type consistency:** All tasks use the names `FastFieldConfig`, `FastFieldNormalizer`, `isFastFieldEnabled`, `FieldMapping.fast`, `FieldMapping.description` consistently. ✓
- **No commits:** Explicit house rule stated at top; each task ends in a checkpoint, not a commit. ✓
