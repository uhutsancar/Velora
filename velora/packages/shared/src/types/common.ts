/** Envelope every paged endpoint in the platform returns. */
export interface PagedResult<T> {
  items: T[];
  pageIndex: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

/** Normalised error body produced by Velora.Shared's ApiExceptionMiddleware. */
export interface ApiErrorResponse {
  code: string;
  message: string;
  errors?: Record<string, string[]>;
  traceId?: string;
}

/** Shape every failed request is normalised into before it reaches a component. */
export interface NormalizedApiError {
  status: number;
  code: string;
  message: string;
  fieldErrors?: Record<string, string[]>;
  traceId?: string;
  /** True when the request never reached the server (offline, DNS, timeout). */
  isNetworkError: boolean;
}

export const isNormalizedApiError = (value: unknown): value is NormalizedApiError =>
  typeof value === 'object' &&
  value !== null &&
  'status' in value &&
  'code' in value &&
  'message' in value;
