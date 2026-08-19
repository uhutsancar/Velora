import { Button, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function NotFoundPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Stack alignItems="center" justifyContent="center" spacing={2} sx={{ py: 12, textAlign: 'center' }}>
      <Typography variant="h1" sx={{ fontSize: 64, color: 'text.disabled' }}>
        404
      </Typography>
      <Typography variant="h4">{t('errors.notFound')}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420 }}>
        {t('errors.notFoundBody')}
      </Typography>
      <Button variant="contained" onClick={() => navigate('/')} sx={{ mt: 1 }}>
        {t('admin.dashboard')}
      </Button>
    </Stack>
  );
}
