import { Breadcrumbs, Link as MuiLink, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: Array<{ label: string; to?: string }>;
  actions?: ReactNode;
}

export function PageHeader({ title, description, breadcrumbs, actions }: PageHeaderProps) {
  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      justifyContent="space-between"
      alignItems={{ xs: 'stretch', md: 'flex-end' }}
      spacing={2}
      sx={{ mb: 3 }}
    >
      <div>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <Breadcrumbs sx={{ mb: 0.5, fontSize: 13 }}>
            {breadcrumbs.map((crumb) =>
              crumb.to ? (
                <MuiLink key={crumb.label} component={Link} to={crumb.to} underline="hover" color="text.secondary">
                  {crumb.label}
                </MuiLink>
              ) : (
                <Typography key={crumb.label} color="text.primary" fontSize={13}>
                  {crumb.label}
                </Typography>
              ),
            )}
          </Breadcrumbs>
        )}

        <Typography variant="h1" sx={{ fontSize: { xs: 24, md: 30 } }}>
          {title}
        </Typography>

        {description && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {description}
          </Typography>
        )}
      </div>

      {actions && (
        <Stack direction="row" spacing={1.5} sx={{ flexShrink: 0 }}>
          {actions}
        </Stack>
      )}
    </Stack>
  );
}
