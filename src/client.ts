import type { QuickwitConfig, HealthResponse, IndexMetadata } from "./types";
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
   * List all indexes in the cluster
   *
   * @returns Array of index metadata
   */
  async listIndexes(): Promise<IndexMetadata[]> {
    return this.fetcher.get<IndexMetadata[]>("/api/v1/indexes");
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
   * Get the base endpoint URL
   *
   * @returns The configured endpoint URL
   */
  get endpoint(): string {
    return this.fetcher.getEndpoint();
  }
}
