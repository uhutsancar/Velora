import { AxiosError } from 'axios';
import { isNormalizedApiError, type ApiErrorResponse, type NormalizedApiError } from '../types/common';

const NETWORK_MESSAGE = 'Sunucuya ulaşılamıyor. Bağlantınızı kontrol edip tekrar deneyin.';
const TIMEOUT_MESSAGE = 'İstek zaman aşımına uğradı. Lütfen tekrar deneyin.';
const UNKNOWN_MESSAGE = 'Beklenmeyen bir hata oluştu.';

/** Status codes that are worth retrying automatically. */
export const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

/**
 * Turns anything axios can throw into one predictable shape, so components and
 * slices never have to branch on axios internals.
 */
export function normalizeApiError(error: unknown): NormalizedApiError {
  if (error instanceof AxiosError) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return {
        status: 0,
        code: 'timeout',
        message: TIMEOUT_MESSAGE,
        isNetworkError: true,
      };
    }

    if (!error.response) {
      return {
        status: 0,
        code: 'network_error',
        message: NETWORK_MESSAGE,
        isNetworkError: true,
      };
    }

    const status = error.response.status;
    const data: unknown = error.response.data;
    const body = data as ApiErrorResponse | string | undefined;

    // Some middlewares (and Ocelot) answer with a bare string body.
    if (typeof body === 'string') {
      const message = body.trim();

      return {
        status,
        code: codeForStatus(status),
        message: message.length > 0 ? message : defaultMessageFor(status),
        isNetworkError: false,
      };
    }

    // ASP.NET model validation returns { errors: { Field: [messages] } }.
    const validationErrors = extractValidationErrors(data);

    return {
      status,
      code: body?.code ?? codeForStatus(status),
      message: body?.message ?? firstValidationMessage(validationErrors) ?? defaultMessageFor(status),
      ...(validationErrors ? { fieldErrors: validationErrors } : {}),
      ...(body?.traceId ? { traceId: body.traceId } : {}),
      isNetworkError: false,
    };
  }

  if (error instanceof Error) {
    return { status: 0, code: 'client_error', message: error.message, isNetworkError: false };
  }

  return { status: 0, code: 'unknown', message: UNKNOWN_MESSAGE, isNetworkError: false };
}

function extractValidationErrors(data: unknown): Record<string, string[]> | undefined {
  if (typeof data !== 'object' || data === null) return undefined;

  const errors = (data as { errors?: unknown }).errors;
  if (typeof errors !== 'object' || errors === null) return undefined;

  const normalized: Record<string, string[]> = {};

  for (const [key, value] of Object.entries(errors)) {
    // camelCase the PascalCase field names ASP.NET emits so they match form field ids.
    const field = key.charAt(0).toLowerCase() + key.slice(1);
    normalized[field] = Array.isArray(value) ? value.map(String) : [String(value)];
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function firstValidationMessage(errors?: Record<string, string[]>): string | undefined {
  if (!errors) return undefined;

  for (const messages of Object.values(errors)) {
    if (messages.length > 0) return messages[0];
  }

  return undefined;
}

function codeForStatus(status: number): string {
  switch (status) {
    case 400:
      return 'bad_request';
    case 401:
      return 'unauthorized';
    case 403:
      return 'forbidden';
    case 404:
      return 'not_found';
    case 409:
      return 'conflict';
    case 422:
      return 'validation_error';
    case 429:
      return 'too_many_requests';
    default:
      return status >= 500 ? 'server_error' : 'request_failed';
  }
}

function defaultMessageFor(status: number): string {
  switch (status) {
    case 400:
      return 'Gönderilen bilgiler geçersiz.';
    case 401:
      return 'Bu işlem için giriş yapmanız gerekiyor.';
    case 403:
      return 'Bu işlem için yetkiniz yok.';
    case 404:
      return 'Aradığınız kayıt bulunamadı.';
    case 409:
      return 'Bu işlem mevcut kayıtla çakışıyor.';
    case 429:
      return 'Çok fazla deneme yaptınız. Lütfen biraz bekleyin.';
    default:
      return status >= 500 ? 'Sunucu tarafında bir hata oluştu.' : UNKNOWN_MESSAGE;
  }
}

/**
 * Bir hatadan kullaniciya gosterilecek mesaji cikarir.
 *
 * Cagri yerlerinde tekrar eden
 *   `isNormalizedApiError(error) ? error.message : 'Kayit edilemedi'`
 * ucluesunun tek yerdeki karsiligi. Sunucu anlamli bir mesaj dondurduyse onu
 * kullanir, aksi halde cagiranin verdigi baglama ozgu yedege duser.
 */
export function apiErrorMessage(error: unknown, fallback: string): string {
  return isNormalizedApiError(error) && error.message ? error.message : fallback;
}
