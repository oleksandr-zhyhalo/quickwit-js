import type {
  QuickwitConfig,
  HealthResponse,
  IndexMetadata,
  CreateIndexRequest,
  IndexStats,
  ListIndexesOptions,
  CreateIndexOptions,
  DeleteIndexOptions,
  UpdateIndexOptions,
  FileEntry,
  ClusterSnapshot,
  QuickwitVersion,
  IndexTemplate,
  RequestOptions,
} from "./types";
import { Fetcher } from "./utils/fetcher";
import { Index } from "./index-handle";
import { NotFoundError } from "./errors";
import { TraceIndex } from "./tracing/trace-index";
import type {
  OtlpProtobufPayload,
  OtlpTraceExportResponse,
  OtlpTraceIngestOptions,
} from "./tracing/types";

/**
 * Main entry point for interacting with a Quickwit cluster
 *
 * @example
 * ```typescript
 * // Create a client
 * const client = new QuickwitClient({
 *   endpoint: "http://localhost:7280",
 *   timeout: 30000
 * });
 *
 * // Check health
 * const health = await client.health();
 *
 * // Get an index handle
 * const logsIndex = client.index("logs");
 *
 * // Search
 * const results = await logsIndex.search("level:error");
 * ```
 */
export class QuickwitClient {
  private readonly fetcher: Fetcher;
  private readonly indexCache: Map<string, Index> = new Map();

  /**
   * Create a new QuickwitClient
   *
   * @param config - Configuration options
   */
  constructor(config: QuickwitConfig | string) {
    const normalizedConfig: QuickwitConfig =
      typeof config === "string" ? { endpoint: config } : config;

    this.fetcher = new Fetcher(normalizedConfig);
  }

  /**
   * Get a handle for operations on a specific index
   *
   * @param indexId - The index ID
   * @returns An Index instance for the specified index
   *
   * @example
   * ```typescript
   * const logs = client.index("logs");
   * const results = await logs.search("error");
   * ```
   */
  index(indexId: string): Index {
    let indexHandle = this.indexCache.get(indexId);
    if (!indexHandle) {
      indexHandle = new Index(this.fetcher, indexId);
      this.indexCache.set(indexId, indexHandle);
    }
    return indexHandle;
  }

  /** Query traces through Quickwit's Jaeger-compatible REST API. */
  traces(indexIdPattern = "otel-traces-v0_*"): TraceIndex {
    return new TraceIndex(this.fetcher, indexIdPattern);
  }

  /** Ingest an encoded OTLP ExportTraceServiceRequest protobuf payload. */
  async ingestOtlpTraces(
    payload: OtlpProtobufPayload,
    options: OtlpTraceIngestOptions = {}
  ): Promise<OtlpTraceExportResponse> {
    const path = options.indexId === undefined
      ? "/api/v1/otlp/v1/traces"
      : `/api/v1/${encodeURIComponent(options.indexId)}/otlp/v1/traces`;
    const headers: Record<string, string> = {
      "Content-Type": "application/x-protobuf",
    };
    if (options.contentEncoding !== undefined) {
      headers["Content-Encoding"] = options.contentEncoding;
    }
    return this.fetcher.postRaw<OtlpTraceExportResponse>(path, payload, { headers });
  }

  /**
   * Check the health of the Quickwit cluster
   *
   * @returns Health status of the cluster
   */
  async health(options?: RequestOptions): Promise<HealthResponse> {
    try {
      await this.fetcher.get<boolean>("/health/readyz", options);
      return { healthy: true };
    } catch {
      return {
        healthy: false,
      };
    }
  }

  /**
   * Check if the cluster is healthy (simple boolean check)
   *
   * @returns true if healthy, false otherwise
   */
  async isHealthy(options?: RequestOptions): Promise<boolean> {
    const health = await this.health(options);
    return health.healthy;
  }

  /**
   * Check if the node is live (liveness probe)
   *
   * Unlike health()/isHealthy() which check readiness, this checks
   * basic liveness — whether the process is running and responsive.
   *
   * @returns true if the node is live, false otherwise
   */
  async isLive(options?: RequestOptions): Promise<boolean> {
    try {
      await this.fetcher.get("/health/livez", options);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * List all indexes in the cluster
   *
   * @param options - Filtering options
   * @returns Array of index metadata
   */
  async listIndexes(options?: ListIndexesOptions): Promise<IndexMetadata[]> {
    const params: Record<string, string | undefined> = {};
    if (options?.index_id_patterns && options.index_id_patterns.length > 0) {
      params.index_id_patterns = options.index_id_patterns.join(",");
    }
    return this.fetcher.get<IndexMetadata[]>("/api/v1/indexes", { params });
  }

  /**
   * Get metadata for a specific index
   *
   * @param indexId - The index ID
   * @returns Index metadata
   */
  async getIndex(indexId: string): Promise<IndexMetadata> {
    return this.fetcher.get<IndexMetadata>(`/api/v1/indexes/${encodeURIComponent(indexId)}`);
  }

  /**
   * Check if an index exists
   *
   * @param indexId - The index ID
   * @returns true if the index exists, false otherwise
   */
  async indexExists(indexId: string): Promise<boolean> {
    try {
      await this.getIndex(indexId);
      return true;
    } catch (error) {
      if (error instanceof NotFoundError) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Create a new index
   *
   * @param config - Index configuration including doc_mapping and settings
   * @returns The created index metadata
   *
   * @example
   * ```typescript
   * const metadata = await client.createIndex({
   *   version: "0.9",
   *   index_id: "logs",
   *   doc_mapping: {
   *     field_mappings: [
   *       { name: "timestamp", type: "datetime", fast: true },
   *       { name: "level", type: "text", tokenizer: "raw" },
   *       { name: "message", type: "text" }
   *     ],
   *     timestamp_field: "timestamp"
   *   }
   * });
   * ```
   */
  async createIndex(
    config: CreateIndexRequest,
    options?: CreateIndexOptions
  ): Promise<IndexMetadata> {
    const params: Record<string, string | boolean | undefined> = {};
    if (options?.overwrite !== undefined) {
      params.overwrite = options.overwrite;
    }
    return this.fetcher.post<IndexMetadata>("/api/v1/indexes", config, { params });
  }

  /**
   * Update an existing index configuration
   *
   * This follows PUT semantics: all fields are replaced by the provided values.
   * Omitting an optional field (e.g., retention) will delete that configuration.
   *
   * @param indexId - The index ID to update
   * @param config - New index configuration
   * @param options - Update options
   * @returns Updated index metadata
   */
  async updateIndex(
    indexId: string,
    config: CreateIndexRequest,
    options?: UpdateIndexOptions
  ): Promise<IndexMetadata> {
    const params: Record<string, string | boolean | undefined> = {};
    if (options?.create !== undefined) {
      params.create = options.create;
    }
    return this.fetcher.put<IndexMetadata>(
      `/api/v1/indexes/${encodeURIComponent(indexId)}`,
      config,
      { params }
    );
  }

  /**
   * Delete an index and all its data
   *
   * @param indexId - The index ID to delete
   *
   * @example
   * ```typescript
   * await client.deleteIndex("old-logs");
   * ```
   */
  async deleteIndex(
    indexId: string,
    options?: DeleteIndexOptions
  ): Promise<FileEntry[]> {
    const params: Record<string, string | boolean | undefined> = {};
    if (options?.dry_run !== undefined) {
      params.dry_run = options.dry_run;
    }
    const result = await this.fetcher.delete<FileEntry[]>(
      `/api/v1/indexes/${encodeURIComponent(indexId)}`,
      { params }
    );
    if (!options?.dry_run) {
      this.indexCache.delete(indexId);
    }
    return result;
  }

  /**
   * Get statistics about an index (number of docs, splits, sizes)
   *
   * @param indexId - The index ID to describe
   * @returns Index statistics
   */
  async describeIndex(indexId: string): Promise<IndexStats> {
    return this.fetcher.get<IndexStats>(
      `/api/v1/indexes/${encodeURIComponent(indexId)}/describe`
    );
  }

  /**
   * Clear all documents from an index without deleting the index itself
   *
   * @param indexId - The index ID to clear
   *
   * @example
   * ```typescript
   * // Remove all documents but keep the index configuration
   * await client.clearIndex("logs");
   * ```
   */
  async clearIndex(indexId: string): Promise<void> {
    await this.fetcher.put(`/api/v1/indexes/${encodeURIComponent(indexId)}/clear`);
  }

  /**
   * Get the base endpoint URL
   *
   * @returns The configured endpoint URL
   */
  get endpoint(): string {
    return this.fetcher.getEndpoint();
  }

  /** Get the cluster state visible from the contacted node. */
  async getCluster(options?: RequestOptions): Promise<ClusterSnapshot> {
    return this.fetcher.get<ClusterSnapshot>("/api/v1/cluster", options);
  }

  /** Get build and runtime version information for the contacted node. */
  async getVersion(options?: RequestOptions): Promise<QuickwitVersion> {
    return this.fetcher.get<QuickwitVersion>("/api/v1/version", options);
  }

  /** List all index templates. */
  async listTemplates(): Promise<IndexTemplate[]> {
    return this.fetcher.get<IndexTemplate[]>("/api/v1/templates");
  }

  /** Get one index template. */
  async getTemplate(templateId: string): Promise<IndexTemplate> {
    return this.fetcher.get<IndexTemplate>(
      `/api/v1/templates/${encodeURIComponent(templateId)}`
    );
  }

  /** Create an index template. */
  async createTemplate(template: IndexTemplate): Promise<IndexTemplate> {
    return this.fetcher.post<IndexTemplate>("/api/v1/templates", template);
  }

  /** Replace an index template. The path template ID takes precedence over the body. */
  async updateTemplate(
    templateId: string,
    template: IndexTemplate
  ): Promise<IndexTemplate> {
    return this.fetcher.put<IndexTemplate>(
      `/api/v1/templates/${encodeURIComponent(templateId)}`,
      template
    );
  }

  /** Delete an index template. */
  async deleteTemplate(templateId: string): Promise<void> {
    await this.fetcher.delete(
      `/api/v1/templates/${encodeURIComponent(templateId)}`
    );
  }
}
