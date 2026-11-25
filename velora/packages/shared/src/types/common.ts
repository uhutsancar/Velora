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

/** RFC 9457 Problem Details body produced by the shared backend exception handler. */
export interface ApiErrorResponse {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  code?: string;
  /** Kept for compatibility with older endpoints and upstream proxies. */
  message?: string;
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
