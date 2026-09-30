import type { ReactNode } from 'react';
import { Box, Divider, Typography } from '@mui/material';
import { grid as gridTokens, md3 } from '../../../theme/tokens';
import { Stack } from '../Stack';

/**
 * The top bar every operations screen shares (V1 → V2, Wave 3): the screen's name, then whatever
 * it filters by, then its actions on the right. The same height and rule as the tee sheet's and
 * Orders & Tips', so moving between screens does not move the content.
 */
export function OpsToolbar({ title, children, actions }: { title: string; children?: ReactNode; actions?: ReactNode }) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      gap={0.75}
      sx={{ height: gridTokens.topbarH, bgcolor: '#fff', borderBottom: `1px solid ${md3.outlineVariant}`, px: 1.75, flexShrink: 0, position: 'relative', zIndex: 40 }}
    >
      <Typography component="h1" sx={{ fontSize: 16, fontWeight: 800, mr: 0.5, whiteSpace: 'nowrap' }}>
        {title}
      </Typography>
      {children && <Divider orientation="vertical" flexItem sx={{ my: 1.25, mx: 0.25 }} />}
      {children}
      <Box sx={{ flex: 1 }} />
      {actions}
    </Stack>
  );
}

/** The frame of an operations screen: the toolbar over a scrolling body. */
export function OpsScreen({ children, ...rest }: { children: ReactNode } & Record<`data-${string}`, string | boolean>) {
  return (
    <Stack sx={{ flex: 1, minWidth: 0, height: '100%', bgcolor: md3.surface }} {...rest}>
      {children}
    </Stack>
  );
}
