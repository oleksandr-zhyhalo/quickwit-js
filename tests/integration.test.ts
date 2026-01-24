import { test, expect, describe, beforeAll, afterAll } from "bun:test";
import {
  QuickwitClient,
  QueryBuilder,
  AggregationBuilder,
  NotFoundError,
  ValidationError,
} from "../src";

// ============================================================================
// Test Configuration
// ============================================================================

const QUICKWIT_ENDPOINT = process.env.QUICKWIT_ENDPOINT || "http://localhost:7280";

// Generate unique index ID to avoid conflicts
function generateTestIndexId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// Standard log document type for testing
interface LogDocument {
  timestamp: number;
  level: string;
  message: string;
  service: string;
  response_time?: number;
  [key: string]: unknown; // Allow index signature for Record<string, unknown> compatibility
}

// Sample log documents for testing
const sampleLogs: LogDocument[] = [
  {
    timestamp: 1704067200, // 2024-01-01 00:00:00 UTC
    level: "info",
    message: "Application started",
    service: "api-gateway",
    response_time: 50,
  },
  {
    timestamp: 1704067260, // 2024-01-01 00:01:00 UTC
    level: "error",
    message: "Connection timeout",
    service: "database",
    response_time: 5000,
  },
  {
    timestamp: 1704067320, // 2024-01-01 00:02:00 UTC
    level: "warn",
    message: "High memory usage",
    service: "api-gateway",
    response_time: 150,
  },
  {
    timestamp: 1704067380, // 2024-01-01 00:03:00 UTC
    level: "info",
    message: "Request processed",
    service: "auth-service",
    response_time: 75,
  },
  {
    timestamp: 1704067440, // 2024-01-01 00:04:00 UTC
    level: "error",
    message: "Authentication failed",
    service: "auth-service",
    response_time: 20,
  },
];

// Create a standard log index configuration
function createLogIndexConfig(indexId: string) {
  return {
    version: "0.7",
    index_id: indexId,
    doc_mapping: {
      field_mappings: [
        {
          name: "timestamp",
          type: "datetime" as const,
          input_formats: ["unix_timestamp"],
          output_format: "unix_timestamp_secs",
          fast: true,
          fast_precision: "seconds" as const,
        },
        { name: "level", type: "text" as const, tokenizer: "raw", fast: true },
        { name: "message", type: "text" as const },
        { name: "service", type: "text" as const, tokenizer: "raw", fast: true },
        { name: "response_time", type: "u64" as const, fast: true },
      ],
      timestamp_field: "timestamp",
      mode: "lenient" as const,
    },
    indexing_settings: {
      commit_timeout_secs: 5,
    },
    search_settings: {
      default_search_fields: ["message"],
    },
  };
}

// ============================================================================
// Test Suite
// ============================================================================

describe("Integration Tests", () => {
  let client: QuickwitClient;
  const createdIndexes: string[] = [];

  beforeAll(() => {
    client = new QuickwitClient(QUICKWIT_ENDPOINT);
  });

  afterAll(async () => {
    // Cleanup all created indexes
    for (const indexId of createdIndexes) {
      try {
        await client.deleteIndex(indexId);
      } catch {
        // Ignore errors during cleanup
      }
    }
  });

  // ==========================================================================
  // Health & Connection
  // ==========================================================================

  describe("QuickwitClient - Health & Connection", () => {
    test("health() returns healthy status for running cluster", async () => {
      const health = await client.health();

      expect(health.healthy).toBe(true);
    });

    test("isHealthy() returns true for running cluster", async () => {
      const healthy = await client.isHealthy();

      expect(healthy).toBe(true);
    });

    test("endpoint getter returns configured endpoint", () => {
      expect(client.endpoint).toBe(QUICKWIT_ENDPOINT);
    });

    test("health() returns healthy:false for unreachable cluster", async () => {
      const badClient = new QuickwitClient("http://localhost:99999");
      const health = await badClient.health();

      expect(health.healthy).toBe(false);
    });
  });

  // ==========================================================================
  // Index Management
  // ==========================================================================

  describe("QuickwitClient - Index Management", () => {
    test("createIndex() creates a new index", async () => {
      const indexId = generateTestIndexId("test_create");
      createdIndexes.push(indexId);

      const metadata = await client.createIndex(createLogIndexConfig(indexId));

      expect(metadata.index_config.index_id).toBe(indexId);
      expect(metadata.index_config.doc_mapping.field_mappings.length).toBeGreaterThan(0);
    });

    test("listIndexes() includes created index", async () => {
      const indexId = generateTestIndexId("test_list");
      createdIndexes.push(indexId);

      await client.createIndex(createLogIndexConfig(indexId));
      const indexes = await client.listIndexes();

      const found = indexes.some((idx) => idx.index_config.index_id === indexId);
      expect(found).toBe(true);
    });

    test("getIndex() returns index metadata", async () => {
      const indexId = generateTestIndexId("test_get");
      createdIndexes.push(indexId);

      await client.createIndex(createLogIndexConfig(indexId));
      const metadata = await client.getIndex(indexId);

      expect(metadata.index_config.index_id).toBe(indexId);
      expect(metadata.index_config.doc_mapping.timestamp_field).toBe("timestamp");
    });

    test("indexExists() returns true for existing index", async () => {
      const indexId = generateTestIndexId("test_exists");
      createdIndexes.push(indexId);

      await client.createIndex(createLogIndexConfig(indexId));
      const exists = await client.indexExists(indexId);

      expect(exists).toBe(true);
    });

    test("indexExists() returns false for non-existent index", async () => {
      const exists = await client.indexExists("definitely_does_not_exist_12345");

      expect(exists).toBe(false);
    });

    test("deleteIndex() removes the index", async () => {
      const indexId = generateTestIndexId("test_delete");

      await client.createIndex(createLogIndexConfig(indexId));
      await client.deleteIndex(indexId);
      const exists = await client.indexExists(indexId);

      expect(exists).toBe(false);
    });

    test("clearIndex() removes documents but keeps index", async () => {
      const indexId = generateTestIndexId("test_clear");
      createdIndexes.push(indexId);

      await client.createIndex(createLogIndexConfig(indexId));
      const index = client.index(indexId);

      // Ingest some documents
      await index.ingest(sampleLogs.slice(0, 2), { commit: "force" });

      // Verify documents exist
      const countBefore = await index.count();
      expect(countBefore).toBe(2);

      // Clear the index
      await client.clearIndex(indexId);

      // Index should still exist but be empty
      const exists = await client.indexExists(indexId);
      expect(exists).toBe(true);

      const countAfter = await index.count();
      expect(countAfter).toBe(0);
    });

    test("getIndex() throws NotFoundError for non-existent index", async () => {
      try {
        await client.getIndex("definitely_does_not_exist_12345");
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error instanceof NotFoundError).toBe(true);
      }
    });
  });

  // ==========================================================================
  // Ingest
  // ==========================================================================

  describe("Index - Ingest", () => {
    let indexId: string;

    beforeAll(async () => {
      indexId = generateTestIndexId("test_ingest");
      createdIndexes.push(indexId);
      await client.createIndex(createLogIndexConfig(indexId));
    });

    test("ingest() with force commit makes documents searchable", async () => {
      const index = client.index(indexId);

      const result = await index.ingest(sampleLogs, { commit: "force" });

      expect(result.num_docs_for_processing).toBe(sampleLogs.length);

      // Documents should be immediately searchable
      const count = await index.count();
      expect(count).toBe(sampleLogs.length);
    });

    test("ingest() throws ValidationError for empty array", async () => {
      const index = client.index(indexId);

      try {
        await index.ingest([]);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error instanceof ValidationError).toBe(true);
      }
    });
  });

  // ==========================================================================
  // Search
  // ==========================================================================

  describe("Index - Search", () => {
    let indexId: string;

    beforeAll(async () => {
      indexId = generateTestIndexId("test_search");
      createdIndexes.push(indexId);
      await client.createIndex(createLogIndexConfig(indexId));

      const index = client.index(indexId);
      await index.ingest(sampleLogs, { commit: "force" });
    });

    test("search() with string query returns matching documents", async () => {
      const index = client.index(indexId);

      const results = await index.search<LogDocument>("level:error");

      expect(results.num_hits).toBe(2);
      expect(results.hits.length).toBe(2);
      expect(results.hits.every((hit) => hit.level === "error")).toBe(true);
    });

    test("search() with params object works correctly", async () => {
      const index = client.index(indexId);

      const results = await index.search<LogDocument>({
        query: "service:api-gateway",
        max_hits: 10,
      });

      expect(results.num_hits).toBe(2);
      // Both hits should be from api-gateway service
      expect(results.hits.every((hit) => hit.service === "api-gateway")).toBe(true);
    });

    test("search() with sort_by parameter is accepted", async () => {
      const index = client.index(indexId);

      // Verify sort_by parameter is accepted by the API (doesn't throw)
      const results = await index.search<LogDocument>({
        query: "*",
        max_hits: 5,
        sort_by: "timestamp",
      });

      // Should return results
      expect(results.num_hits).toBeGreaterThan(0);
      expect(results.hits.length).toBeGreaterThan(0);
    });

    test("search() with QueryBuilder works correctly", async () => {
      const index = client.index(indexId);

      const query = new QueryBuilder()
        .query("level:info")
        .limit(5)
        .sortBy("timestamp", "asc");

      const results = await index.search<LogDocument>(query);

      expect(results.num_hits).toBe(2);
      expect(results.hits.every((hit) => hit.level === "info")).toBe(true);
    });

    test("search() with time range filters correctly", async () => {
      const index = client.index(indexId);

      // end_timestamp is exclusive, so use 1704067321 to include document at 1704067320
      const query = new QueryBuilder()
        .query("*")
        .timeRange(1704067200, 1704067321); // First 3 documents

      const results = await index.search<LogDocument>(query);

      expect(results.num_hits).toBe(3);
    });

    test("search() with aggregations uses POST and returns aggregations", async () => {
      const index = client.index(indexId);

      const query = new QueryBuilder()
        .query("*")
        .agg("by_level", AggregationBuilder.terms("level"))
        .agg("avg_response", AggregationBuilder.avg("response_time"));

      const results = await index.search<LogDocument>(query);

      expect(results.aggregations).toBeDefined();
      expect(results.aggregations!["by_level"]).toBeDefined();
      expect(results.aggregations!["avg_response"]).toBeDefined();
    });

    test("search() with nested aggregations works correctly", async () => {
      const index = client.index(indexId);

      const query = new QueryBuilder().query("*").agg(
        "by_service",
        AggregationBuilder.terms("service", {
          aggs: {
            avg_time: AggregationBuilder.avg("response_time"),
          },
        })
      );

      const results = await index.search<LogDocument>(query);

      expect(results.aggregations).toBeDefined();
      expect(results.aggregations!["by_service"]).toBeDefined();
    });

    test("searchHits() returns documents directly", async () => {
      const index = client.index(indexId);

      const hits = await index.searchHits<LogDocument>("level:error");

      expect(hits.length).toBe(2);
      expect(hits.every((doc) => doc.level === "error")).toBe(true);
      expect(hits[0]!.message).toBeDefined();
    });

    test("searchFirst() returns first matching document", async () => {
      const index = client.index(indexId);

      const doc = await index.searchFirst<LogDocument>({
        query: "service:auth-service",
        sort_by: "timestamp",
      });

      expect(doc).toBeDefined();
      expect(doc!.service).toBe("auth-service");
    });

    test("searchFirst() returns undefined when no matches", async () => {
      const index = client.index(indexId);

      const doc = await index.searchFirst<LogDocument>("level:nonexistent");

      expect(doc).toBeUndefined();
    });

    test("count() returns accurate document count", async () => {
      const index = client.index(indexId);

      const totalCount = await index.count();
      expect(totalCount).toBe(sampleLogs.length);

      const errorCount = await index.count("level:error");
      expect(errorCount).toBe(2);

      const infoCount = await index.count(new QueryBuilder().query("level:info"));
      expect(infoCount).toBe(2);
    });

    test("search() with search_fields restricts search scope", async () => {
      const index = client.index(indexId);

      // Search for "timeout" only in message field
      const query = new QueryBuilder().query("timeout").searchFields("message");

      const results = await index.search<LogDocument>(query);

      expect(results.num_hits).toBe(1);
      expect(results.hits[0]!.message).toContain("timeout");
    });
  });

  // ==========================================================================
  // Error Scenarios
  // ==========================================================================

  describe("Index - Error Scenarios", () => {
    test("search() on non-existent index throws NotFoundError", async () => {
      const index = client.index("definitely_does_not_exist_12345");

      try {
        await index.search("*");
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error instanceof NotFoundError).toBe(true);
      }
    });

    test("ingest() on non-existent index throws NotFoundError", async () => {
      const index = client.index("definitely_does_not_exist_12345");

      try {
        await index.ingest([{ test: "data" }]);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error instanceof NotFoundError).toBe(true);
      }
    });
  });
});
