// Main client
export { QuickwitClient } from "./client";
export { Index } from "./index-handle";

// Query and aggregation builders
export { QueryBuilder } from "./search/query-builder";
export { AggregationBuilder } from "./search/aggregation-builder";

// Error classes
export {
  QuickwitError,
  QuickwitErrorCode,
  ConnectionError,
  TimeoutError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  createErrorFromStatus,
  type ErrorDetails,
} from "./errors";

// Core types
export type {
  QuickwitConfig,
  HealthResponse,
  IndexMetadata,
  IndexConfig,
  DocMapping,
  FieldMapping,
  IndexingSettings,
  SearchSettings,
  RetentionPolicy,
  SourceConfig,
  HttpMethod,
  ApiResponse,
  // Ingest types
  CommitMode,
  IngestOptions,
  IngestResponse,
  // Index management types
  CreateIndexRequest,
} from "./types";

// Search types
export type {
  SearchRequestParams,
  SearchResponse,
  SearchHit,
  SortOrder,
  SortSpec,
  BuiltQuery,
} from "./search/types";

// Aggregation types
export type {
  AggregationConfig,
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
  PercentilesAggregation,
  AggregationResult,
  BucketAggregationResult,
  AggregationBucket,
  MetricAggregationResult,
  StatsAggregationResult,
  PercentilesAggregationResult,
} from "./search/types";

// Aggregation builder option types
export type {
  TermsOptions,
  HistogramOptions,
  DateHistogramOptions,
  RangeDefinition,
  RangeOptions,
  MetricOptions,
  PercentilesOptions,
} from "./search/aggregation-builder";
