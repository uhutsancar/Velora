import { useCallback } from 'react';
import { useAppDispatch } from '@/store/hooks';
import { pushToast, type ToastVariant } from '@/store/slices/uiSlice';

/** Dispatches a toast without every caller reaching for the slice. */
export function useToast() {
  const dispatch = useAppDispatch();

  return useCallback(
    (message: string, variant: ToastVariant = 'info') => {
      dispatch(pushToast(message, variant));
    },
    [dispatch],
  );
}
