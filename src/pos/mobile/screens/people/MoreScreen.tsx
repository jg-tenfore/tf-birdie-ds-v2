import type { ReactNode } from 'react';
import { Box, ListItemButton, ListItemIcon, ListItemText, ListSubheader, Typography } from '@mui/material';
import BlockOutlined from '@mui/icons-material/BlockOutlined';
import ChevronRight from '@mui/icons-material/ChevronRight';
import GroupsOutlined from '@mui/icons-material/GroupsOutlined';
import LogoutOutlined from '@mui/icons-material/LogoutOutlined';
import PrintOutlined from '@mui/icons-material/PrintOutlined';
import SellOutlined from '@mui/icons-material/SellOutlined';
import StickyNote2Outlined from '@mui/icons-material/StickyNote2Outlined';
import SwitchAccountOutlined from '@mui/icons-material/SwitchAccountOutlined';
import TuneOutlined from '@mui/icons-material/TuneOutlined';
import RequestQuoteOutlined from '@mui/icons-material/RequestQuoteOutlined';
import { md3, mobile, radius } from '../../../../theme/tokens';
import { venue } from '../../../data/venues';
import { formatTimeLabel } from '../../../data/courses';
import { money } from '../../../logic/cart';
import { usePos } from '../../../state/PosProvider';
import { Stack } from '../../../components/Stack';
import { MobileScreen, TopAppBar } from '../../chrome';
import { useMobileNav } from '../../navigation';
import type { ScreenProps } from '../types';
import { shortDate } from './people-utils';

/** Who is signed in to this device. Demo-only: the POS has no operator model yet. */
const OPERATOR = { name: 'Alex Rivera', role: 'Pro shop · Shift lead', initials: 'AR' };

/**
 * More — the fourth destination: day-level operations, configuration, and the session.
 *
 * Time-row operations (block, note, price, league) normally open from a row on the tee
 * sheet, where the time is already known. They're also listed here so they can be reached
 * without hunting for a row; from here they open at the first tee time and the dialog lets
 * the operator change it. Configuration pages (rate card, course settings) are pushes —
 * read-and-adjust pages with a back arrow, not forms with a Save.
 *
 * Order-level actions (split, promo code, tax exempt, refund…) are deliberately absent:
 * they act on an open order, so they belong on the order screen's overflow menu.
 */
export function MoreScreen(_: ScreenProps<'more'>) {
  const nav = useMobileNav();
  const { state, toast } = usePos();
  const club = venue(state.venueId);
  const first = state.settings.gridStartHour * 60;
  const date = shortDate(state.currentDate);

  return (
    <MobileScreen topBar={<TopAppBar title="More" leading="none" />}>
      {/* Venue + operator */}
      <Stack
        direction="row"
        alignItems="center"
        gap={2}
        sx={{ mx: 2, mb: 1, p: 2, borderRadius: `${radius.lg}px`, bgcolor: mobile.surfaceContainerLow, border: `1px solid ${md3.outlineVariant}` }}
      >
        <Box
          sx={{ width: 48, height: 48, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: md3.primaryContainer, color: md3.onPrimaryContainer, fontWeight: 500, flexShrink: 0 }}
        >
          {OPERATOR.initials}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" noWrap>
            {OPERATOR.name}
          </Typography>
          <Typography variant="body2" noWrap sx={{ color: md3.onSurfaceVariant }}>
            {OPERATOR.role}
          </Typography>
          <Typography variant="caption" noWrap component="div">
            {club.name} · {club.courses.length} course{club.courses.length === 1 ? '' : 's'}
          </Typography>
        </Box>
      </Stack>

      <Section title={`Tee sheet · ${date}`}>
        <Row
          icon={<BlockOutlined />}
          primary="Block time"
          secondary="Maintenance, ranger hold, shift change"
          onClick={() => nav.push({ name: 'blockTime', timeMin: first })}
        />
        <Row
          icon={<GroupsOutlined />}
          primary="League or outing"
          secondary="Reserve a run of tee times for a group"
          onClick={() => nav.push({ name: 'league', timeMin: first })}
        />
        <Row
          icon={<StickyNote2Outlined />}
          primary="Time note"
          secondary="Frost delay, lightning hold, shotgun start"
          onClick={() => nav.push({ name: 'timeNote', timeMin: first })}
        />
        <Row
          icon={<SellOutlined />}
          primary="Price override"
          secondary={`${Object.keys(state.timePrices).length || 'No'} override${Object.keys(state.timePrices).length === 1 ? '' : 's'} set · starts ${formatTimeLabel(first)}`}
          onClick={() => nav.push({ name: 'priceOverride', timeMin: first })}
        />
      </Section>

      <Section title="Pricing & courses">
        <Row
          icon={<RequestQuoteOutlined />}
          primary="Rate card"
          secondary="Published rates by time of day"
          onClick={() => nav.push({ name: 'rateCard' })}
          chevron
        />
        <Row
          icon={<TuneOutlined />}
          primary="Tee sheet & courses"
          secondary="Hours, intervals, visibility, display"
          onClick={() => nav.push({ name: 'courseSettings' })}
          chevron
        />
      </Section>

      <Section title="Register">
        <Row
          icon={<PrintOutlined />}
          primary="Reprint last receipt"
          secondary={state.lastPayment ? `${state.lastPayment.method} · ${money(state.lastPayment.amount)}` : 'No sale yet this session'}
          onClick={() => toast(state.lastPayment ? 'Receipt sent to printer' : 'No receipt to reprint')}
        />
      </Section>

      <Section title="Session">
        <Row icon={<SwitchAccountOutlined />} primary="Switch operator" onClick={() => toast('Operator sign-in comes in a later pass')} />
        <Row icon={<LogoutOutlined />} primary="Sign out" onClick={() => toast('Signed out (demo)')} />
      </Section>
      <Box sx={{ height: 16 }} />
    </MobileScreen>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
      <ListSubheader disableSticky>{title}</ListSubheader>
      {children}
    </Box>
  );
}

function Row({
  icon,
  primary,
  secondary,
  onClick,
  chevron,
}: {
  icon: ReactNode;
  primary: string;
  secondary?: string;
  onClick: () => void;
  chevron?: boolean;
}) {
  return (
    <li>
      <ListItemButton onClick={onClick} sx={{ minHeight: secondary ? mobile.listItem.two : mobile.listItem.one }}>
        <ListItemIcon>{icon}</ListItemIcon>
        <ListItemText primary={primary} secondary={secondary} />
        {chevron && <ChevronRight sx={{ color: md3.onSurfaceVariant }} />}
      </ListItemButton>
    </li>
  );
}
