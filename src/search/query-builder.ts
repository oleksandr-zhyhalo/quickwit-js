import type {
  SearchRequestParams,
  AggregationConfig,
  SortOrder,
  BuiltQuery,
} from "./types";
import { ValidationError } from "../errors";

/**
 * Fluent builder for constructing search queries
 *
 * @example
 * ```typescript
 * const query = new QueryBuilder()
 *   .query("error")
 *   .timeRange(startTs, endTs)
 *   .limit(20)
 *   .sortBy("timestamp", "desc")
 *   .agg("by_level", AggregationBuilder.terms("level"))
 *   .build();
 * ```
 */
export class QueryBuilder {
  private _query?: string;
  private _maxHits?: number;
  private _startOffset?: number;
  private _searchFields?: string[];
  private _snippetFields?: string[];
  private _startTimestamp?: number;
  private _endTimestamp?: number;
  private _sortBy?: string;
  private _aggs: Record<string, AggregationConfig> = {};
  private _countAll?: boolean;
  private _allowFailedSplits?: boolean;

  /**
   * Create a new QueryBuilder, optionally with an initial query string
   */
  constructor(queryString?: string) {
    if (queryString !== undefined) {
      this._query = queryString;
    }
  }

  /**
   * Set the full-text search query string
   *
   * @param queryString - Query in Quickwit query language
   * @returns this for chaining
   *
   * @example
   * ```typescript
   * builder.query("level:error AND service:api")
   * ```
   */
  query(queryString: string): this {
    this._query = queryString;
    return this;
  }

  /**
   * Set the maximum number of hits to return
   *
   * @param limit - Maximum number of documents to return
   * @returns this for chaining
   */
  limit(limit: number): this {
    if (limit < 0) {
      throw new ValidationError("Limit must be non-negative", {
        fields: ["max_hits"],
      });
    }
    this._maxHits = limit;
    return this;
  }

  /**
   * Alias for limit()
   */
  maxHits(limit: number): this {
    return this.limit(limit);
  }

  /**
   * Set the starting offset for pagination
   *
   * @param offset - Number of documents to skip
   * @returns this for chaining
   */
  offset(offset: number): this {
    if (offset < 0) {
      throw new ValidationError("Offset must be non-negative", {
        fields: ["start_offset"],
      });
    }
    this._startOffset = offset;
    return this;
  }

  /**
   * Alias for offset()
   */
  startOffset(offset: number): this {
    return this.offset(offset);
  }

  /**
   * Set the fields to search in
   *
   * @param fields - Field names to search
   * @returns this for chaining
   */
  searchFields(...fields: string[]): this {
    this._searchFields = fields;
    return this;
  }

  /**
   * Set the fields to return highlighted snippets for
   *
   * @param fields - Field names to generate snippets for
   * @returns this for chaining
   */
  snippetFields(...fields: string[]): this {
    this._snippetFields = fields;
    return this;
  }

  /**
   * Set a time range filter using Unix timestamps
   *
   * @param start - Start timestamp (seconds since epoch, inclusive)
   * @param end - End timestamp (seconds since epoch, exclusive)
   * @returns this for chaining
   */
  timeRange(start?: number, end?: number): this {
    if (start !== undefined) {
      this._startTimestamp = start;
    }
    if (end !== undefined) {
      this._endTimestamp = end;
    }
    return this;
  }

  /**
   * Set a time range filter using Date objects
   *
   * @param start - Start date (inclusive)
   * @param end - End date (exclusive)
   * @returns this for chaining
   */
  dateRange(start?: Date, end?: Date): this {
    if (start !== undefined) {
      this._startTimestamp = Math.floor(start.getTime() / 1000);
    }
    if (end !== undefined) {
      this._endTimestamp = Math.floor(end.getTime() / 1000);
    }
    return this;
  }

  /**
   * Set the start timestamp for the time range
   *
   * @param timestamp - Start timestamp (seconds since epoch)
   * @returns this for chaining
   */
  startTimestamp(timestamp: number): this {
    this._startTimestamp = timestamp;
    return this;
  }

  /**
   * Set the end timestamp for the time range
   *
   * @param timestamp - End timestamp (seconds since epoch)
   * @returns this for chaining
   */
  endTimestamp(timestamp: number): this {
    this._endTimestamp = timestamp;
    return this;
  }

  /**
   * Set the sort order
   *
   * @param field - Field name to sort by
   * @param order - Sort order ("asc" or "desc")
   * @returns this for chaining
   *
   * @example
   * ```typescript
   * // Sort by timestamp descending
   * builder.sortBy("timestamp", "desc")
   *
   * // Using shorthand (prefix with '-' for descending)
   * builder.sortBy("-timestamp")
   * ```
   */
  sortBy(field: string, order?: SortOrder): this {
    if (order) {
      this._sortBy = order === "desc" ? `-${field}` : field;
    } else {
      // Support shorthand: "-field" for descending
      this._sortBy = field;
    }
    return this;
  }

  /**
   * Add an aggregation to the query
   *
   * @param name - Name for the aggregation in the response
   * @param config - Aggregation configuration (use AggregationBuilder)
   * @returns this for chaining
   *
   * @example
   * ```typescript
   * builder.agg("by_level", AggregationBuilder.terms("level"))
   * ```
   */
  agg(name: string, config: AggregationConfig): this {
    this._aggs[name] = config;
    return this;
  }

  /**
   * Add multiple aggregations at once
   *
   * @param aggs - Record of aggregation name to configuration
   * @returns this for chaining
   */
  aggs(aggs: Record<string, AggregationConfig>): this {
    Object.assign(this._aggs, aggs);
    return this;
  }

  /**
   * Enable counting all matching documents (slower but accurate)
   *
   * @param countAll - Whether to count all documents
   * @returns this for chaining
   */
  countAll(countAll = true): this {
    this._countAll = countAll;
    return this;
  }

  /**
   * Allow partial results from failed splits
   *
   * @param allow - Whether to allow failed splits (default: true)
   * @returns this for chaining
   */
  allowFailedSplits(allow = true): this {
    this._allowFailedSplits = allow;
    return this;
  }

  /**
   * Build the query parameters
   *
   * @returns Built query with params and metadata
   */
  build(): BuiltQuery {
    const params: SearchRequestParams = {};

    if (this._query !== undefined) {
      params.query = this._query;
    }
    if (this._maxHits !== undefined) {
      params.max_hits = this._maxHits;
    }
    if (this._startOffset !== undefined) {
      params.start_offset = this._startOffset;
    }
    if (this._searchFields !== undefined && this._searchFields.length > 0) {
      params.search_fields = this._searchFields;
    }
    if (this._snippetFields !== undefined && this._snippetFields.length > 0) {
      params.snippet_fields = this._snippetFields;
    }
    if (this._startTimestamp !== undefined) {
      params.start_timestamp = this._startTimestamp;
    }
    if (this._endTimestamp !== undefined) {
      params.end_timestamp = this._endTimestamp;
    }
    if (this._sortBy !== undefined) {
      params.sort_by = [this._sortBy];
    }
    if (this._countAll !== undefined) {
      params.count_all = this._countAll;
    }
    if (this._allowFailedSplits !== undefined) {
      params.allow_failed_splits = this._allowFailedSplits;
    }

    const hasAggs = Object.keys(this._aggs).length > 0;
    if (hasAggs) {
      params.aggs = this._aggs;
    }

    return {
      params,
      requiresPost: hasAggs,
    };
  }

  /**
   * Get the built parameters (convenience method)
   */
  toParams(): SearchRequestParams {
    return this.build().params;
  }

  /**
   * Clone this builder to create a new independent instance
   */
  clone(): QueryBuilder {
    const clone = new QueryBuilder();
    clone._query = this._query;
    clone._maxHits = this._maxHits;
    clone._startOffset = this._startOffset;
    clone._searchFields = this._searchFields ? [...this._searchFields] : undefined;
    clone._snippetFields = this._snippetFields ? [...this._snippetFields] : undefined;
    clone._startTimestamp = this._startTimestamp;
    clone._endTimestamp = this._endTimestamp;
    clone._sortBy = this._sortBy;
    clone._aggs = { ...this._aggs };
    clone._countAll = this._countAll;
    clone._allowFailedSplits = this._allowFailedSplits;
    return clone;
  }
}
