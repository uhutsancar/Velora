import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';
import { describe, expect, it } from 'vitest';
import { apiErrorMessage, normalizeApiError, RETRYABLE_STATUSES } from './errors';

const response = (status: number, data: unknown): AxiosResponse => ({
  status,
  data,
  statusText: '',
  headers: {},
  config: { headers: new AxiosHeaders() },
});

const axiosError = (status: number, data: unknown): AxiosError =>
  new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, response(status, data));

describe('normalizeApiError', () => {
  it('reads the Velora error envelope', () => {
    const result = normalizeApiError(
      axiosError(409, { code: 'duplicate_review', message: 'Bu ürünü zaten değerlendirdiniz.' }),
    );

    expect(result).toMatchObject({
      status: 409,
      code: 'duplicate_review',
      message: 'Bu ürünü zaten değerlendirdiniz.',
      isNetworkError: false,
    });
  });

  it('flattens ASP.NET model validation errors and camel-cases the field names', () => {
    const result = normalizeApiError(
      axiosError(400, { errors: { Email: ['E-posta geçersiz'], Password: ['Çok kısa'] } }),
    );

    expect(result.fieldErrors).toEqual({
      email: ['E-posta geçersiz'],
      password: ['Çok kısa'],
    });

    // The first validation message becomes the headline message.
    expect(result.message).toBe('E-posta geçersiz');
  });

  it('handles a bare string body', () => {
    const result = normalizeApiError(axiosError(400, 'ids value invalid'));

    expect(result.message).toBe('ids value invalid');
    expect(result.code).toBe('bad_request');
  });

  it('falls back to a status-specific message for an empty body', () => {
    expect(normalizeApiError(axiosError(403, undefined)).message).toBe('Bu işlem için yetkiniz yok.');
    expect(normalizeApiError(axiosError(404, undefined)).code).toBe('not_found');
  });

  it('flags a missing response as a network error', () => {
    const error = new AxiosError('Network Error', 'ERR_NETWORK');

    const result = normalizeApiError(error);

    expect(result.isNetworkError).toBe(true);
    expect(result.status).toBe(0);
    expect(result.code).toBe('network_error');
  });

  it('distinguishes a timeout from a generic network failure', () => {
    const error = new AxiosError('timeout of 20000ms exceeded', 'ECONNABORTED');

    expect(normalizeApiError(error).code).toBe('timeout');
  });

  it('normalises a plain Error', () => {
    expect(normalizeApiError(new Error('boom'))).toMatchObject({
      status: 0,
      code: 'client_error',
      message: 'boom',
    });
  });

  it('normalises a non-Error throw', () => {
    expect(normalizeApiError('something')).toMatchObject({ code: 'unknown' });
  });
});

describe('RETRYABLE_STATUSES', () => {
  it('covers transient server and rate-limit failures', () => {
    expect([...RETRYABLE_STATUSES]).toEqual(expect.arrayContaining([429, 500, 502, 503, 504]));
  });

  it('never retries a client mistake', () => {
    expect(RETRYABLE_STATUSES.has(400)).toBe(false);
    expect(RETRYABLE_STATUSES.has(401)).toBe(false);
    expect(RETRYABLE_STATUSES.has(404)).toBe(false);
    expect(RETRYABLE_STATUSES.has(409)).toBe(false);
  });
});

describe('apiErrorMessage', () => {
  it('sunucunun normalize edilmis mesajini tercih eder', () => {
    const normalized = normalizeApiError(axiosError(409, { message: 'Bu slug kullanimda' }));
    expect(apiErrorMessage(normalized, 'Kayit edilemedi')).toBe('Bu slug kullanimda');
  });

  it('taninmayan hatalarda cagiranin yedegine duser', () => {
    expect(apiErrorMessage(new Error('boom'), 'Kayit edilemedi')).toBe('Kayit edilemedi');
    expect(apiErrorMessage(undefined, 'Kayit edilemedi')).toBe('Kayit edilemedi');
    expect(apiErrorMessage({ status: 500, code: 'x', message: '' }, 'Kayit edilemedi')).toBe(
      'Kayit edilemedi',
    );
  });
});
