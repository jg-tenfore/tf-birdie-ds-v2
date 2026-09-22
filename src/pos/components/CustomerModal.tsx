import { useState } from 'react';
import { Box, ButtonBase, InputBase, Typography } from '@mui/material';
import { md3, radius } from '../../theme/tokens';
import {
  CUSTOMER_TYPES,
  EMAIL_DOMAINS,
  bookingName,
  formatPhone,
  memberTierOf,
  type Customer,
} from '../data/customers';
import { customerForId, searchRoster } from '../data/roster';
import { golferOf } from '../data/customers';
import { assignPlayer } from '../logic/reservation';
import { rainCheckBalance, rainChecksFor } from '../data/rain-checks';
import { money } from '../logic/cart';
import { ModalFrame, FilledButton, OutlineButton } from '../modals/ModalFrame';
import { usePos } from '../state/PosProvider';
import { SectionLabel } from './primitives';
import { Stack } from './Stack';

/**
 * The customer record (Weston Edits, round 3).
 *
 * Weston's problem, in his words: "I click on Hamlet, I hit edit, and they're like, hey, is
 * your email jonah.hamlet@hotmail? Like, no, actually it's at Gmail… Currently I go all the way
 * to customer lookup." So the record opens from the player's name, over whatever you were
 * doing, and closing it puts you back exactly where you were.
 *
 * It is deliberately **not** a tab on the reservation. A customer is not a property of a tee
 * time — the same person is on four other bookings this month, and the questions staff get
 * asked ("do I still have that gift card", "I didn't no-show") are about the person, not the
 * round. Opened on an empty seat it starts in assign mode instead, which is how Guest 3 becomes
 * somebody.
 *
 * Contact details edit in place. Everything financial — punch cards, rain checks, gift cards —
 * is read-only here: taking money is the register's job, and a second place to do it is a
 * second place for the totals to disagree.
 */
export function CustomerModal() {
  const { state } = usePos();
  const m = state.customerModal;
  if (!m) return null;
  const customer = customerForId(m.customerId ?? undefined);
  if (!customer || m.assigning) return <AssignCustomer />;
  return <CustomerRecord customer={customer} />;
}

// ─── The record ─────────────────────────────────────────────────────────────

function CustomerRecord({ customer }: { customer: Customer }) {
  const { dispatch } = usePos();
  const [email, setEmail] = useState(customer.email);
  const [phone, setPhone] = useState(formatPhone(customer.phone));
  const [notes, setNotes] = useState(customer.notes ?? '');
  const [types, setTypes] = useState<string[]>(customer.customerTypes);
  const [showAllTypes, setShowAllTypes] = useState(false);

  const close = () => dispatch({ type: 'closeCustomerModal' });
  const tier = memberTierOf(customer);
  const credits = rainChecksFor(customer.id);
  const owed = rainCheckBalance(customer.id);
  const noShows = customer.teeTimes.filter((t) => t.status === 'No show').length;

  const save = () => {
    dispatch({ type: 'toast', message: `${bookingName(customer)} saved` });
    close();
  };

  return (
    <ModalFrame
      title={`${customer.firstName} ${customer.lastName}`}
      subtitle={`Customer ID ${customer.id} · Course ID ${customer.courseId}`}
      icon="person"
      width={720}
      tall
      onClose={close}
      actions={
        <Stack direction="row" gap={8} sx={{ justifyContent: 'flex-end', width: '100%' }}>
          <OutlineButton onClick={close}>Cancel</OutlineButton>
          <FilledButton onClick={save}>Save</FilledButton>
        </Stack>
      }
    >
      <Stack direction="column" gap={16}>
        {/* Contact — the half Weston actually needs to fix at the counter. */}
        <Box>
          <SectionLabel>Contact</SectionLabel>
          <Stack direction="column" gap={8}>
            <Field label="Email" value={email} onChange={setEmail} />
            <Stack direction="row" gap={6} sx={{ flexWrap: 'wrap' }}>
              {EMAIL_DOMAINS.map((d) => (
                <Chip
                  key={d}
                  label={d}
                  onClick={() => setEmail(`${email.split('@')[0]}${d}`)}
                />
              ))}
            </Stack>
            <Field label="Phone" value={phone} onChange={setPhone} />
            <Field label="Notes" value={notes} onChange={setNotes} placeholder="Notes for this customer" />
          </Stack>
        </Box>

        {/* Memberships and types. Weston: "it should just be like expandable — show the one you
            have, and if you want to assign more you can." Not eighteen checkboxes. */}
        <Box>
          <SectionLabel>Membership & types</SectionLabel>
          <Stack direction="row" gap={6} sx={{ flexWrap: 'wrap', mb: '8px' }}>
            {customer.memberships.length === 0 && <Muted>No memberships</Muted>}
            {customer.memberships.map((mem) => (
              <Chip key={mem.name} label={`${mem.name} · to ${mem.expires}`} tone="member" />
            ))}
            {tier && <Chip label={tier} tone="member" />}
          </Stack>
          <Stack direction="row" gap={6} sx={{ flexWrap: 'wrap' }}>
            {types.map((t) => (
              <Chip key={t} label={t} tone="on" onClick={() => setTypes(types.filter((x) => x !== t))} />
            ))}
            <Chip
              label={showAllTypes ? 'Done' : '+ Add type'}
              onClick={() => setShowAllTypes(!showAllTypes)}
            />
          </Stack>
          {showAllTypes && (
            <Stack direction="row" gap={6} sx={{ flexWrap: 'wrap', mt: '8px' }}>
              {CUSTOMER_TYPES.filter((t) => !types.includes(t)).map((t) => (
                <Chip key={t} label={t} onClick={() => setTypes([...types, t])} />
              ))}
            </Stack>
          )}
        </Box>

        {/* What they're owed and what they've got — the questions asked at the counter. */}
        <Box>
          <SectionLabel>Account</SectionLabel>
          <Stack direction="row" gap={8} sx={{ flexWrap: 'wrap' }}>
            <Stat label="Rewards" value={`+${customer.rewardsBalance}`} />
            <Stat label="Balance" value={money(customer.balance)} alert={customer.balance > 0} />
            <Stat label="Rain checks" value={money(owed)} />
            <Stat label="Rounds" value={String(customer.teeTimes.length)} />
            <Stat label="No-shows" value={String(noShows)} alert={noShows > 0} />
            {customer.cardOnFile && <Stat label="Card" value={`•••• ${customer.cardOnFile}`} />}
          </Stack>
        </Box>

        {customer.punchCards.length > 0 && (
          <Box>
            <SectionLabel>Punch cards</SectionLabel>
            {customer.punchCards.map((p) => (
              <Row key={p.name} left={p.name} right={`${p.remaining} of ${p.total} left`} sub={`Expires ${p.expires}`} />
            ))}
          </Box>
        )}

        {customer.giftCards.length > 0 && (
          <Box>
            <SectionLabel>Gift cards</SectionLabel>
            {customer.giftCards.map((g) => (
              <Row key={g.id} left={`${g.type} · ${g.upc}`} right={money(g.balance)} sub={`Expires ${g.expires}`} />
            ))}
          </Box>
        )}

        {credits.length > 0 && (
          <Box>
            <SectionLabel>Rain checks</SectionLabel>
            {credits.map((r) => (
              <Row
                key={r.id}
                left={`${r.id} · ${r.teeTime}`}
                right={money(r.balance)}
                // A credit that is partly spent has to say where the rest went — that is the
                // argument the counter actually has to settle.
                sub={
                  r.redemptions?.length
                    ? `${money(r.awarded)} awarded · ${money(r.spent)} spent on ${r.redemptions[0].what}`
                    : `${money(r.awarded)} awarded · ${r.holesPlayed} of ${r.totalHoles} played`
                }
              />
            ))}
          </Box>
        )}

        <Box>
          <SectionLabel>Tee time history</SectionLabel>
          {customer.teeTimes.slice(0, 8).map((t) => (
            <Row
              key={t.id}
              left={t.date}
              right={t.status ?? '—'}
              sub={`${t.players} player${t.players === 1 ? '' : 's'} · ${t.id}`}
              alert={t.status === 'No show'}
            />
          ))}
          {customer.teeTimes.length > 8 && <Muted>{customer.teeTimes.length - 8} earlier rounds</Muted>}
        </Box>
      </Stack>
    </ModalFrame>
  );
}

// ─── Assign mode ────────────────────────────────────────────────────────────

/**
 * The same surface, opened on a seat with nobody in it.
 *
 * Weston: "if you go to customer and you say guests 2 through 4… you click on 3 and say, do you
 * have a profile or not? Let me make a new one." Search, or create — both without leaving the
 * reservation behind.
 */
function AssignCustomer() {
  const { state, dispatch } = usePos();
  const m = state.customerModal;
  const [query, setQuery] = useState('');
  const results = searchRoster(query, 6);
  const close = () => dispatch({ type: 'closeCustomerModal' });

  // Linking writes the crmId onto the seat, which is the only thing that makes this person
  // price the round — a matching name never has and never will.
  const link = (c: Customer) => {
    const booking = state.bookings.find((x) => x.id === m?.bookingId);
    if (booking && m?.seat != null) {
      dispatch({
        type: 'patchBooking',
        bookingId: booking.id,
        patch: assignPlayer(booking, m.seat, golferOf(c)),
      });
    }
    dispatch({ type: 'closeCustomerModal' });
  };

  return (
    <ModalFrame
      title={m?.seat != null ? `Who is in seat ${m.seat + 1}?` : 'Find a customer'}
      subtitle="Search by name, phone, email or customer ID"
      icon="person_search"
      width={560}
      tall
      onClose={close}
      actions={
        <Stack direction="row" gap={8} sx={{ justifyContent: 'space-between', width: '100%' }}>
          <OutlineButton onClick={() => dispatch({ type: 'openModal', modal: { kind: 'newCustomer' } })}>
            New customer
          </OutlineButton>
          <OutlineButton onClick={close}>Cancel</OutlineButton>
        </Stack>
      }
    >
      <InputBase
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search customers"
        sx={{
          width: '100%',
          fontSize: 15,
          p: '10px 12px',
          border: `1.5px solid ${md3.outlineVariant}`,
          borderRadius: `${radius.md}px`,
          mb: '10px',
        }}
      />
      {query.trim().length < 2 && <Muted>Type at least two characters.</Muted>}
      {query.trim().length >= 2 && results.length === 0 && <Muted>Nobody matches “{query}”.</Muted>}
      {results.map((c) => (
        <ButtonBase
          key={c.id}
          onClick={() => link(c)}
          sx={{
            width: '100%',
            justifyContent: 'flex-start',
            textAlign: 'left',
            p: '9px 10px',
            borderRadius: `${radius.sm}px`,
            '&:hover': { bgcolor: md3.surfaceContainer },
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: md3.onSurface }}>
              {c.displayName}
            </Typography>
            <Typography sx={{ fontSize: 12, color: md3.onSurfaceVariant }}>
              {formatPhone(c.phone)} · {c.email} · ID {c.id}
            </Typography>
          </Box>
        </ButtonBase>
      ))}
    </ModalFrame>
  );
}

// ─── Small parts ────────────────────────────────────────────────────────────

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <Box>
      <Typography sx={{ fontSize: 11, color: md3.onSurfaceVariant, mb: '2px' }}>{label}</Typography>
      <InputBase
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        sx={{
          width: '100%',
          fontSize: 14,
          p: '7px 10px',
          border: `1.5px solid ${md3.outlineVariant}`,
          borderRadius: `${radius.sm}px`,
          bgcolor: md3.onPrimary,
        }}
      />
    </Box>
  );
}

function Chip({
  label,
  onClick,
  tone,
}: {
  label: string;
  onClick?: () => void;
  tone?: 'on' | 'member';
}) {
  const bg = tone === 'member' ? '#fef3c7' : tone === 'on' ? md3.primaryContainer : md3.surfaceContainer;
  const fg = tone === 'member' ? '#92400e' : tone === 'on' ? md3.onPrimaryContainer : md3.onSurfaceVariant;
  return (
    <ButtonBase
      onClick={onClick}
      disabled={!onClick}
      sx={{
        px: '9px',
        py: '4px',
        borderRadius: 999,
        bgcolor: bg,
        color: fg,
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {label}
    </ButtonBase>
  );
}

function Stat({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <Box
      sx={{
        px: '10px',
        py: '6px',
        borderRadius: `${radius.sm}px`,
        bgcolor: md3.surfaceContainer,
        minWidth: 84,
      }}
    >
      <Typography sx={{ fontSize: 11, color: md3.onSurfaceVariant }}>{label}</Typography>
      <Typography sx={{ fontSize: 15, fontWeight: 700, color: alert ? md3.error : md3.onSurface }}>
        {value}
      </Typography>
    </Box>
  );
}

function Row({
  left,
  right,
  sub,
  alert,
}: {
  left: string;
  right: string;
  sub?: string;
  alert?: boolean;
}) {
  return (
    <Stack
      direction="row"
      gap={8}
      sx={{
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        py: '6px',
        borderBottom: `1px solid ${md3.outlineVariant}`,
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: 13, color: md3.onSurface }}>{left}</Typography>
        {sub && <Typography sx={{ fontSize: 11, color: md3.onSurfaceVariant }}>{sub}</Typography>}
      </Box>
      <Typography
        sx={{ fontSize: 13, fontWeight: 600, color: alert ? md3.error : md3.onSurface, whiteSpace: 'nowrap' }}
      >
        {right}
      </Typography>
    </Stack>
  );
}

const Muted = ({ children }: { children: React.ReactNode }) => (
  <Typography sx={{ fontSize: 12, color: md3.onSurfaceVariant, py: '4px' }}>{children}</Typography>
);
