import type { BaseQueryFn } from '@reduxjs/toolkit/query';
import type { AxiosRequestConfig } from 'axios';
import type { ApiClient } from './client';
import { isNormalizedApiError, type NormalizedApiError } from '../types/common';

export interface AxiosBaseQueryArgs {
  url: string;
  method?: AxiosRequestConfig['method'];
  data?: unknown;
  /** Query string values; nullish entries are dropped by the client. */
  params?: Record<string, string | number | boolean | undefined | null>;
  /** Narrower than axios's own header type, which is `any` at the leaves. */
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

/**
 * RTK Query base query backed by the shared axios client.
 *
 * Using axios (rather than fetchBaseQuery) keeps token refresh, retries and error
 * normalisation in exactly one place: every RTK Query endpoint inherits them.
 */
export const createAxiosBaseQuery =
  (client: ApiClient): BaseQueryFn<AxiosBaseQueryArgs | string, unknown, NormalizedApiError> =>
  async (args, api) => {
    const config: AxiosBaseQueryArgs = typeof args === 'string' ? { url: args } : args;

    try {
      // The concrete result type is declared by each RTK Query endpoint, so the
      // base query deliberately stays untyped here.
      const data = await client.request<unknown>({
        url: config.url,
        method: config.method ?? 'GET',
        data: config.data,
        params: config.params,
        headers: config.headers,
        // Lets RTK Query cancel in-flight requests when a component unmounts.
        signal: config.signal ?? api.signal,
      });

      return { data };
    } catch (error) {
      if (isNormalizedApiError(error)) {
        return { error };
      }

      return {
        error: {
          status: 0,
          code: 'unknown',
          message: error instanceof Error ? error.message : 'Beklenmeyen bir hata oluştu.',
          isNetworkError: false,
        },
      };
    }
  };
