// Main client
export { QuickwitClient } from "./client";
export { Index } from "./index-handle";

// Query and aggregation builders
export { QueryBuilder } from "./search/query-builder";
export { AggregationBuilder } from "./search/aggregation-builder";
export { TraceIndex } from "./tracing/trace-index";

// Type helpers
export { isFastFieldEnabled } from "./types";

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
  RequestOptions,
  HealthResponse,
  IndexMetadata,
  IndexConfig,
  DocMapping,
  FieldMapping,
  TextFieldMapping,
  NumericFieldMapping,
  BoolOrIpFieldMapping,
  DatetimeFieldMapping,
  BytesFieldMapping,
  JsonFieldMapping,
  ObjectFieldMapping,
  ConcatenateFieldMapping,
  ArrayFieldMapping,
  FastFieldConfig,
  FastFieldNormalizer,
  IndexingSettings,
  IngestSettings,
  MergePolicy,
  ResourcesConfig,
  SearchSettings,
  RetentionPolicy,
  SourceConfig,
  SourceConfigRequest,
  SourceInputFormat,
  FileSourceParams,
  FileSourceNotification,
  KafkaSourceParams,
  KinesisSourceParams,
  PubSubSourceParams,
  PulsarSourceParams,
  PulsarSourceAuth,
  TransformConfig,
  TokenizerEntry,
  HttpMethod,
  ApiResponse,
  // Ingest types
  CommitMode,
  IngestOptions,
  IngestResponse,
  IngestParseFailure,
  // Index management types
  CreateIndexRequest,
  IndexStats,
  FileEntry,
  // Options types
  ListIndexesOptions,
  CreateIndexOptions,
  DeleteIndexOptions,
  UpdateIndexOptions,
  UpdateSourceOptions,
  QuickwitVersion,
  ClusterSnapshot,
  ClusterNodeId,
  DeleteQueryRequest,
  DeleteQuery,
  DeleteTask,
  IndexTemplate,
} from "./types";

// Search types
export type {
  SearchRequestParams,
  SearchResponse,
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
  ExtendedStatsAggregation,
  PercentilesAggregation,
  CardinalityAggregation,
  NumericBounds,
  AggregationResult,
  BucketAggregationResult,
  AggregationBucket,
  MetricAggregationResult,
  StatsAggregationResult,
  ExtendedStatsAggregationResult,
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
  ExtendedStatsOptions,
} from "./search/aggregation-builder";

export type {
  OtlpProtobufPayload,
  OtlpTraceIngestOptions,
  OtlpTraceExportResponse,
  TraceSearchParams,
  JaegerResponse,
  JaegerValueType,
  JaegerKeyValue,
  JaegerLog,
  JaegerSpanReference,
  JaegerSpan,
  JaegerProcess,
  JaegerTrace,
} from "./tracing/types";
