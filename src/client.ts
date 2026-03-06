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
  SourceConfig,
} from "./types";
import { Fetcher } from "./utils/fetcher";
import { Index } from "./index-handle";

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

  /**
   * Check the health of the Quickwit cluster
   *
   * @returns Health status of the cluster
   */
  async health(): Promise<HealthResponse> {
    try {
      const response = await this.fetcher.get<{
        cluster_id?: string;
        node_id?: string;
        version?: string;
      }>("/health/readyz");

      return {
        healthy: true,
        ...response,
      };
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
  async isHealthy(): Promise<boolean> {
    const health = await this.health();
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
  async isLive(): Promise<boolean> {
    try {
      await this.fetcher.get("/health/livez");
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
    return this.fetcher.get<IndexMetadata>(`/api/v1/indexes/${indexId}`);
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
    } catch {
      return false;
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
   *   version: "0.7",
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
   * Omitting an optional field (e.g., retention_policy) will delete that configuration.
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
      `/api/v1/indexes/${indexId}`,
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
      `/api/v1/indexes/${indexId}`,
      { params }
    );
    this.indexCache.delete(indexId);
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
      `/api/v1/indexes/${indexId}/describe`
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
    await this.fetcher.put(`/api/v1/indexes/${indexId}/clear`);
    this.indexCache.delete(indexId);
  }

  /**
   * Get the base endpoint URL
   *
   * @returns The configured endpoint URL
   */
  get endpoint(): string {
    return this.fetcher.getEndpoint();
  }
}
