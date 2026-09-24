import { useState } from 'react';
import { Box, ButtonBase, InputBase, Typography } from '@mui/material';
import { idMeGroups, md3, radius } from '../../theme/tokens';
import {
  CUSTOMER_TYPES,
  bookingName,
  formatPhone,
  normalizePhone,
  memberTierOf,
  referralsOf,
  type Customer,
} from '../data/customers';
import { liveCustomer, searchRoster } from '../data/roster';
import { idMeGroupOf } from '../data/golfers';
import type { IdMeGroup } from '../types';
import { seatSuggestedRecord } from '../logic/seat-pricing';
import { IdMeBadge } from './IdMeBadge';
import { golferOf } from '../data/customers';
import { assignPlayer } from '../logic/reservation';
import { rainCheckBalance, rainChecksFor } from '../data/rain-checks';
import { money } from '../logic/cart';
import { ModalFrame, FilledButton, OutlineButton } from '../modals/ModalFrame';
import { usePos } from '../state/PosProvider';
import { Icon } from './primitives';
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
  // Read through the overlay, so reopening a record shows what was saved to it.
  const customer = liveCustomer(m.customerId ?? undefined, state.customerEdits);
  if (!customer || m.assigning) return <AssignCustomer />;
  return <CustomerRecord customer={customer} />;
}

// ─── The record ─────────────────────────────────────────────────────────────

function CustomerRecord({ customer }: { customer: Customer }) {
  const { state, dispatch } = usePos();
  const [draft, setDraft] = useState<Partial<Customer>>({});
  const [types, setTypes] = useState<string[]>(customer.customerTypes);
  const [showAllTypes, setShowAllTypes] = useState(false);
  const idOpen = Boolean(state.customerModal?.viewingId);
  const setIdOpen = (open: boolean) => dispatch({ type: 'setViewingId', open });

  const close = () => dispatch({ type: 'closeCustomerModal' });
  const tier = memberTierOf(customer);
  const idMe = idMeGroupOf(customer.id);
  const credits = rainChecksFor(customer.id);
  const owed = rainCheckBalance(customer.id);
  const noShows = customer.teeTimes.filter((t) => t.status === 'No show').length;
  // Seeded from the customer id — see `referralsOf`. Nothing in the booking history says who
  // sent whom, so this is a record field rather than something counted off the tee sheet.
  const referrals = referralsOf(customer);
  const booked = customer.teeTimes.filter((t) => t.status).length;

  // One draft object rather than a `useState` per field: the record carries ten of them now,
  // and `field('city')` is the difference between a form and a wall of hooks.
  const val = (k: keyof Customer) => String(draft[k] ?? customer[k] ?? '');
  const set = (k: keyof Customer) => (v: string) => setDraft({ ...draft, [k]: v });

  // Saved into state rather than discarded: Weston's case is fixing a wrong email at the
  // counter, and an edit that vanishes on close demonstrates a form, not a fix. It lives as
  // long as any other demo edit and resets on reload.
  const save = () => {
    dispatch({
      type: 'patchCustomer',
      customerId: customer.id,
      patch: { ...draft, phone: normalizePhone(String(draft.phone ?? customer.phone ?? '')), customerTypes: types },
    });
    dispatch({ type: 'toast', message: `${bookingName(customer)} saved` });
    close();
  };

  return (
    <ModalFrame
      /*
        The name, and what this person is entitled to, on one line.
        Justin: "put the yellow tags with the name, customer id with the avatar." Membership
        is the first thing a counter needs off a record — it decides the rate — so it belongs
        beside the name rather than on a line of its own below the header.
      */
      title={
        <Stack direction="row" alignItems="center" gap={0.75} sx={{ flexWrap: 'wrap' }}>
          <span>
            {customer.firstName} {customer.lastName}
          </span>
          {tier && <Chip label={tier} tone="member" />}
          {customer.memberships.map((mem) => (
            <Chip key={mem.name} label={`${mem.name} · to ${mem.expires}`} tone="member" />
          ))}
        </Stack>
      }
      /* Card on file moved here when the sixth metric box took its place — it is an
         identifier, so it belongs with the other two rather than in a row of counts. */
      subtitle={
        `Customer ID ${customer.id} · Course ID ${customer.courseId}` +
        (customer.cardOnFile ? ` · Card •••• ${customer.cardOnFile}` : '')
      }
      icon="person"
      width={780}
      tall
      onClose={close}
      headerAside={
        idMe && (
          <>
            <IdMeBadge group={idMe} />
            {/*
              The whole of ID.me, as Weston described it on the fourth call: "you click on it
              and all it does is show the picture of their ID… okay, yep, that's Justin, I can
              see he's in front of me, he's gonna get the correct rate."
            */}
            <ButtonBase
              onClick={() => setIdOpen(true)}
              sx={{
                height: 32,
                px: 1.25,
                gap: 0.5,
                borderRadius: `${radius.xl}px`,
                border: `1.5px solid ${md3.outlineVariant}`,
                fontSize: 12,
                fontWeight: 700,
                color: md3.onSurface,
              }}
            >
              <Icon name="badge" size={14} />
              View ID
            </ButtonBase>
          </>
        )
      }
      actions={
        <Stack direction="row" gap={1} sx={{ justifyContent: 'flex-end', width: '100%' }}>
          <OutlineButton onClick={close}>Cancel</OutlineButton>
          <FilledButton onClick={save}>Save</FilledButton>
        </Stack>
      }
    >
      {/*
        Everything below is one 12px rhythm.

        The record Weston looked at used `<Stack gap={16}>`, and `gap` goes through MUI's
        spacing scale — so sixteen meant **128px**, not sixteen. Six sections separated by
        128px of nothing is what "it's just very spaced out… this looks bad" was describing,
        and why a record with no punch cards and no gift cards showed an empty half-screen
        between the account tiles and the history.
      */}
      <Stack direction="column" gap={1.5}>
        {/*
          What they are owed and what they have, before the form rather than after it.

          Justin: "put rewards, balance, rainchecks, etc above the form field." It is the half
          of the record a counter reads; the contact fields are the half they occasionally fix.
          Reading order should follow that, not the order the data happens to be stored in.
        */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px' }}>
          <Stat label="Rewards" value={`+${customer.rewardsBalance}`} />
          <Stat label="Balance" value={money(customer.balance)} alert={customer.balance > 0} />
          <Stat label="Rain checks" value={money(owed)} />
          <Stat label="Rounds" value={String(customer.teeTimes.length)} />
          <Stat label="Referrals" value={String(referrals)} />
          <Stat label="No-shows" value={String(noShows)} alert={noShows > 0} />
        </Box>

        {/*
          Contact, as an address block rather than a grid.

          It was three even columns, which read as a form to fill in. This is the shape the
          information actually has — one name, one email, one phone, then an address that is
          a street line and a city/state/zip line. Someone scanning for a phone number finds
          it on its own line instead of in the middle column of row two.

          The one-tap `@gmail.com` domain chips are gone at Justin's request. They solved
          Weston's original example — "is your email jonah.hamlet@hotmail? No, actually it's at
          Gmail" — but six chips under the field cost more room than they saved, and the field
          is still there to type in.
        */}
        <Stack direction="column" gap={1.25}>
          <Row2>
            <Field label="First name" value={val('firstName')} onChange={set('firstName')} />
            <Field label="Last name" value={val('lastName')} onChange={set('lastName')} />
          </Row2>
          <Row2>
            <Field label="Email" value={val('email')} onChange={set('email')} />
            <Field label="Phone" value={formatPhone(val('phone'))} onChange={set('phone')} />
          </Row2>
          <Field label="Street" value={val('street')} onChange={set('street')} />
          <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '10px' }}>
            <Field label="City" value={val('city')} onChange={set('city')} />
            <Field label="State" value={val('state')} onChange={set('state')} />
            <Field label="Zip" value={val('zip')} onChange={set('zip')} />
          </Box>
          {/*
            Not in the list Justin gave, kept because dropping them would lose data the record
            carries and Weston asked for notes to be reachable. Below the address so the five
            lines he named stay in the order he named them.
          */}
          <Field label="Birthday" value={val('birthday')} onChange={set('birthday')} placeholder="MM/DD/YYYY" />
          {/*
            Notes takes a paragraph and a line of its own. Weston's note about a player is prose
            — "needs an accessible cart, knee replacement in March" — and a single-line input
            that scrolls sideways is a box you cannot read back what you wrote into.
          */}
          <Field
            label="Notes"
            value={val('notes')}
            onChange={set('notes')}
            placeholder="Anything the counter or starter should know about this customer…"
            multiline
          />
        </Stack>

        {/*
          The sectioned half of the record, ported from v1's Customer Search screen.

          Justin: "I like the details, however I want to use our current design framework we
          have in v1." v1 gives each of these its own collapsing bar with the answer already
          on it, so a closed section still answers its question — the gift-card balance is on
          the Gift Cards bar whether or not anyone opens it.
        */}
        <Box>
          <CustomerSection title="Gift cards" summary={money(customer.giftCards.reduce((s, g) => s + g.balance, 0))}>
            {customer.giftCards.length === 0 ? (
              <Muted>No gift cards.</Muted>
            ) : (
              /*
                One row per card, not one total.

                Weston: "we probably want to know each gift card, like as a line item. Same
                with probably rain checks. So instead of a dollar amount, like they could
                have five, you know? Just to see them all."
              */
              <DataTable
                columns={['UPC', 'Type', 'Expires', 'Awarded', 'Spent', 'Balance']}
                widths="1.4fr .9fr .9fr .8fr .8fr .8fr"
                rows={customer.giftCards.map((g) => ({
                  key: g.id,
                  cells: [g.upc, g.type, g.expires, money(g.awarded), money(g.spent), money(g.balance)],
                  strongLast: true,
                }))}
              />
            )}
          </CustomerSection>

          <CustomerSection title="Rain checks" summary={money(owed)}>
            {credits.length === 0 ? (
              <Muted>No rain checks.</Muted>
            ) : (
              <DataTable
                columns={['Raincheck', 'Tee time', 'Holes', 'Awarded', 'Spent', 'Balance']}
                widths="1fr 1.4fr .6fr .8fr .8fr .8fr"
                rows={credits.map((r) => ({
                  key: r.id,
                  cells: [
                    r.id,
                    r.teeTime,
                    `${r.holesPlayed}/${r.totalHoles}`,
                    money(r.awarded),
                    money(r.spent),
                    money(r.balance),
                  ],
                  strongLast: true,
                  // A credit that is partly spent has to say where the rest went — that is the
                  // argument the counter actually has to settle.
                  sub: r.redemptions?.length
                    ? `${money(r.redemptions[0].amount)} spent on ${r.redemptions[0].what} · ${r.redemptions[0].at}`
                    : undefined,
                }))}
              />
            )}
          </CustomerSection>

          <CustomerSection title="Punch cards" summary={customer.punchCards.length ? `${customer.punchCards.length}` : 'None'}>
            {customer.punchCards.length === 0 ? (
              <Muted>No punch cards.</Muted>
            ) : (
              <DataTable
                columns={['Card', 'Remaining', 'Total', 'Expires']}
                widths="2fr .9fr .7fr 1fr"
                rows={customer.punchCards.map((c) => ({
                  key: c.name,
                  cells: [c.name, String(c.remaining), String(c.total), c.expires],
                }))}
              />
            )}
          </CustomerSection>

          <CustomerSection title="Tee time history" summary={`${booked} on the sheet · ${customer.teeTimes.length - booked} played`}>
            <DataTable
              columns={['TeeTime ID', 'Date', 'Players', 'Status']}
              widths="1fr 1.6fr .7fr .9fr"
              rows={customer.teeTimes.slice(0, 12).map((t) => ({
                key: t.id,
                cells: [t.id, t.date, String(t.players), t.status ?? '—'],
                alert: t.status === 'No show',
              }))}
            />
            {customer.teeTimes.length > 12 && <Muted>{customer.teeTimes.length - 12} earlier rounds</Muted>}
          </CustomerSection>

          {/* Weston: "it should just be expandable — show the one you have, and if you want to
              assign more you can." Not eighteen checkboxes. */}
          <CustomerSection title="Customer types" summary={`${types.length} of ${CUSTOMER_TYPES.length}`} defaultOpen={false}>
            <Stack direction="row" gap={0.75} sx={{ flexWrap: 'wrap' }}>
              {types.map((t) => (
                <Chip key={t} label={t} tone="on" onClick={() => setTypes(types.filter((x) => x !== t))} />
              ))}
              <Chip label={showAllTypes ? 'Done' : '+ Add type'} onClick={() => setShowAllTypes(!showAllTypes)} />
            </Stack>
            {showAllTypes && (
              <Stack direction="row" gap={0.75} sx={{ flexWrap: 'wrap', mt: 1 }}>
                {CUSTOMER_TYPES.filter((t) => !types.includes(t)).map((t) => (
                  <Chip key={t} label={t} onClick={() => setTypes([...types, t])} />
                ))}
              </Stack>
            )}
          </CustomerSection>
        </Box>
      </Stack>

      {idOpen && <IdDocumentDialog customer={customer} group={idMe} onClose={() => setIdOpen(false)} />}
    </ModalFrame>
  );
}

/**
 * A collapsing section with its answer on the bar, ported from v1's customer record.
 *
 * The summary is the point. A counter opening this record is usually answering one question —
 * "do I still have that gift card" — and a closed section that already says `$275.00` has
 * answered it without being opened. v1 put the owed figure on the bar for exactly this reason;
 * the bar here is v2's dark neutral rather than v1's navy so it belongs to this terminal, but
 * it behaves the same.
 */
function CustomerSection({
  title,
  summary,
  defaultOpen = true,
  children,
}: {
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Box sx={{ mb: 1 }}>
      <ButtonBase
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        sx={{
          width: '100%',
          // 44dp: Weston asked for bigger targets throughout — "let's make this as big as we
          // can, just because we need to plan for those" on a touchscreen.
          height: 44,
          px: 1.5,
          gap: 1,
          justifyContent: 'space-between',
          borderRadius: `${radius.sm}px`,
          bgcolor: md3.onSurface,
          color: md3.surface,
        }}
      >
        <Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>{title}</Typography>
        <Stack direction="row" alignItems="center" gap={0.75}>
          {summary && <Typography sx={{ fontSize: 13, opacity: 0.85 }}>{summary}</Typography>}
          <Icon name={open ? 'expand_less' : 'expand_more'} size={18} color={md3.surface} />
        </Stack>
      </ButtonBase>
      {open && <Box sx={{ px: 1.5, py: 1 }}>{children}</Box>}
    </Box>
  );
}

/** A compact table. One grid, so every row's columns line up without a `<table>`. */
function DataTable({
  columns,
  widths,
  rows,
}: {
  columns: string[];
  widths: string;
  rows: { key: string; cells: string[]; sub?: string; alert?: boolean; strongLast?: boolean }[];
}) {
  const grid = { display: 'grid', gridTemplateColumns: widths, gap: '8px', alignItems: 'baseline' } as const;
  return (
    <Box>
      <Box sx={{ ...grid, pb: 0.5, borderBottom: `1px solid ${md3.outlineVariant}` }}>
        {columns.map((c, n) => (
          <Typography
            key={c}
            sx={{ fontSize: 11, color: md3.onSurfaceVariant, textAlign: n === 0 ? 'left' : n < 2 ? 'left' : 'right' }}
          >
            {c}
          </Typography>
        ))}
      </Box>
      {rows.map((r) => (
        <Box key={r.key} sx={{ borderBottom: `1px solid ${md3.outlineVariant}`, py: 0.625 }}>
          <Box sx={grid}>
            {r.cells.map((cell, n) => (
              <Typography
                key={n}
                noWrap
                sx={{
                  fontSize: 12.5,
                  textAlign: n < 2 ? 'left' : 'right',
                  fontWeight: r.strongLast && n === r.cells.length - 1 ? 700 : 400,
                  color: r.alert && n === r.cells.length - 1 ? md3.error : md3.onSurface,
                }}
              >
                {cell}
              </Typography>
            ))}
          </Box>
          {r.sub && <Typography sx={{ fontSize: 11, color: md3.onSurfaceVariant }}>{r.sub}</Typography>}
        </Box>
      ))}
    </Box>
  );
}

/**
 * The picture of the ID the customer passed back through ID.me.
 *
 * This is the entire feature Weston described: *"all it does is show the picture of their ID…
 * okay, yep, that's Justin, I can see he's in front of me, he's gonna get the correct rate."*
 *
 * The prototype has no document store and will never have a real photograph of anybody, so the
 * card is **drawn from the record** and labelled as a stand-in. What it is demonstrating is the
 * layout of the moment — name, date of birth and address at a size readable across a counter,
 * with the portrait where the portrait goes — not the image itself.
 */
function IdDocumentDialog({
  customer,
  group,
  onClose,
}: {
  customer: Customer;
  group?: IdMeGroup;
  onClose: () => void;
}) {
  return (
    <ModalFrame
      title="ID on file"
      subtitle={`Passed back by ID.me${group ? ` · ${idMeGroups[group].label}` : ''}`}
      icon="badge"
      width={480}
      onClose={onClose}
      actions={<OutlineButton onClick={onClose}>Close</OutlineButton>}
    >
      <Box
        sx={{
          borderRadius: `${radius.md}px`,
          border: `1.5px solid ${md3.outlineVariant}`,
          bgcolor: md3.surfaceContainer,
          p: 2,
        }}
      >
        <Stack direction="row" gap={1.5}>
          <Box
            aria-hidden
            sx={{
              width: 92,
              height: 112,
              borderRadius: `${radius.sm}px`,
              bgcolor: md3.surfaceHigh,
              border: `1px solid ${md3.outlineVariant}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Icon name="person" size={44} color={md3.outline} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 19, fontWeight: 800, color: md3.onSurface }}>
              {customer.firstName} {customer.lastName}
            </Typography>
            <IdLine label="Date of birth" value={customer.birthday ?? '—'} />
            <IdLine label="Address" value={customer.street ?? '—'} />
            <IdLine label="" value={[customer.city, customer.state, customer.zip].filter(Boolean).join(', ') || '—'} />
          </Box>
        </Stack>
      </Box>
      <Typography sx={{ fontSize: 11.5, color: md3.onSurfaceVariant, mt: 1.25 }}>
        Drawn from the customer record — the prototype holds no document images. In Birdie this
        is the scan ID.me returned, shown so the counter can check the face against the person.
      </Typography>
    </ModalFrame>
  );
}

const IdLine = ({ label, value }: { label: string; value: string }) => (
  <Stack direction="row" gap={0.75} sx={{ mt: 0.5 }}>
    {label && (
      <Typography sx={{ fontSize: 11.5, color: md3.onSurfaceVariant, width: 84, flexShrink: 0 }}>{label}</Typography>
    )}
    {!label && <Box sx={{ width: 84, flexShrink: 0 }} />}
    <Typography sx={{ fontSize: 13.5, color: md3.onSurface }}>{value}</Typography>
  </Stack>
);

/** Two fields sharing a line — first/last, birthday/notes. */
const Row2 = ({ children }: { children: React.ReactNode }) => (
  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>{children}</Box>
);

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

  // A seat *named* like a customer, but not linked to one. It pays the booking's rate until
  // somebody links it — a name is not an identification — but there is no reason to make the
  // counter search for a person the seat is already called.
  const booking = state.bookings.find((x) => x.id === m?.bookingId);
  const suggested = booking && m?.seat != null ? seatSuggestedRecord(booking, m.seat, state.customerEdits) : null;

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
      /*
        Not "seat". Weston, round 4: "I wouldn't wanna call it a seat. I think we could just
        say add golfer, for position 2 — just because the seat is what we use for food and
        beverage." Two different things called the same word on one terminal is how a counter
        ends up sending a hot dog to the ninth tee.
      */
      title={m?.seat != null ? `Add golfer · position ${m.seat + 1}` : 'Find a customer'}
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
      {suggested && (
        <Box
          data-customer-suggestion
          sx={{
            mb: 1.25,
            p: '10px 12px',
            borderRadius: `${radius.md}px`,
            border: `1.5px solid ${md3.primary}`,
            bgcolor: md3.primaryContainer,
          }}
        >
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: md3.onPrimaryContainer, letterSpacing: 0.3 }}>
            SUGGESTED · NOT LINKED
          </Typography>
          <Stack direction="row" alignItems="center" gap={1} sx={{ mt: 0.5 }}>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{suggested.displayName}</Typography>
              <Typography sx={{ fontSize: 11.5, color: md3.onSurfaceVariant }}>
                {formatPhone(suggested.phone)} · {suggested.email}
              </Typography>
            </Box>
            <FilledButton onClick={() => link(suggested)}>Link</FilledButton>
          </Stack>
          <Typography sx={{ fontSize: 11, color: md3.onSurfaceVariant, mt: 0.75 }}>
            The seat is named like this customer but pays the booking's rate until it is linked.
          </Typography>
        </Box>
      )}
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
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  /** Three rows rather than one — for prose, where a sideways-scrolling input is unreadable. */
  multiline?: boolean;
}) {
  return (
    <Box>
      <Typography sx={{ fontSize: 11, color: md3.onSurfaceVariant, mb: '2px' }}>{label}</Typography>
      <InputBase
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        multiline={multiline}
        minRows={multiline ? 3 : undefined}
        // The caption above is a `Typography`, not a `<label>`, so without this the field is
        // unnamed to a screen reader and unfindable by its label in a test.
        inputProps={{ 'aria-label': label }}
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

const Muted = ({ children }: { children: React.ReactNode }) => (
  <Typography sx={{ fontSize: 12, color: md3.onSurfaceVariant, py: '4px' }}>{children}</Typography>
);
