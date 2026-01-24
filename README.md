# quickwit-js

A lightweight, universal TypeScript client for [Quickwit](https://quickwit.io) search engine.

## Installation

```bash
bun add quickwit-js
```

## Quick Start

```typescript
import { QuickwitClient, AggregationBuilder } from "quickwit-js";

const client = new QuickwitClient("http://localhost:7280");
const logs = client.index("logs");

// Simple search
const results = await logs.search("level:error");
console.log(results.hits);

// With query builder
const results = await logs.search(
  logs.query("error")
    .timeRange(1704067200, 1704153600)
    .limit(20)
    .sortBy("-timestamp")
);
```

## Configuration

```typescript
const client = new QuickwitClient({
  endpoint: "http://localhost:7280",
  apiKey: "your-api-key",        // optional
  bearerToken: "your-token",     // optional
  timeout: 30000,                // optional, ms
});
```

## Search API

### Basic Search

```typescript
// String query
await logs.search("level:error AND service:api");

// With parameters
await logs.search({
  query: "error",
  max_hits: 50,
  sort_by: "-timestamp",
});
```

### Query Builder

```typescript
const query = logs.query("error")
  .limit(20)
  .offset(0)
  .timeRange(startTs, endTs)      // Unix timestamps (seconds)
  .dateRange(startDate, endDate)  // Date objects
  .sortBy("-timestamp")           // - prefix for descending
  .searchFields("message", "body")
  .snippetFields("message")
  .countAll();

const results = await logs.search(query);
```

### Aggregations

```typescript
import { AggregationBuilder } from "quickwit-js";

const results = await logs.search(
  logs.query("*")
    .agg("by_level", AggregationBuilder.terms("level", { size: 10 }))
    .agg("over_time", AggregationBuilder.dateHistogram("timestamp", "1h"))
    .agg("response_stats", AggregationBuilder.stats("response_time"))
);

console.log(results.aggregations);
```

Available aggregations:
- `terms(field, { size?, minDocCount?, order? })`
- `histogram(field, interval, { minBound?, maxBound? })`
- `dateHistogram(field, interval, { timeZone?, format? })`
- `range(field, ranges[])`
- `avg(field)`, `sum(field)`, `min(field)`, `max(field)`
- `stats(field)`, `percentiles(field, { percents? })`
- `count(field)`

### Convenience Methods

```typescript
// Get only document sources
const docs = await logs.searchHits("error");

// Get first match
const doc = await logs.searchFirst("error");

// Count matches
const count = await logs.count("level:error");
```

## Error Handling

```typescript
import {
  QuickwitError,
  ConnectionError,
  TimeoutError,
  NotFoundError
} from "quickwit-js";

try {
  await logs.search("error");
} catch (error) {
  if (error instanceof TimeoutError) {
    console.log(`Timed out after ${error.timeout}ms`);
  } else if (error instanceof NotFoundError) {
    console.log("Index not found");
  } else if (error instanceof ConnectionError) {
    console.log("Failed to connect");
  }
}
```

## Client Methods

```typescript
// Health check
const health = await client.health();
const isHealthy = await client.isHealthy();

// Index operations
const indexes = await client.listIndexes();
const metadata = await client.getIndex("logs");
const exists = await client.indexExists("logs");
```

## Development

```bash
bun install
bun test
```

## License

MIT
