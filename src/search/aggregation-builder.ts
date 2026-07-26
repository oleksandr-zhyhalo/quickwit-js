import type {
  TermsAggregation,
  HistogramAggregation,
  DateHistogramAggregation,
  RangeAggregation,
  AvgAggregation,
  SumAggregation,
  MinAggregation,
  MaxAggregation,
  CountAggregation,
  StatsAggregation,
  ExtendedStatsAggregation,
  PercentilesAggregation,
  CardinalityAggregation,
  AggregationConfig,
} from "./types";

/**
 * Options for terms aggregation
 */
export interface TermsOptions {
  /** Maximum number of buckets to return (default: 10) */
  size?: number;
  /** Number of terms collected from each split */
  shardSize?: number;
  /** Include per-bucket count errors */
  showTermDocCountError?: boolean;
  /** Minimum document count for a bucket */
  minDocCount?: number;
  /** Order by field and direction */
  order?: Record<string, "asc" | "desc">;
  /** Value to use for missing field */
  missing?: string | number;
  /** Nested aggregations */
  aggs?: Record<string, AggregationConfig>;
}

/**
 * Options for histogram aggregation
 */
export interface HistogramOptions {
  /** Return buckets keyed by their serialized key */
  keyed?: boolean;
  /** Extend the bucket range */
  extendedBounds?: { min: number; max: number };
  /** Limit the bucket range */
  hardBounds?: { min: number; max: number };
  /** Minimum document count for a bucket */
  minDocCount?: number;
  /** Offset for bucket boundaries */
  offset?: number;
  /** Nested aggregations */
  aggs?: Record<string, AggregationConfig>;
}

/**
 * Options for date histogram aggregation
 */
export interface DateHistogramOptions {
  /** Return buckets keyed by their serialized key */
  keyed?: boolean;
  /** Minimum document count for a bucket */
  minDocCount?: number;
  /** Extended bounds for the histogram */
  extendedBounds?: {
    min: number | string;
    max: number | string;
  };
  /** Hard bounds for the histogram */
  hardBounds?: {
    min: number | string;
    max: number | string;
  };
  /** Offset for bucket boundaries */
  offset?: string;
  /** Nested aggregations */
  aggs?: Record<string, AggregationConfig>;
}

/**
 * Range definition for range aggregation
 */
export interface RangeDefinition {
  /** Optional key for the bucket */
  key?: string;
  /** Start of range (inclusive) */
  from?: number;
  /** End of range (exclusive) */
  to?: number;
}

/**
 * Options for range aggregation
 */
export interface RangeOptions {
  /** Whether the response should be keyed by range keys */
  keyed?: boolean;
  /** Nested aggregations */
  aggs?: Record<string, AggregationConfig>;
}

/**
 * Options for metric aggregations
 */
export interface MetricOptions {
  /** Value to use for missing field */
  missing?: number;
}

/**
 * Options for percentiles aggregation
 */
export interface PercentilesOptions extends MetricOptions {
  /** Percentile values to compute */
  percents?: number[];
  /** Return percentile values as an object */
  keyed?: boolean;
}

export interface ExtendedStatsOptions extends MetricOptions {
  sigma?: number;
}

/**
 * Static factory for building aggregation configurations
 *
 * @example
 * ```typescript
 * // Terms aggregation
 * const byLevel = AggregationBuilder.terms("level", { size: 10 });
 *
 * // Date histogram with nested aggregation
 * const overTime = AggregationBuilder.dateHistogram("timestamp", "1h", {
 *   aggs: {
 *     avg_response: AggregationBuilder.avg("response_time")
 *   }
 * });
 *
 * // Histogram
 * const bySize = AggregationBuilder.histogram("size", 1000);
 *
 * // Range buckets
 * const byResponseTime = AggregationBuilder.range("response_time", [
 *   { key: "fast", to: 100 },
 *   { key: "medium", from: 100, to: 500 },
 *   { key: "slow", from: 500 }
 * ]);
 * ```
 */
export class AggregationBuilder {
  /**
   * Create a terms aggregation
   *
   * @param field - Field to aggregate on
   * @param options - Aggregation options
   */
  static terms(field: string, options: TermsOptions = {}): TermsAggregation {
    const result: TermsAggregation = {
      terms: {
        field,
      },
    };

    if (options.size !== undefined) {
      result.terms.size = options.size;
    }
    if (options.shardSize !== undefined) {
      result.terms.shard_size = options.shardSize;
    }
    if (options.showTermDocCountError !== undefined) {
      result.terms.show_term_doc_count_error = options.showTermDocCountError;
    }
    if (options.minDocCount !== undefined) {
      result.terms.min_doc_count = options.minDocCount;
    }
    if (options.order !== undefined) {
      result.terms.order = options.order;
    }
    if (options.missing !== undefined) {
      result.terms.missing = options.missing;
    }
    if (options.aggs !== undefined) {
      result.aggs = options.aggs;
    }

    return result;
  }

  /**
   * Create a histogram aggregation
   *
   * @param field - Field to aggregate on
   * @param interval - Interval between buckets
   * @param options - Aggregation options
   */
  static histogram(
    field: string,
    interval: number,
    options: HistogramOptions = {}
  ): HistogramAggregation {
    const result: HistogramAggregation = {
      histogram: {
        field,
        interval,
      },
    };

    if (options.keyed !== undefined) {
      result.histogram.keyed = options.keyed;
    }
    if (options.extendedBounds !== undefined) {
      result.histogram.extended_bounds = options.extendedBounds;
    }
    if (options.hardBounds !== undefined) {
      result.histogram.hard_bounds = options.hardBounds;
    }
    if (options.minDocCount !== undefined) {
      result.histogram.min_doc_count = options.minDocCount;
    }
    if (options.offset !== undefined) {
      result.histogram.offset = options.offset;
    }
    if (options.aggs !== undefined) {
      result.aggs = options.aggs;
    }

    return result;
  }

  /**
   * Create a date histogram aggregation with fixed interval
   *
   * @param field - Datetime field to aggregate on
   * @param interval - Fixed interval (e.g., "1h", "1d", "5m")
   * @param options - Aggregation options
   */
  static dateHistogram(
    field: string,
    interval: string,
    options: DateHistogramOptions = {}
  ): DateHistogramAggregation {
    const result: DateHistogramAggregation = {
      date_histogram: {
        field,
        fixed_interval: interval,
      },
    };

    if (options.keyed !== undefined) {
      result.date_histogram.keyed = options.keyed;
    }
    if (options.minDocCount !== undefined) {
      result.date_histogram.min_doc_count = options.minDocCount;
    }
    if (options.extendedBounds !== undefined) {
      result.date_histogram.extended_bounds = options.extendedBounds;
    }
    if (options.hardBounds !== undefined) {
      result.date_histogram.hard_bounds = options.hardBounds;
    }
    if (options.offset !== undefined) {
      result.date_histogram.offset = options.offset;
    }
    if (options.aggs !== undefined) {
      result.aggs = options.aggs;
    }

    return result;
  }

  /**
   * Create a range aggregation
   *
   * @param field - Field to aggregate on
   * @param ranges - Range definitions
   * @param options - Aggregation options
   */
  static range(
    field: string,
    ranges: RangeDefinition[],
    options: RangeOptions = {}
  ): RangeAggregation {
    const result: RangeAggregation = {
      range: {
        field,
        ranges: ranges.map((r) => ({
          key: r.key,
          from: r.from,
          to: r.to,
        })),
      },
    };

    if (options.keyed !== undefined) {
      result.range.keyed = options.keyed;
    }
    if (options.aggs !== undefined) {
      result.aggs = options.aggs;
    }

    return result;
  }

  /**
   * Create an average metric aggregation
   *
   * @param field - Field to compute average on
   * @param options - Aggregation options
   */
  static avg(field: string, options: MetricOptions = {}): AvgAggregation {
    return {
      avg: {
        field,
        missing: options.missing,
      },
    };
  }

  /**
   * Create a sum metric aggregation
   *
   * @param field - Field to compute sum on
   * @param options - Aggregation options
   */
  static sum(field: string, options: MetricOptions = {}): SumAggregation {
    return {
      sum: {
        field,
        missing: options.missing,
      },
    };
  }

  /**
   * Create a min metric aggregation
   *
   * @param field - Field to find minimum value on
   * @param options - Aggregation options
   */
  static min(field: string, options: MetricOptions = {}): MinAggregation {
    return {
      min: {
        field,
        missing: options.missing,
      },
    };
  }

  /**
   * Create a max metric aggregation
   *
   * @param field - Field to find maximum value on
   * @param options - Aggregation options
   */
  static max(field: string, options: MetricOptions = {}): MaxAggregation {
    return {
      max: {
        field,
        missing: options.missing,
      },
    };
  }

  /**
   * Create a value count metric aggregation
   *
   * @param field - Field to count values on
   */
  static count(field: string, options: MetricOptions = {}): CountAggregation {
    return {
      value_count: {
        field,
        missing: options.missing,
      },
    };
  }

  /**
   * Create a stats metric aggregation
   *
   * @param field - Field to compute stats on
   * @param options - Aggregation options
   */
  static stats(field: string, options: MetricOptions = {}): StatsAggregation {
    return {
      stats: {
        field,
        missing: options.missing,
      },
    };
  }

  /** Create an extended stats metric aggregation. */
  static extendedStats(
    field: string,
    options: ExtendedStatsOptions = {}
  ): ExtendedStatsAggregation {
    return {
      extended_stats: {
        field,
        missing: options.missing,
        sigma: options.sigma,
      },
    };
  }

  /**
   * Create a percentiles metric aggregation
   *
   * @param field - Field to compute percentiles on
   * @param options - Aggregation options
   */
  static percentiles(
    field: string,
    options: PercentilesOptions = {}
  ): PercentilesAggregation {
    return {
      percentiles: {
        field,
        percents: options.percents,
        missing: options.missing,
        keyed: options.keyed,
      },
    };
  }

  /** Create a cardinality aggregation. */
  static cardinality(
    field: string,
    options: { missing?: string | number } = {}
  ): CardinalityAggregation {
    return {
      cardinality: {
        field,
        missing: options.missing,
      },
    };
  }
}
