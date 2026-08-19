import { Alert, Snackbar } from '@mui/material';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { dismissToast, selectToasts } from '@/store/slices/uiSlice';

/**
 * Global toast stack, rendered once by AdminLayout.
 *
 * Only the newest toast is shown at a time: stacked snackbars cover the very
 * table the operator is trying to read.
 */
export function ToastViewport() {
  const toasts = useAppSelector(selectToasts);
  const dispatch = useAppDispatch();

  const current = toasts[toasts.length - 1];

  return (
    <Snackbar
      open={Boolean(current)}
      autoHideDuration={4000}
      onClose={() => current && dispatch(dismissToast(current.id))}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
    >
      {current ? (
        <Alert
          severity={current.variant}
          variant="filled"
          onClose={() => dispatch(dismissToast(current.id))}
          sx={{ borderRadius: 1, minWidth: 280 }}
        >
          {current.message}
        </Alert>
      ) : undefined}
    </Snackbar>
  );
}
