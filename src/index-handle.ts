import type { Fetcher } from "./utils/fetcher";
import type {
  SearchRequestParams,
  SearchResponse,
  BuiltQuery,
} from "./search/types";
import type { IngestOptions, IngestResponse } from "./types";
import { QueryBuilder } from "./search/query-builder";
import { toNDJSON } from "./utils/ndjson";
import { ValidationError } from "./errors";

/**
 * Handle for operations on a specific Quickwit index
 */
export class Index {
  private readonly fetcher: Fetcher;
  private readonly indexId: string;

  constructor(fetcher: Fetcher, indexId: string) {
    this.fetcher = fetcher;
    this.indexId = indexId;
  }

  /**
   * Get the index ID
   */
  get id(): string {
    return this.indexId;
  }

  /**
   * Create a new QueryBuilder for this index
   *
   * @param queryString - Optional initial query string
   * @returns A new QueryBuilder instance
   *
   * @example
   * ```typescript
   * const results = await index.search(
   *   index.query("error")
   *     .timeRange(startTs, endTs)
   *     .limit(20)
   * );
   * ```
   */
  query(queryString?: string): QueryBuilder {
    return new QueryBuilder(queryString);
  }

  /**
   * Execute a search query on this index
   *
   * @param query - Query parameters, QueryBuilder, or BuiltQuery
   * @returns Search response with hits and aggregations
   *
   * @example
   * ```typescript
   * // Simple string query
   * const results = await index.search("level:error");
   *
   * // Query parameters object
   * const results = await index.search({
   *   query: "level:error",
   *   max_hits: 10,
   *   sort_by: "-timestamp"
   * });
   *
   * // Using QueryBuilder
   * const results = await index.search(
   *   index.query("error").limit(10).sortBy("-timestamp")
   * );
   * ```
   */
  async search<T = Record<string, unknown>>(
    query?: string | SearchRequestParams | QueryBuilder | BuiltQuery
  ): Promise<SearchResponse<T>> {
    const { params, usePost } = this.normalizeQuery(query);
    const path = `/api/v1/${this.indexId}/search`;

    if (usePost) {
      return this.fetcher.post<SearchResponse<T>>(path, params);
    }

    // Convert params to query string format for GET
    const queryParams: Record<string, string | number | boolean | undefined> =
      {};

    if (params.query !== undefined) {
      queryParams.query = params.query;
    }
    if (params.max_hits !== undefined) {
      queryParams.max_hits = params.max_hits;
    }
    if (params.start_offset !== undefined) {
      queryParams.start_offset = params.start_offset;
    }
    if (params.start_timestamp !== undefined) {
      queryParams.start_timestamp = params.start_timestamp;
    }
    if (params.end_timestamp !== undefined) {
      queryParams.end_timestamp = params.end_timestamp;
    }
    if (params.sort_by !== undefined) {
      queryParams.sort_by = params.sort_by;
    }
    if (params.count_all !== undefined) {
      queryParams.count_all = params.count_all;
    }
    if (params.search_fields !== undefined && params.search_fields.length > 0) {
      queryParams.search_fields = params.search_fields.join(",");
    }
    if (params.snippet_fields !== undefined && params.snippet_fields.length > 0) {
      queryParams.snippet_fields = params.snippet_fields.join(",");
    }

    return this.fetcher.get<SearchResponse<T>>(path, { params: queryParams });
  }

  /**
   * Execute a search query and return only the hits
   *
   * @param query - Query parameters, QueryBuilder, or BuiltQuery
   * @returns Array of document sources
   */
  async searchHits<T = Record<string, unknown>>(
    query?: string | SearchRequestParams | QueryBuilder | BuiltQuery
  ): Promise<T[]> {
    const response = await this.search<T>(query);
    return response.hits.map((hit) => hit._source);
  }

  /**
   * Execute a search query and return the first hit
   *
   * @param query - Query parameters, QueryBuilder, or BuiltQuery
   * @returns First document source or undefined if no hits
   */
  async searchFirst<T = Record<string, unknown>>(
    query?: string | SearchRequestParams | QueryBuilder | BuiltQuery
  ): Promise<T | undefined> {
    // Ensure we only fetch one result
    const { params } = this.normalizeQuery(query);
    params.max_hits = 1;

    const response = await this.search<T>(params);
    return response.hits[0]?._source;
  }

  /**
   * Count documents matching a query
   *
   * @param query - Query string or parameters
   * @returns Number of matching documents
   */
  async count(query?: string | SearchRequestParams | QueryBuilder): Promise<number> {
    const { params } = this.normalizeQuery(query);
    params.max_hits = 0;
    params.count_all = true;

    const response = await this.search(params);
    return response.num_hits;
  }

  /**
   * Ingest documents into this index
   *
   * @param documents - Array of documents to ingest
   * @param options - Ingest options (commit mode)
   * @returns Ingest response with number of documents queued
   *
   * @example
   * ```typescript
   * // Ingest with auto commit (default)
   * const result = await index.ingest([
   *   { timestamp: Date.now(), level: "info", message: "Hello" },
   *   { timestamp: Date.now(), level: "error", message: "Something failed" }
   * ]);
   *
   * // Ingest with forced commit (documents immediately searchable)
   * const result = await index.ingest(documents, { commit: "force" });
   * ```
   */
  async ingest<T extends Record<string, unknown>>(
    documents: T[],
    options?: IngestOptions
  ): Promise<IngestResponse> {
    if (documents.length === 0) {
      throw new ValidationError("Cannot ingest empty document array", {
        fields: ["documents"],
      });
    }

    const ndjsonBody = toNDJSON(documents);
    const path = `/api/v1/${this.indexId}/ingest`;

    const params: Record<string, string> = {};
    if (options?.commit) {
      params.commit = options.commit;
    }

    return this.fetcher.postNDJSON<IngestResponse>(path, ndjsonBody, { params });
  }

  /**
   * Normalize different query input types to params and usePost flag
   */
  private normalizeQuery(
    query?: string | SearchRequestParams | QueryBuilder | BuiltQuery
  ): { params: SearchRequestParams; usePost: boolean } {
    if (query === undefined) {
      return { params: {}, usePost: false };
    }

    if (typeof query === "string") {
      return { params: { query }, usePost: false };
    }

    if (query instanceof QueryBuilder) {
      const built = query.build();
      return { params: built.params, usePost: built.requiresPost };
    }

    // Check if it's a BuiltQuery
    if ("params" in query && "requiresPost" in query) {
      return { params: query.params, usePost: query.requiresPost };
    }

    // It's a SearchRequestParams
    const hasAggs = query.aggs !== undefined && Object.keys(query.aggs).length > 0;
    return { params: query, usePost: hasAggs };
  }
}
