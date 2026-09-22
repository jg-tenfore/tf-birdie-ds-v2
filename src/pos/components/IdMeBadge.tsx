import { Box, Tooltip } from '@mui/material';
import { idMeGroups, radius } from '../../theme/tokens';
import type { IdMeGroup } from '../types';
import { Icon } from './primitives';

/**
 * ID.me verification badge (Weston Edits).
 *
 * Badge only: it says the customer's record carries an ID.me verification and which group,
 * so the counter can apply a military or first-responder rate without asking for a card. The
 * verify flow itself waits on how Birdie presents it today, which is why there is no button.
 *
 * `compact` is the player-row size — an icon and a short label; the Customer tab uses the
 * full one.
 */
export function IdMeBadge({ group, compact }: { group: IdMeGroup; compact?: boolean }) {
  const cfg = idMeGroups[group];
  return (
    <Tooltip title={`ID.me verified · ${cfg.label}`}>
      <Box
        component="span"
        aria-label={`ID.me verified, ${cfg.label}`}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.375,
          flexShrink: 0,
          bgcolor: cfg.bg,
          color: cfg.text,
          fontSize: compact ? 9.5 : 11,
          fontWeight: 800,
          letterSpacing: '.3px',
          px: compact ? 0.625 : 1,
          py: compact ? '1px' : 0.375,
          borderRadius: `${radius.xl}px`,
          whiteSpace: 'nowrap',
        }}
      >
        <Icon name="verified_user" size={compact ? 11 : 14} color={cfg.text} />
        {compact ? 'ID.me' : `ID.me · ${cfg.label}`}
      </Box>
    </Tooltip>
  );
}
