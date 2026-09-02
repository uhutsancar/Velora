import { useMemo } from 'react';
import { apiErrorMessage } from '@velora/shared';
import { useAppDispatch } from '@/store/hooks';
import { pushToast, type ToastVariant } from '@/store/slices/uiSlice';

/**
 * Toast gonderir.
 *
 * Cagrilabilir olarak kalir — `toast('Kaydedildi', 'success')` — ama ustune iki
 * kisayol tasir. `toast.error(error, yedek)` en cok tekrar eden kaliptir:
 * yakalanan hatadan mesaji cikarip kirmizi toast basar, boylece her catch
 * blogunda isNormalizedApiError uclusu yeniden yazilmaz.
 */
export function useToast() {
  const dispatch = useAppDispatch();

  return useMemo(() => {
    const toast = (message: string, variant: ToastVariant = 'info') => {
      dispatch(pushToast(message, variant));
    };

    toast.success = (message: string) => toast(message, 'success');
    toast.error = (error: unknown, fallback: string) => toast(apiErrorMessage(error, fallback), 'error');

    return toast;
  }, [dispatch]);
}
