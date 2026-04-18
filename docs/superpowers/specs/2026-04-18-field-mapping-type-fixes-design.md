# Field Mapping Type Fixes

**Date:** 2026-04-18
**Scope:** `src/types.ts`, `src/index.ts`, `tests/unit.test.ts`

## Context

Downstream consumer (Logwiz) reported three issues with `quickwit-js` types against
a Quickwit 0.9 cluster. Before designing, we verified each issue against:

- A live Quickwit 0.9 cluster (`GET /api/v1/indexes`, 4 indexes, 58 fields, 14 sources).
- Quickwit upstream Rust source (`quickwit-doc-mapper/src/doc_mapper/field_mapping_entry.rs`,
  `quickwit-config/src/source_config/{mod.rs,serialize.rs}`).

Summary of verification:

| Issue | Reported | Verified | Action |
|-------|----------|----------|--------|
| 1. `fast` type is wrong | HIGH | **Confirmed.** Live cluster emits `fast: false \| true \| { normalizer: "raw" }`. Upstream enum is `Disabled \| EnabledWithDefaultNormalizer \| EnabledWithNormalizer { normalizer: QuickwitTextNormalizer }` where `QuickwitTextNormalizer` has variants `Raw`, `Lowercase`. | Fix. |
| 2. `SourceConfig` missing pipeline fields | MEDIUM | **Stale request.** `desired_num_pipelines` / `max_num_pipelines_per_indexer` are v0.7-only legacy fields; consolidated into `num_pipelines` in v0.8+. Live 0.9 cluster does not emit them. | Skip. Document finding. |
| 3. Per-field `description` | LOW (verify first) | **Confirmed present in schema.** Every field-type struct has `pub description: Option<String>` (lines 88, 119, 146, 248, 432, 575, 666 in `field_mapping_entry.rs`). Not populated on the live cluster, but valid API surface. | Add. |

## Goals

- Correctly model the `fast` wire format so consumer code like `f.fast === true`
  works deterministically or is replaced by a sound check.
- Give consumers a one-call helper to ask "is fast on?" without having to know
  about the normalizer shape.
- Surface `description` so consumers can read/display it.

## Non-goals

- **`SourceConfig` pipeline fields.** `desired_num_pipelines` and
  `max_num_pipelines_per_indexer` will NOT be added. They are v0.7-only and
  consolidated into `num_pipelines` since v0.8
  (`quickwit-config/src/source_config/serialize.rs`, `SourceConfigV0_8`,
  lines 232-269). Logwiz's existing `num_pipelines: number` on `SourceConfig`
  already covers every current cluster. If Logwiz is hand-writing v0.7 configs,
  they should migrate.
- Deprecating `SourceConfig.num_pipelines` — it remains the canonical field.
- A `getFastFieldNormalizer(f)` helper — one-line consumer code
  (`typeof f.fast === "object" ? f.fast.normalizer : undefined`) is sufficient
  and does not warrant API surface.
- A new file for the helper. It co-locates with its type in `types.ts`, matching
  the pattern of `createErrorFromStatus` in `errors.ts`.

## Design

### Type changes in `src/types.ts`

Add above the `FieldMapping` interface:

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

In the `FieldMapping` interface:

- Change `fast?: boolean;` → `fast?: FastFieldConfig;`.
- Add `description?: string;` with a JSDoc line:
  `/** Optional human-readable description of the field (Quickwit 0.8+). */`.

**Why literal union rather than `string`:** the upstream `QuickwitTextNormalizer`
enum has exactly two variants today. Literal union catches typos in consumer
code (`{ normalizer: "rawe" }` → type error). A future Quickwit normalizer is
a version bump concern, same as every other enum on this type.

### Helper in `src/types.ts`

Exported from the same file, after `FieldMapping`:

```ts
/**
 * Returns true if fast columnar storage is enabled for this field.
 * Fast is ON when `fast` is `true` or a `{ normalizer }` object.
 * Fast is OFF when `fast` is `false` or missing.
 */
export function isFastFieldEnabled(f: FieldMapping): boolean {
  return f.fast !== undefined && f.fast !== false;
}
```

### Exports in `src/index.ts`

- Add `FastFieldConfig` and `FastFieldNormalizer` to the existing
  `export type { ... } from "./types";` block.
- Add `export { isFastFieldEnabled } from "./types";` as a new value export,
  placed immediately after the `AggregationBuilder` export line.

### Tests in `tests/unit.test.ts`

Add one focused test group. Cases chosen for full branch coverage of the helper
and the three `FastFieldConfig` shapes:

```ts
describe("isFastFieldEnabled", () => {
  const mk = (fast: FieldMapping["fast"]): FieldMapping => ({
    name: "f",
    type: "text",
    fast,
  });
  test("undefined → false", () => expect(isFastFieldEnabled(mk(undefined))).toBe(false));
  test("false → false",     () => expect(isFastFieldEnabled(mk(false))).toBe(false));
  test("true → true",       () => expect(isFastFieldEnabled(mk(true))).toBe(true));
  test("normalizer:raw → true",
    () => expect(isFastFieldEnabled(mk({ normalizer: "raw" }))).toBe(true));
  test("normalizer:lowercase → true",
    () => expect(isFastFieldEnabled(mk({ normalizer: "lowercase" }))).toBe(true));
});
```

Imports for the test file: add `isFastFieldEnabled` and `FieldMapping` from
`../src` if not already imported.

## Compatibility

- **Type widening:** `fast: boolean` → `fast: boolean | { normalizer: ... }` is a
  strict widening. Existing consumers doing `f.fast === true` or
  `if (f.fast)` continue to compile. They are the **buggy** callers this patch
  exists to fix — after the patch, the type system and `isFastFieldEnabled` let
  them notice and update.
- **Runtime:** no changes.
- **`description`:** new optional field, no impact on existing code.

## Verification checklist (for implementation plan)

- `bun run build` passes (types compile, ESM + CJS outputs).
- `bun test tests/unit.test.ts` passes including the new cases.
- `bun test tests/integration.test.ts` still passes against a live cluster (no
  regression; this change is purely additive on the wire).
- Manual: in an editor, hover on `FieldMapping.fast` — shows the union type.
  `isFastFieldEnabled` is discoverable from the package root import.

## Risks

- **Literal normalizer widening:** If Quickwit adds a new normalizer before the
  SDK catches up, consumers deserializing that field get a type error. Acceptable
  — it surfaces the missing SDK update rather than silently corrupting.
- **No structural/runtime validation:** the SDK trusts the server to send
  one of the documented shapes. We already trust the server for every other
  type in `types.ts`; keeping this consistent is preferable to introducing a
  runtime guard only here.
