/**
 * Search request parameters that can be passed as query params (GET)
 * or in the request body (POST)
 */
export interface SearchRequestParams {
  /** Full-text search query string (Quickwit query language) */
  query?: string;

  /** Maximum number of hits to return */
  max_hits?: number;

  /** Number of hits to skip (for pagination) */
  start_offset?: number;

  /** Fields to return in the response */
  search_fields?: string[];

  /** Snippet configuration for highlighting */
  snippet_fields?: string[];

  /** Start of time range filter (Unix timestamp in seconds) */
  start_timestamp?: number;

  /** End of time range filter (Unix timestamp in seconds) */
  end_timestamp?: number;

  /** Sort order (field name, prefix with '-' for descending) */
  sort_by?: string;

  /** Aggregations to compute */
  aggs?: Record<string, AggregationConfig>;

  /** Format for returned timestamps */
  format?: "json" | "pretty_json";

  /** Count all matching documents (slower but accurate) */
  count_all?: boolean;
}

/**
 * Search response from Quickwit
 */
export interface SearchResponse<T = Record<string, unknown>> {
  /** Matching documents */
  hits: SearchHit<T>[];

  /** Total number of matching documents (estimate or exact based on count_all) */
  num_hits: number;

  /** Time taken to execute the search in microseconds */
  elapsed_time_micros: number;

  /** Aggregation results (if aggregations were requested) */
  aggregations?: Record<string, AggregationResult>;

  /** Errors encountered during search (partial results) */
  errors?: string[];
}

/**
 * Individual search hit
 */
export interface SearchHit<T = Record<string, unknown>> {
  /** Document source */
  _source: T;

  /** Document score (relevance) */
  _score?: number;

  /** Highlighted snippets (if snippet_fields was specified) */
  _snippets?: Record<string, string[]>;

  /** Sort values used for this hit */
  _sort?: unknown[];
}

// ============================================================================
// Aggregation Types
// ============================================================================

/**
 * Union type for all aggregation configurations
 */
export type AggregationConfig =
  | TermsAggregation
  | HistogramAggregation
  | DateHistogramAggregation
  | RangeAggregation
  | AvgAggregation
  | SumAggregation
  | MinAggregation
  | MaxAggregation
  | CountAggregation
  | StatsAggregation
  | PercentilesAggregation;

/**
 * Terms aggregation - buckets by unique field values
 */
export interface TermsAggregation {
  terms: {
    /** Field to aggregate on */
    field: string;

    /** Maximum number of buckets to return */
    size?: number;

    /** Minimum document count for a bucket to be included */
    min_doc_count?: number;

    /** Order of buckets */
    order?: Record<string, "asc" | "desc">;

    /** Missing value handling */
    missing?: string | number;
  };

  /** Nested aggregations */
  aggs?: Record<string, AggregationConfig>;
}

/**
 * Histogram aggregation - buckets by numeric ranges
 */
export interface HistogramAggregation {
  histogram: {
    /** Field to aggregate on */
    field: string;

    /** Interval between buckets */
    interval: number;

    /** Minimum bucket key */
    min_bound?: number;

    /** Maximum bucket key */
    max_bound?: number;

    /** Minimum document count for a bucket */
    min_doc_count?: number;

    /** Offset for bucket boundaries */
    offset?: number;
  };

  /** Nested aggregations */
  aggs?: Record<string, AggregationConfig>;
}

/**
 * Date histogram aggregation - buckets by date/time intervals
 */
export interface DateHistogramAggregation {
  date_histogram: {
    /** Field to aggregate on (must be a datetime field) */
    field: string;

    /** Fixed interval (e.g., "1h", "1d", "1w") */
    fixed_interval?: string;

    /** Calendar interval (e.g., "month", "year") */
    calendar_interval?: string;

    /** Timezone for bucketing */
    time_zone?: string;

    /** Minimum document count for a bucket */
    min_doc_count?: number;

    /** Extended bounds for the histogram */
    extended_bounds?: {
      min: number | string;
      max: number | string;
    };

    /** Format for the returned date keys */
    format?: string;

    /** Offset for bucket boundaries */
    offset?: string;
  };

  /** Nested aggregations */
  aggs?: Record<string, AggregationConfig>;
}

/**
 * Range aggregation - buckets by specified numeric ranges
 */
export interface RangeAggregation {
  range: {
    /** Field to aggregate on */
    field: string;

    /** Range definitions */
    ranges: Array<{
      /** Optional key for the bucket */
      key?: string;
      /** Start of range (inclusive) */
      from?: number;
      /** End of range (exclusive) */
      to?: number;
    }>;

    /** Whether the ranges are keyed in the response */
    keyed?: boolean;
  };

  /** Nested aggregations */
  aggs?: Record<string, AggregationConfig>;
}

/**
 * Average metric aggregation
 */
export interface AvgAggregation {
  avg: {
    /** Field to compute average on */
    field: string;
    /** Value to use for missing field */
    missing?: number;
  };
}

/**
 * Sum metric aggregation
 */
export interface SumAggregation {
  sum: {
    /** Field to compute sum on */
    field: string;
    /** Value to use for missing field */
    missing?: number;
  };
}

/**
 * Min metric aggregation
 */
export interface MinAggregation {
  min: {
    /** Field to find minimum value on */
    field: string;
    /** Value to use for missing field */
    missing?: number;
  };
}

/**
 * Max metric aggregation
 */
export interface MaxAggregation {
  max: {
    /** Field to find maximum value on */
    field: string;
    /** Value to use for missing field */
    missing?: number;
  };
}

/**
 * Count metric aggregation
 */
export interface CountAggregation {
  value_count: {
    /** Field to count values on */
    field: string;
  };
}

/**
 * Stats metric aggregation (combines count, min, max, avg, sum)
 */
export interface StatsAggregation {
  stats: {
    /** Field to compute stats on */
    field: string;
    /** Value to use for missing field */
    missing?: number;
  };
}

/**
 * Percentiles metric aggregation
 */
export interface PercentilesAggregation {
  percentiles: {
    /** Field to compute percentiles on */
    field: string;
    /** Percentile values to compute (default: [1, 5, 25, 50, 75, 95, 99]) */
    percents?: number[];
    /** Value to use for missing field */
    missing?: number;
  };
}

// ============================================================================
// Aggregation Results
// ============================================================================

/**
 * Union type for all aggregation results
 */
export type AggregationResult =
  | BucketAggregationResult
  | MetricAggregationResult
  | StatsAggregationResult
  | PercentilesAggregationResult;

/**
 * Result for bucket aggregations (terms, histogram, date_histogram, range)
 */
export interface BucketAggregationResult {
  buckets: AggregationBucket[];

  /** For terms aggregation: count of documents not in top buckets */
  sum_other_doc_count?: number;

  /** For terms aggregation: number of unique terms */
  doc_count_error_upper_bound?: number;
}

/**
 * Individual bucket in a bucket aggregation result
 */
export interface AggregationBucket {
  /** Bucket key (string or number depending on aggregation type) */
  key: string | number;

  /** Key as string (for date_histogram) */
  key_as_string?: string;

  /** Number of documents in this bucket */
  doc_count: number;

  /** Nested aggregation results */
  [key: string]: unknown;
}

/**
 * Result for simple metric aggregations (avg, sum, min, max, count)
 */
export interface MetricAggregationResult {
  value: number | null;
}

/**
 * Result for stats aggregation
 */
export interface StatsAggregationResult {
  count: number;
  min: number | null;
  max: number | null;
  avg: number | null;
  sum: number;
}

/**
 * Result for percentiles aggregation
 */
export interface PercentilesAggregationResult {
  values: Record<string, number | null>;
}

// ============================================================================
// Query Builder Types
// ============================================================================

/**
 * Sort direction
 */
export type SortOrder = "asc" | "desc";

/**
 * Sort specification
 */
export interface SortSpec {
  field: string;
  order: SortOrder;
}

/**
 * Built query parameters from QueryBuilder
 */
export interface BuiltQuery {
  /** Query parameters for GET request */
  params: SearchRequestParams;

  /** Whether this query requires POST (has aggregations) */
  requiresPost: boolean;
}
