export type OtlpProtobufPayload = Uint8Array | ArrayBuffer;

export interface OtlpTraceIngestOptions {
  /** Target a specific trace index instead of Quickwit's default index. */
  indexId?: string;
  /** Set when the supplied payload is already gzip-compressed. */
  contentEncoding?: "gzip";
}

export interface OtlpTraceExportResponse {
  partial_success?: {
    rejected_spans: number;
    error_message: string;
  };
}

export interface TraceSearchParams {
  service?: string;
  operation?: string;
  /** Start time as Unix epoch microseconds. */
  start?: number;
  /** End time as Unix epoch microseconds. */
  end?: number;
  tags?: Record<string, string>;
  minDuration?: string;
  maxDuration?: string;
  /** Accepted by Quickwit 0.9 for Jaeger compatibility but currently ignored. */
  lookback?: string;
  limit?: number;
}

export interface JaegerResponse<T> {
  data: T;
}

export type JaegerValueType = "string" | "bool" | "int64" | "float64" | "binary";

export interface JaegerKeyValue {
  key: string;
  type: JaegerValueType;
  value: string | number | boolean;
}

export interface JaegerLog {
  timestamp: number;
  fields: JaegerKeyValue[];
}

export interface JaegerSpanReference {
  refType: "CHILD_OF" | "FOLLOWS_FROM";
  traceID: string;
  spanID: string;
}

export interface JaegerSpan {
  traceID: string;
  spanID: string;
  operationName: string;
  references: JaegerSpanReference[];
  flags: number;
  startTime: number;
  duration: number;
  tags: JaegerKeyValue[];
  logs: JaegerLog[];
  processID: string | null;
  warnings: string[];
}

export interface JaegerProcess {
  serviceName: string;
  key: string;
  tags: JaegerKeyValue[];
}

export interface JaegerTrace {
  traceID: string;
  spans: JaegerSpan[];
  processes: Record<string, JaegerProcess>;
  warnings: string[];
}
