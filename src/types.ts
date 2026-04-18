/**
 * Configuration options for QuickwitClient
 */
export interface QuickwitConfig {
  /** Base URL of the Quickwit server (e.g., "http://localhost:7280") */
  endpoint: string;

  /** Optional API key for authentication */
  apiKey?: string;

  /** Optional bearer token for authentication */
  bearerToken?: string;

  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;

  /** Default headers to include with every request */
  headers?: Record<string, string>;
}

/**
 * Response from the health check endpoint
 */
export interface HealthResponse {
  /** Whether the cluster is healthy */
  healthy: boolean;

  /** Cluster ID */
  cluster_id?: string;

  /** Current node ID */
  node_id?: string;

  /** Quickwit version */
  version?: string;
}

/**
 * Index metadata returned by Quickwit (matches VersionedIndexMetadata)
 */
export interface IndexMetadata {
  /** Version of the metadata format */
  version: string;

  /** Unique index UID (format: "index_id:ulid") */
  index_uid: string;

  /** Index configuration */
  index_config: IndexConfig;

  /** Checkpoint tracking source positions */
  checkpoint: Record<string, unknown>;

  /** Creation timestamp */
  create_timestamp?: number;

  /** Sources attached to the index */
  sources: SourceConfig[];
}

/**
 * Index configuration
 */
export interface IndexConfig {
  /** Version of the index configuration */
  version: string;

  /** Index ID */
  index_id: string;

  /** Index URI */
  index_uri?: string;

  /** Document mapping configuration */
  doc_mapping: DocMapping;

  /** Indexing settings */
  indexing_settings?: IndexingSettings;

  /** Search settings */
  search_settings?: SearchSettings;

  /** Retention policy */
  retention?: RetentionPolicy;
}

/**
 * Document mapping configuration
 */
export interface DocMapping {
  /** Document mapping UID */
  doc_mapping_uid?: string;

  /** Field mappings */
  field_mappings: FieldMapping[];

  /** Tag fields for filtering */
  tag_fields?: string[];

  /** Timestamp field name */
  timestamp_field?: string;

  /** Mode for handling unmapped fields */
  mode?: "lenient" | "strict" | "dynamic";

  /** Dynamic mapping options (when mode is "dynamic") */
  dynamic_mapping?: Record<string, unknown>;

  /** Partition key */
  partition_key?: string;

  /** Maximum number of partitions */
  max_num_partitions?: number;

  /** Whether to store the original source documents */
  store_source?: boolean;

  /** Whether to store document size in a fast field */
  store_document_size?: boolean;

  /** Whether to record field presence for exists queries */
  index_field_presence?: boolean;

  /** Custom tokenizer definitions */
  tokenizers?: TokenizerEntry[];
}

/**
 * Custom tokenizer definition
 */
export interface TokenizerEntry {
  /** Tokenizer name */
  name: string;

  /** Tokenizer type */
  type: string;

  /** Additional tokenizer-specific configuration */
  [key: string]: unknown;
}

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

/**
 * Field mapping configuration
 */
export interface FieldMapping {
  /** Field name */
  name: string;

  /** Optional human-readable description of the field (Quickwit 0.8+). */
  description?: string;

  /** Field type */
  type:
    | "text"
    | "i64"
    | "u64"
    | "f64"
    | "bool"
    | "datetime"
    | "bytes"
    | "json"
    | "ip"
    | "object"
    | "array";

  /** Whether the field is stored */
  stored?: boolean;

  /** Whether the field is indexed */
  indexed?: boolean;

  /** Tokenizer for text fields */
  tokenizer?: string;

  /** Whether to record term positions */
  record?: "basic" | "freq" | "position";

  /** Whether the field is required */
  required?: boolean;

  /**
   * Fast columnar storage configuration.
   * See {@link FastFieldConfig} — can be `true`, `false`, or `{ normalizer }`.
   * Use {@link isFastFieldEnabled} to check whether fast is on.
   */
  fast?: FastFieldConfig;

  /** Nested field mappings for object types */
  field_mappings?: FieldMapping[];

  /** Datetime input formats */
  input_formats?: string[];

  /** Datetime output format */
  output_format?: string;

  /** Fast datetime precision */
  fast_precision?: "seconds" | "milliseconds" | "microseconds" | "nanoseconds";

  /** Whether to store field norms for relevance scoring (text fields only, default: false) */
  fieldnorms?: boolean;

  /** Input format for bytes fields */
  input_format?: "hex" | "base64";
}

/**
 * Indexing settings
 */
export interface IndexingSettings {
  /** Commit timeout in seconds */
  commit_timeout_secs?: number;

  /** Split number of docs threshold */
  split_num_docs_target?: number;

  /** Docstore block size in bytes */
  docstore_blocksize?: number;

  /** Docstore compression level */
  docstore_compression_level?: number;

  /** Merge policy */
  merge_policy?: MergePolicy;

  /** Resources configuration */
  resources?: ResourcesConfig;
}

/**
 * Merge policy configuration
 */
export interface MergePolicy {
  /** Type of merge policy */
  type: "stable_log" | "no_merge" | "limit_merge";

  /** Minimum level size for stable_log */
  min_level_num_docs?: number;

  /** Merge factor */
  merge_factor?: number;

  /** Maximum merge factor */
  max_merge_factor?: number;

  /** Maturation period (e.g., "48 hours") */
  maturation_period?: string;

  /** Max finalize merge operations (limit_merge only) */
  max_finalize_merge_operations?: number;

  /** Max finalize split num docs (limit_merge only) */
  max_finalize_split_num_docs?: number;

  /** Max merge ops (limit_merge only) */
  max_merge_ops?: number;
}

/**
 * Resource configuration for indexing
 */
export interface ResourcesConfig {
  /** Heap size (e.g., "2 GB") */
  heap_size?: string;
}

/**
 * Search settings
 */
export interface SearchSettings {
  /** Default search fields */
  default_search_fields?: string[];
}

/**
 * Retention policy configuration
 */
export interface RetentionPolicy {
  /** Retention period (e.g., "90 days", "1 year") */
  period: string;

  /** Retention schedule (cron expression) */
  schedule?: string;
}

/**
 * Source configuration
 */
export interface SourceConfig {
  /** Version of the source configuration format */
  version?: string;

  /** Source ID */
  source_id: string;

  /** Source type */
  source_type:
    | "file"
    | "kafka"
    | "kinesis"
    | "pulsar"
    | "pubsub"
    | "ingest"
    | "ingest-api"
    | "ingest-cli"
    | "stdin"
    | "vec"
    | "void";

  /** Whether the source is enabled */
  enabled?: boolean;

  /** Number of pipelines */
  num_pipelines?: number;

  /** Source-specific parameters */
  params?: Record<string, unknown>;

  /** Transform configuration */
  transform?: TransformConfig;

  /** Input format */
  input_format?:
    | "json"
    | "plain_text"
    | "otlp_logs_json"
    | "otlp_logs_protobuf"
    | "otlp_traces_json"
    | "otlp_traces_protobuf";
}

/**
 * Transform configuration for sources
 */
export interface TransformConfig {
  /** VRL script for transformation */
  script: string;

  /** Timezone for datetime parsing */
  timezone?: string;
}

/**
 * HTTP method types
 */
export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T> {
  /** Response data */
  data: T;

  /** HTTP status code */
  status: number;

  /** Response headers */
  headers: Headers;
}

// ============================================================================
// Ingest Types
// ============================================================================

/**
 * Commit mode for document ingestion
 */
export type CommitMode = "auto" | "wait_for" | "force";

/**
 * Options for document ingestion
 */
export interface IngestOptions {
  /**
   * Controls when ingested documents become searchable
   * - "auto" (default): Documents queued immediately; searchable after automatic commit
   * - "wait_for": Wait for commit based on time/document thresholds
   * - "force": Trigger immediate commit after processing (slower but guaranteed searchable)
   */
  commit?: CommitMode;
}

/**
 * Response from the ingest API
 */
export interface IngestResponse {
  /** Number of documents queued for processing */
  num_docs_for_processing: number;
}

// ============================================================================
// Index Management Types
// ============================================================================

/**
 * Request body for creating a new index
 */
export interface CreateIndexRequest {
  /** Version of the index configuration format */
  version: string;

  /** Unique index ID */
  index_id: string;

  /** Index URI (storage location) */
  index_uri?: string;

  /** Document mapping configuration */
  doc_mapping: DocMapping;

  /** Indexing settings */
  indexing_settings?: IndexingSettings;

  /** Search settings */
  search_settings?: SearchSettings;

  /** Retention policy */
  retention?: RetentionPolicy;
}

// ============================================================================
// Index Stats Types
// ============================================================================

/**
 * Index statistics from the describe endpoint
 */
export interface IndexStats {
  /** Index ID */
  index_id: string;

  /** Index URI */
  index_uri: string;

  /** Number of published splits */
  num_published_splits: number;

  /** Total size of published splits in bytes */
  size_published_splits: number;

  /** Number of published documents */
  num_published_docs: number;

  /** Uncompressed size of published documents in bytes */
  size_published_docs_uncompressed: number;

  /** Name of the timestamp field, if any */
  timestamp_field_name?: string;

  /** Minimum timestamp across all documents */
  min_timestamp?: number;

  /** Maximum timestamp across all documents */
  max_timestamp?: number;
}

// ============================================================================
// Options Types
// ============================================================================

/**
 * Options for listing indexes
 */
export interface ListIndexesOptions {
  /** Glob patterns to filter index IDs (e.g., ["logs-*", "metrics-*"]) */
  index_id_patterns?: string[];
}

/**
 * Options for creating an index
 */
export interface CreateIndexOptions {
  /** Overwrite the index if it already exists */
  overwrite?: boolean;
}

/**
 * Options for deleting an index
 */
export interface DeleteIndexOptions {
  /** Perform a dry run without actually deleting */
  dry_run?: boolean;
}

/**
 * Options for updating an index
 */
export interface UpdateIndexOptions {
  /** Create the index if it doesn't exist */
  create?: boolean;
}

/**
 * Options for updating a source
 */
export interface UpdateSourceOptions {
  /** Create the source if it doesn't exist */
  create?: boolean;
}

/**
 * File entry returned by delete operations
 */
export interface FileEntry {
  [key: string]: unknown;
}

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
