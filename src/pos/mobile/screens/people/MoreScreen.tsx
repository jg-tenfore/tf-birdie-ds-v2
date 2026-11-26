import { useState } from 'react';
import type { ReactNode } from 'react';
import { Box, ListItemButton, ListItemIcon, ListItemText, ListSubheader, Typography } from '@mui/material';
import AssignmentTurnedInOutlined from '@mui/icons-material/AssignmentTurnedInOutlined';
import AttachMoneyOutlined from '@mui/icons-material/AttachMoneyOutlined';
import BlockOutlined from '@mui/icons-material/BlockOutlined';
import BoltOutlined from '@mui/icons-material/BoltOutlined';
import CheckCircle from '@mui/icons-material/CheckCircle';
import CreditCardOutlined from '@mui/icons-material/CreditCardOutlined';
import RestaurantOutlined from '@mui/icons-material/RestaurantOutlined';
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
import { ROLE_ACCESS, type NavKey } from '../../../data/nav';
import { staffById, type StaffRole } from '../../../data/staff';
import { venue } from '../../../data/venues';
import { useV1V2 } from '../../../edition';
import { formatTimeLabel } from '../../../data/courses';
import { money } from '../../../logic/cart';
import { usePos } from '../../../state/PosProvider';
import { Stack } from '../../../components/Stack';
import { BottomSheet, MobileScreen, TopAppBar } from '../../chrome';
import { barFor } from '../../bar-by-role';
import { useMobileNav } from '../../navigation';
import type { MobileRoute, MobileTab } from '../../navigation';
import type { ScreenProps } from '../types';
import { shortDate } from './people-utils';

/**
 * Who is signed in, before V1 → V2 gave the POS an operator. Weston Edits and the archive keep this
 * placeholder; V1 → V2 shows the signed-in staff member (`state.operatorId`).
 */
const OPERATOR = { name: 'Alex Rivera', role: 'Pro shop · Shift lead', initials: 'AR' };

const ROLE_LABEL: Record<StaffRole, string> = {
  manager: 'Manager',
  server: 'Server',
  bartender: 'Bartender',
  host: 'Host',
  'pro-shop': 'Pro shop',
};

/**
 * The restaurant's destinations, as More lists them (V1 → V2). A row shows when the operator's role
 * may use it (`ROLE_ACCESS`) and it is not already on their bar: a manager finds all five here, a
 * server only Reservations and Orders & Tips, a pro-shop operator none.
 */
const RESTAURANT_ROWS: { key: NavKey; tab?: MobileTab; route: MobileRoute; primary: string; secondary: string; icon: ReactNode }[] = [
  { key: 'tables', tab: 'tables', route: { name: 'tables' }, primary: 'Tables', secondary: 'The live floor: seat, open and move tabs', icon: <RestaurantOutlined /> },
  { key: 'tabs', tab: 'tabs', route: { name: 'tabs' }, primary: 'Tabs', secondary: 'Every open tab, the one that needs you first', icon: <CreditCardOutlined /> },
  { key: 'quickorder', tab: 'quick', route: { name: 'quickOrder' }, primary: 'Quick Order', secondary: 'Ring up the counter', icon: <BoltOutlined /> },
  { key: 'reservations', tab: 'reservations', route: { name: 'reservations' }, primary: 'Reservations', secondary: 'Today’s book: seat a party, mark a no-show', icon: <AssignmentTurnedInOutlined /> },
  { key: 'orderstips', route: { name: 'ordersTips' }, primary: 'Orders & Tips', secondary: 'Today’s payments and tips', icon: <AttachMoneyOutlined /> },
];

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
 *
 * **V1 → V2** adds who is signed in and menu by role. The card is the operator (`state.operatorId`);
 * **Restaurant** lists the restaurant destinations the role may use that are not already on its bar
 * (a manager sees all five, a server Reservations and Orders & Tips); the tee sheet's tools show only
 * to a role with the tee sheet; and **Switch operator** signs someone else in, which changes the bar.
 */
export function MoreScreen(_: ScreenProps<'more'>) {
  const nav = useMobileNav();
  const { state, dispatch, toast } = usePos();
  const club = venue(state.venueId);
  const first = state.settings.gridStartHour * 60;
  const date = shortDate(state.currentDate);
  const v1v2 = useV1V2();
  const [switching, setSwitching] = useState(false);
  // V1 → V2 has an operator, and the bar and this page follow their role (menu by role).
  const staff = v1v2 ? staffById(state.operatorId, state.staffRoster) : undefined;
  const operator = staff
    ? { name: staff.name, role: ROLE_LABEL[staff.role], initials: staff.name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2) }
    : OPERATOR;
  const can = (key: NavKey) => !staff || ROLE_ACCESS[staff.role].includes(key);
  const bar = barFor(staff?.role, v1v2);
  const restaurant = v1v2 ? RESTAURANT_ROWS.filter((r) => can(r.key) && !(r.tab && bar.includes(r.tab))) : [];
  const golf = can('teesheet');

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
          {operator.initials}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" noWrap data-operator={staff?.id}>
            {operator.name}
          </Typography>
          <Typography variant="body2" noWrap sx={{ color: md3.onSurfaceVariant }}>
            {operator.role}
          </Typography>
          <Typography variant="caption" noWrap component="div">
            {club.name} · {club.courses.length} course{club.courses.length === 1 ? '' : 's'}
          </Typography>
        </Box>
      </Stack>

      {restaurant.length > 0 && (
        <Section title="Restaurant">
          {restaurant.map((r) => (
            <Row key={r.key} icon={r.icon} primary={r.primary} secondary={r.secondary} onClick={() => nav.push(r.route)} chevron />
          ))}
        </Section>
      )}

      {golf && (
        <>
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
        </>
      )}

      <Section title="Register">
        <Row
          icon={<PrintOutlined />}
          primary="Reprint last receipt"
          secondary={state.lastPayment ? `${state.lastPayment.method} · ${money(state.lastPayment.amount)}` : 'No sale yet this session'}
          onClick={() => toast(state.lastPayment ? 'Receipt sent to printer' : 'No receipt to reprint')}
        />
      </Section>

      <Section title="Session">
        <Row
          icon={<SwitchAccountOutlined />}
          primary="Switch operator"
          secondary={v1v2 ? 'Sign in as someone else on this handheld' : undefined}
          onClick={() => (v1v2 ? setSwitching(true) : toast('Operator sign-in comes in a later pass'))}
        />
        <Row icon={<LogoutOutlined />} primary="Sign out" onClick={() => toast('Signed out (demo)')} />
      </Section>
      <Box sx={{ height: 16 }} />

      {/*
        V1 → V2: switching operator is the tablet's PIN sign-in (`signIn`), so the role, the bar and
        every tab opened from here on follow the person chosen. The list stands in for the keypad —
        a prototype's staff, whose PINs the tablet's sign-in prints anyway.
      */}
      <BottomSheet open={switching} onClose={() => setSwitching(false)} title="Switch operator">
        <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, pb: 1 }} data-operator-list>
          {state.staffRoster
            .filter((m) => (m as { active?: boolean }).active !== false)
            .map((m) => (
              <li key={m.id}>
                <ListItemButton
                  data-sign-in={m.id}
                  selected={m.id === state.operatorId}
                  onClick={() => {
                    dispatch({ type: 'signIn', pin: m.pin });
                    setSwitching(false);
                    toast(`Signed in as ${m.name}`);
                  }}
                  sx={{ minHeight: mobile.listItem.two, px: 3 }}
                >
                  <ListItemText primary={m.name} secondary={ROLE_LABEL[m.role]} />
                  {m.id === state.operatorId && <CheckCircle sx={{ color: md3.primary }} />}
                </ListItemButton>
              </li>
            ))}
        </Box>
      </BottomSheet>
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
