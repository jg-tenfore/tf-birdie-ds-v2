import { useState } from 'react';
import { Box, ButtonBase, List, ListItemButton, ListItemText, TextField, Typography } from '@mui/material';
import { md3, radius } from '../../../../theme/tokens';
import {
  CUSTOMER_TYPES,
  EMAIL_DOMAINS,
  bookingName,
  formatPhone,
  golferOf,
  normalizePhone,
  memberTierOf,
  type Customer,
} from '../../../data/customers';
import { liveCustomer, searchRoster } from '../../../data/roster';
import { rainCheckBalance, rainChecksFor } from '../../../data/rain-checks';
import { money } from '../../../logic/cart';
import { assignPlayer } from '../../../logic/reservation';
import { Stack } from '../../../components/Stack';
import { usePos } from '../../../state/PosProvider';
import { DialogTopBar, MobileScreen } from '../../chrome';
import { useMobileNav } from '../../navigation';
import type { ScreenProps } from '../types';
import { SectionHeader } from './parts';

/**
 * A customer's record, on the phone (Weston Edits, round 3).
 *
 * The same move as the tablet: the Customer **tab** is gone, because a customer is not a
 * property of a tee time. Weston's problem was concrete — "they're like, hey, is your email
 * jonah.hamlet@hotmail? No, actually it's at Gmail. If I want to fix that, currently I go all
 * the way to customer lookup." Tapping the player's name opens the record instead, and closing
 * it puts you back on the reservation exactly as you left it.
 *
 * Contact details edit in place. Memberships, customer types, punch cards, rain checks, gift
 * cards and rounds played are shown but not edited: taking money is the register's job, and a
 * second place to do it is a second place for the totals to disagree.
 *
 * A seat with nobody in it opens the same route in **assign** mode — search or create. That is
 * how Guest 3 becomes somebody, and linking is what makes that person price the round. A
 * matching name never does.
 */
export function CustomerRecordScreen({ route }: ScreenProps<'customerRecord'>) {
  const { state } = usePos();
  // Read through the session overlay, so reopening shows what was saved.
  const customer = liveCustomer(route.customerId ?? undefined, state.customerEdits);
  if (!customer) return <AssignSeat route={route} />;
  return <Record customer={customer} />;
}

function Record({ customer }: { customer: Customer }) {
  const { dispatch } = usePos();
  const nav = useMobileNav();
  const [email, setEmail] = useState(customer.email);
  const [phone, setPhone] = useState(formatPhone(customer.phone));
  const [notes, setNotes] = useState(customer.notes ?? '');
  const [types, setTypes] = useState<string[]>(customer.customerTypes);
  const [showAll, setShowAll] = useState(false);

  const tier = memberTierOf(customer);
  const credits = rainChecksFor(customer.id);
  const noShows = customer.teeTimes.filter((t) => t.status === 'No show').length;

  return (
    <MobileScreen
      topBar={
        <DialogTopBar
          title={`${customer.firstName} ${customer.lastName}`}
          confirmLabel="Save"
          onConfirm={() => {
            // Saved, not discarded: the case Weston described is fixing a wrong email, and an
            // edit that vanishes on close demonstrates a form rather than a fix.
            dispatch({
              type: 'patchCustomer',
              customerId: customer.id,
              patch: { email, phone: normalizePhone(phone), notes, customerTypes: types },
            });
            dispatch({ type: 'toast', message: `${bookingName(customer)} saved` });
            nav.pop();
          }}
          onClose={() => nav.pop()}
        />
      }
    >
      <Box sx={{ p: 2, pb: 4 }}>
        <Typography sx={{ fontSize: 11.5, color: md3.onSurfaceVariant }}>
          Customer ID {customer.id} · Course ID {customer.courseId}
        </Typography>

        <SectionHeader sx={{ px: 0 }}>Contact</SectionHeader>
        <Stack direction="column" gap={1.25}>
          <TextField label="Email" fullWidth size="small" value={email} onChange={(e) => setEmail(e.target.value)} />
          {/* One tap beats typing a whole address on glass, and removes the commonest source
              of a bad one. */}
          <Stack direction="row" gap={0.75} sx={{ flexWrap: 'wrap' }}>
            {EMAIL_DOMAINS.map((d) => (
              <Chip key={d} label={d} onClick={() => setEmail(`${email.split('@')[0]}${d}`)} />
            ))}
          </Stack>
          <TextField label="Phone" fullWidth size="small" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <TextField label="Notes" fullWidth size="small" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Stack>

        <SectionHeader sx={{ px: 0 }}>Membership &amp; types</SectionHeader>
        <Stack direction="row" gap={0.75} sx={{ flexWrap: 'wrap' }}>
          {customer.memberships.length === 0 && <Muted>No memberships</Muted>}
          {customer.memberships.map((m) => (
            <Chip key={m.name} label={`${m.name} · to ${m.expires}`} tone="member" />
          ))}
          {tier && <Chip label={tier} tone="member" />}
        </Stack>
        {/* Weston on the old screen: "it should just be like expandable — show the one you have,
            and if you want to assign more you can." Not eighteen checkboxes in a column. */}
        <Stack direction="row" gap={0.75} sx={{ flexWrap: 'wrap', mt: 1 }}>
          {types.map((t) => (
            <Chip key={t} label={t} tone="on" onClick={() => setTypes(types.filter((x) => x !== t))} />
          ))}
          <Chip label={showAll ? 'Done' : '+ Add type'} onClick={() => setShowAll(!showAll)} />
        </Stack>
        {showAll && (
          <Stack direction="row" gap={0.75} sx={{ flexWrap: 'wrap', mt: 1 }}>
            {CUSTOMER_TYPES.filter((t) => !types.includes(t)).map((t) => (
              <Chip key={t} label={t} onClick={() => setTypes([...types, t])} />
            ))}
          </Stack>
        )}

        <SectionHeader sx={{ px: 0 }}>Account</SectionHeader>
        <Stack direction="row" gap={1} sx={{ flexWrap: 'wrap' }}>
          <Stat label="Rewards" value={`+${customer.rewardsBalance}`} />
          <Stat label="Balance" value={money(customer.balance)} alert={customer.balance > 0} />
          <Stat label="Rain checks" value={money(rainCheckBalance(customer.id))} />
          <Stat label="Rounds" value={String(customer.teeTimes.length)} />
          <Stat label="No-shows" value={String(noShows)} alert={noShows > 0} />
        </Stack>

        {customer.punchCards.length > 0 && (
          <>
            <SectionHeader sx={{ px: 0 }}>Punch cards</SectionHeader>
            {customer.punchCards.map((p) => (
              <Line key={p.name} left={p.name} right={`${p.remaining} of ${p.total} left`} sub={`Expires ${p.expires}`} />
            ))}
          </>
        )}

        {customer.giftCards.length > 0 && (
          <>
            <SectionHeader sx={{ px: 0 }}>Gift cards</SectionHeader>
            {customer.giftCards.map((g) => (
              <Line key={g.id} left={`${g.type} · ${g.upc}`} right={money(g.balance)} sub={`Expires ${g.expires}`} />
            ))}
          </>
        )}

        {credits.length > 0 && (
          <>
            <SectionHeader sx={{ px: 0 }}>Rain checks</SectionHeader>
            {credits.map((r) => (
              <Line
                key={r.id}
                left={`${r.id} · ${r.teeTime}`}
                right={money(r.balance)}
                // A partly-spent credit has to say where the rest went — that is the argument
                // the counter actually has to settle.
                sub={
                  r.redemptions?.length
                    ? `${money(r.awarded)} awarded · ${money(r.spent)} on ${r.redemptions[0].what}`
                    : `${money(r.awarded)} awarded · ${r.holesPlayed} of ${r.totalHoles} played`
                }
              />
            ))}
          </>
        )}

        <SectionHeader sx={{ px: 0 }}>Tee time history</SectionHeader>
        {customer.teeTimes.slice(0, 8).map((t) => (
          <Line
            key={t.id}
            left={t.date}
            right={t.status ?? '—'}
            sub={`${t.players} player${t.players === 1 ? '' : 's'} · ${t.id}`}
            alert={t.status === 'No show'}
          />
        ))}
        {customer.teeTimes.length > 8 && <Muted>{customer.teeTimes.length - 8} earlier rounds</Muted>}
      </Box>
    </MobileScreen>
  );
}

/** The same route on an empty seat: search the roster, or create somebody. */
function AssignSeat({ route }: { route: ScreenProps<'customerRecord'>['route'] }) {
  const { state, dispatch } = usePos();
  const nav = useMobileNav();
  const [query, setQuery] = useState('');
  const results = searchRoster(query, 8);

  const link = (c: Customer) => {
    const b = state.bookings.find((x) => x.id === route.bookingId);
    if (b && route.seat != null) {
      dispatch({ type: 'patchBooking', bookingId: b.id, patch: assignPlayer(b, route.seat, golferOf(c)) });
    }
    nav.pop();
  };

  return (
    <MobileScreen
      topBar={
        <DialogTopBar
          title={route.seat != null ? `Who is in seat ${route.seat + 1}?` : 'Find a customer'}
          confirmLabel="New"
          onConfirm={() => nav.push({ name: 'newCustomer' })}
          onClose={() => nav.pop()}
        />
      }
    >
      <Box sx={{ p: 2 }}>
        <TextField
          autoFocus
          fullWidth
          size="small"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, phone, email or ID"
        />
      </Box>
      {query.trim().length < 2 && <Muted>Type at least two characters.</Muted>}
      <List disablePadding>
        {results.map((c) => (
          <ListItemButton key={c.id} onClick={() => link(c)} sx={{ minHeight: 56 }}>
            <ListItemText
              primary={c.displayName}
              secondary={`${formatPhone(c.phone)} · ${c.email}`}
              slotProps={{ primary: { sx: { fontSize: 14, fontWeight: 600 } }, secondary: { sx: { fontSize: 12 } } }}
            />
          </ListItemButton>
        ))}
      </List>
    </MobileScreen>
  );
}

// ─── Parts ──────────────────────────────────────────────────────────────────

function Chip({ label, onClick, tone }: { label: string; onClick?: () => void; tone?: 'on' | 'member' }) {
  const bg = tone === 'member' ? '#fef3c7' : tone === 'on' ? md3.primaryContainer : md3.surfaceContainer;
  const fg = tone === 'member' ? '#92400e' : tone === 'on' ? md3.onPrimaryContainer : md3.onSurfaceVariant;
  return (
    <ButtonBase
      onClick={onClick}
      disabled={!onClick}
      sx={{ px: 1.25, py: 0.75, borderRadius: 999, bgcolor: bg, color: fg, fontSize: 12.5, fontWeight: 700 }}
    >
      {label}
    </ButtonBase>
  );
}

function Stat({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <Box sx={{ px: 1.25, py: 0.75, borderRadius: `${radius.sm}px`, bgcolor: md3.surfaceContainer, minWidth: 92 }}>
      <Typography sx={{ fontSize: 11, color: md3.onSurfaceVariant }}>{label}</Typography>
      <Typography sx={{ fontSize: 15, fontWeight: 700, color: alert ? md3.error : md3.onSurface }}>{value}</Typography>
    </Box>
  );
}

function Line({ left, right, sub, alert }: { left: string; right: string; sub?: string; alert?: boolean }) {
  return (
    <Stack
      direction="row"
      gap={1}
      sx={{ justifyContent: 'space-between', alignItems: 'flex-start', py: 0.75, borderBottom: `1px solid ${md3.outlineVariant}` }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: 13 }}>{left}</Typography>
        {sub && <Typography sx={{ fontSize: 11, color: md3.onSurfaceVariant }}>{sub}</Typography>}
      </Box>
      <Typography sx={{ fontSize: 13, fontWeight: 700, color: alert ? md3.error : md3.onSurface, whiteSpace: 'nowrap' }}>
        {right}
      </Typography>
    </Stack>
  );
}

const Muted = ({ children }: { children: React.ReactNode }) => (
  <Typography sx={{ fontSize: 12.5, color: md3.onSurfaceVariant, px: 2, py: 1 }}>{children}</Typography>
);
