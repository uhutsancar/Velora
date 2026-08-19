import { useCallback, useState } from 'react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface ConfirmRequest {
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => Promise<void> | void;
}

/**
 * Imperative confirm helper, so destructive actions inside a data grid do not
 * each need their own dialog state.
 *
 * Usage: `const { confirm, dialog } = useConfirm(); ... {dialog}`
 */
export function useConfirm() {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const [loading, setLoading] = useState(false);

  const confirm = useCallback((next: ConfirmRequest) => setRequest(next), []);

  const handleConfirm = useCallback(async () => {
    if (!request) return;

    setLoading(true);

    try {
      await request.onConfirm();
      setRequest(null);
    } finally {
      setLoading(false);
    }
  }, [request]);

  const dialog = (
    <ConfirmDialog
      open={request !== null}
      title={request?.title ?? ''}
      message={request?.message ?? ''}
      confirmLabel={request?.confirmLabel}
      destructive={request?.destructive}
      loading={loading}
      onConfirm={() => void handleConfirm()}
      onCancel={() => setRequest(null)}
    />
  );

  return { confirm, dialog };
}
