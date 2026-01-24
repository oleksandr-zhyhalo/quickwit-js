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
 * Index metadata returned by Quickwit
 */
export interface IndexMetadata {
  /** Unique index ID */
  index_id: string;

  /** Index URI */
  index_uri: string;

  /** Index configuration */
  index_config: IndexConfig;

  /** Checkpoint tracking source positions */
  checkpoint?: Record<string, unknown>;

  /** Creation timestamp */
  create_timestamp?: number;

  /** Sources attached to the index */
  sources?: SourceConfig[];
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
  /** Field mappings */
  field_mappings: FieldMapping[];

  /** Tag fields for filtering */
  tag_fields?: string[];

  /** Timestamp field name */
  timestamp_field?: string;

  /** Mode for handling unmapped fields */
  mode?: "lenient" | "strict";

  /** Partition key */
  partition_key?: string;

  /** Maximum number of partitions */
  max_num_partitions?: number;
}

/**
 * Field mapping configuration
 */
export interface FieldMapping {
  /** Field name */
  name: string;

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

  /** Whether to enable fast fields (columnar storage) */
  fast?: boolean;

  /** Nested field mappings for object types */
  field_mappings?: FieldMapping[];

  /** Datetime input formats */
  input_formats?: string[];

  /** Datetime output format */
  output_format?: string;

  /** Fast datetime precision */
  fast_precision?: "seconds" | "milliseconds" | "microseconds" | "nanoseconds";
}

/**
 * Indexing settings
 */
export interface IndexingSettings {
  /** Commit timeout in seconds */
  commit_timeout_secs?: number;

  /** Split number of docs threshold */
  split_num_docs_target?: number;

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

  /** Maximum merge docs */
  max_merge_docs?: number;
}

/**
 * Resource configuration for indexing
 */
export interface ResourcesConfig {
  /** Number of threads */
  num_threads?: number;

  /** Heap size in bytes */
  heap_size?: number;
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
  /** Source ID */
  source_id: string;

  /** Source type */
  source_type: "file" | "kafka" | "kinesis" | "pulsar" | "ingest-api" | "void";

  /** Number of pipelines */
  num_pipelines?: number;

  /** Source-specific parameters */
  params?: Record<string, unknown>;

  /** Transform configuration */
  transform?: TransformConfig;

  /** Input format */
  input_format?: "json" | "plain_text";
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
