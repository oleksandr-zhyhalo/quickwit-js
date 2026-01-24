/**
 * NDJSON (Newline Delimited JSON) serialization utilities
 *
 * NDJSON is a format where each line is a valid JSON object,
 * separated by newline characters. It's commonly used for
 * streaming and batch data ingestion.
 */

/**
 * Convert an array of objects to NDJSON format
 *
 * @param documents - Array of documents to serialize
 * @returns NDJSON string with each document on a new line
 *
 * @example
 * ```typescript
 * const docs = [{ id: 1, name: "foo" }, { id: 2, name: "bar" }];
 * const ndjson = toNDJSON(docs);
 * // Result: '{"id":1,"name":"foo"}\n{"id":2,"name":"bar"}'
 * ```
 */
export function toNDJSON<T>(documents: T[]): string {
  if (documents.length === 0) {
    return "";
  }
  return documents.map((doc) => JSON.stringify(doc)).join("\n") + "\n";
}
