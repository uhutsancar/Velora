import 'axios';

declare module 'axios' {
  export interface AxiosRequestConfig {
    /** Set on the refresh call itself so the 401 interceptor never recurses. */
    _skipAuthRefresh?: boolean;
    /** Internal retry counter maintained by the response interceptor. */
    _retryCount?: number;
    /** Marks a request that already went through one refresh attempt. */
    _refreshAttempted?: boolean;
  }
}
