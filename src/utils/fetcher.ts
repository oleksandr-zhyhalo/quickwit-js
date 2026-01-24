import type { QuickwitConfig, HttpMethod } from "../types";
import {
  QuickwitError,
  ConnectionError,
  TimeoutError,
  createErrorFromStatus,
  type ErrorDetails,
} from "../errors";

/**
 * Options for a single fetch request
 */
export interface FetchOptions {
  /** HTTP method */
  method?: HttpMethod;

  /** Request body */
  body?: unknown;

  /** Additional headers for this request */
  headers?: Record<string, string>;

  /** Override timeout for this request */
  timeout?: number;

  /** Query parameters */
  params?: Record<string, string | number | boolean | undefined>;
}

/**
 * HTTP client wrapper with authentication, timeout, and error handling
 */
export class Fetcher {
  private readonly endpoint: string;
  private readonly defaultHeaders: Record<string, string>;
  private readonly defaultTimeout: number;

  constructor(config: QuickwitConfig) {
    // Normalize endpoint (remove trailing slash)
    this.endpoint = config.endpoint.replace(/\/$/, "");
    this.defaultTimeout = config.timeout ?? 30000;

    // Build default headers
    this.defaultHeaders = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...config.headers,
    };

    // Add authentication headers
    if (config.apiKey) {
      this.defaultHeaders["X-API-Key"] = config.apiKey;
    }
    if (config.bearerToken) {
      this.defaultHeaders["Authorization"] = `Bearer ${config.bearerToken}`;
    }
  }

  /**
   * Build URL with query parameters
   */
  private buildUrl(path: string, params?: FetchOptions["params"]): string {
    const url = new URL(path, this.endpoint);

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    return url.toString();
  }

  /**
   * Parse error response body
   */
  private async parseErrorBody(response: Response): Promise<ErrorDetails> {
    try {
      const text = await response.text();
      try {
        const json = JSON.parse(text);
        return {
          message: json.message || json.error || text,
          context: json,
        };
      } catch {
        return { message: text };
      }
    } catch {
      return { message: response.statusText };
    }
  }

  /**
   * Perform a fetch request with error handling
   */
  async fetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
    const { method = "GET", body, headers = {}, timeout, params } = options;
    const requestTimeout = timeout ?? this.defaultTimeout;

    const url = this.buildUrl(path, params);

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), requestTimeout);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          ...this.defaultHeaders,
          ...headers,
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle non-OK responses
      if (!response.ok) {
        const details = await this.parseErrorBody(response);
        throw createErrorFromStatus(
          response.status,
          details.message || `HTTP ${response.status}: ${response.statusText}`,
          details
        );
      }

      // Handle empty responses
      const contentLength = response.headers.get("content-length");
      const contentType = response.headers.get("content-type");

      if (contentLength === "0" || response.status === 204) {
        return undefined as T;
      }

      // Parse JSON response
      if (contentType?.includes("application/json")) {
        return (await response.json()) as T;
      }

      // Return text for non-JSON responses
      return (await response.text()) as T;
    } catch (error) {
      clearTimeout(timeoutId);

      // Handle abort (timeout)
      if (error instanceof Error && error.name === "AbortError") {
        throw new TimeoutError(
          `Request to ${url} timed out after ${requestTimeout}ms`,
          requestTimeout
        );
      }

      // Re-throw QuickwitError instances
      if (error instanceof QuickwitError) {
        throw error;
      }

      // Handle network errors
      if (error instanceof TypeError) {
        throw new ConnectionError(
          `Failed to connect to ${this.endpoint}: ${error.message}`,
          error
        );
      }

      // Unknown errors
      throw new QuickwitError(
        `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
        undefined,
        { cause: error instanceof Error ? error : undefined }
      );
    }
  }

  /**
   * Perform a GET request
   */
  async get<T>(
    path: string,
    options?: Omit<FetchOptions, "method" | "body">
  ): Promise<T> {
    return this.fetch<T>(path, { ...options, method: "GET" });
  }

  /**
   * Perform a POST request
   */
  async post<T>(
    path: string,
    body?: unknown,
    options?: Omit<FetchOptions, "method" | "body">
  ): Promise<T> {
    return this.fetch<T>(path, { ...options, method: "POST", body });
  }

  /**
   * Perform a PUT request
   */
  async put<T>(
    path: string,
    body?: unknown,
    options?: Omit<FetchOptions, "method" | "body">
  ): Promise<T> {
    return this.fetch<T>(path, { ...options, method: "PUT", body });
  }

  /**
   * Perform a DELETE request
   */
  async delete<T>(
    path: string,
    options?: Omit<FetchOptions, "method" | "body">
  ): Promise<T> {
    return this.fetch<T>(path, { ...options, method: "DELETE" });
  }

  /**
   * Get the base endpoint URL
   */
  getEndpoint(): string {
    return this.endpoint;
  }
}
