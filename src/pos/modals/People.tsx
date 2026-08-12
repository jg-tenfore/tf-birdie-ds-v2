import { useMemo, useState } from 'react';
import { Box, ButtonBase, Typography } from '@mui/material';
import { md3, memberTypes, playerAccents, radius } from '../../theme/tokens';
import type { MemberTypeKey } from '../../theme/tokens';
import { AP_CONFIGS } from '../data/config';
import { CATALOG, MODIFIER_ITEMS } from '../data/catalog';
import { formatTimeLabel } from '../data/courses';
import { ALL_GOLFERS, MEMBER_DB } from '../data/golfers';
import * as cart from '../logic/cart';
import { dayBookings, selectedBooking } from '../state/pos-store';
import { usePos } from '../state/PosProvider';
import type { Golfer } from '../types';
import { Icon, MemberDot, SectionLabel, deltaMoney } from '../components/primitives';
import {
  Callout,
  Field,
  FilledButton,
  ModalFrame,
  ModalSection,
  OutlineButton,
  PillGroup,
  ResultList,
  ResultRow,
  SelectField,
} from './ModalFrame';
import { Stack } from '../components/Stack';

/**
 * People-facing dialogs: member validation, golfer search, guest details, new
 * customers, and the per-player action panel.
 */

// ─── Member lookup ──────────────────────────────────────────────────────────

/**
 * Gate a member-rate item behind a CRM match.
 *
 * A member rate can't be rung up without naming the member, and only members of the
 * *required* tier are selectable — a senior member can't be used to buy a student
 * rate. Non-matching records still appear, greyed, so staff can see the person exists
 * and why they don't qualify rather than concluding the search is broken.
 */
export function MemberLookup({ itemName, requiredType }: { itemName: string; requiredType: string }) {
  const { dispatch, toast } = usePos();
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<Golfer | null>(null);

  const cfg = memberTypes[requiredType as MemberTypeKey] ?? {
    label: requiredType,
    color: md3.primary,
    bg: md3.primaryContainer,
  };
  const price = CATALOG['CHECK IN'].items.find((i) => i.n === itemName)?.p ?? 0;

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = q
      ? MEMBER_DB.filter((g) => g.name.toLowerCase().includes(q) || g.phone.includes(q))
      : MEMBER_DB.filter((g) => g.memberType === requiredType);
    // Eligible members first, so the common case is at the top of the list.
    return [...pool].sort((a, b) => {
      const ae = a.memberType === requiredType ? 0 : 1;
      const be = b.memberType === requiredType ? 0 : 1;
      return ae - be || a.name.localeCompare(b.name);
    });
  }, [query, requiredType]);

  const confirm = () => {
    if (!picked) return;
    dispatch({ type: 'selectGolfer', golfer: picked });
    dispatch({ type: 'addItem', name: itemName, price });
    dispatch({ type: 'closeModal' });
    toast(`${itemName} · ${picked.name}`);
  };

  return (
    <ModalFrame
      width={520}
      title="Verify membership"
      subtitle={`${itemName} requires a ${cfg.label.toLowerCase()}`}
      icon="verified_user"
      iconColor={cfg.color}
      actions={
        <>
          <OutlineButton onClick={() => dispatch({ type: 'closeModal' })}>Cancel</OutlineButton>
          <FilledButton disabled={!picked} onClick={confirm}>
            Apply member rate
          </FilledButton>
        </>
      }
    >
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.75,
          px: 1.5,
          py: 0.625,
          borderRadius: `${radius.xl}px`,
          bgcolor: cfg.bg,
          color: cfg.color,
          fontSize: 12,
          fontWeight: 700,
          mb: 1.75,
        }}
      >
        <Icon name="verified_user" size={16} color={cfg.color} />
        {cfg.label} required
      </Box>

      <Field autoFocus value={query} onChange={setQuery} placeholder="Search member name or phone…" />

      <Box sx={{ mt: 1.25 }}>
        <ResultList>
          {results.length === 0 ? (
            <Box sx={{ p: 2, fontSize: 12, color: md3.outline, textAlign: 'center' }}>
              No members match that search.
            </Box>
          ) : (
            results.map((g) => {
              const eligible = g.memberType === requiredType;
              const tier = g.memberType ? memberTypes[g.memberType] : null;
              return (
                <ResultRow
                  key={g.id}
                  primary={
                    <Stack direction="row" alignItems="center" gap={0.5}>
                      <MemberDot memberType={g.memberType} size={7} />
                      {g.name}
                    </Stack>
                  }
                  secondary={`${g.phone} · ${g.email} · HCP ${g.hcp}`}
                  badge={tier?.label ?? 'Guest'}
                  badgeColor={tier?.color}
                  badgeBg={tier?.bg}
                  disabled={!eligible}
                  selected={picked?.id === g.id}
                  onClick={() => setPicked(g)}
                />
              );
            })
          )}
        </ResultList>
      </Box>

      {picked && (
        <Box sx={{ mt: 1.75 }}>
          <Callout tone="success">
            {picked.name} · {memberTypes[picked.memberType as MemberTypeKey]?.label} · HCP {picked.hcp} —
            eligible for {itemName} at {price === 0 ? 'no charge' : cart.money(price)}.
          </Callout>
        </Box>
      )}
      {query.trim() && results.every((g) => g.memberType !== requiredType) && (
        <Box sx={{ mt: 1.25 }}>
          <Callout tone="warning">
            No {cfg.label.toLowerCase()} matches that search. Greyed rows are members of a different
            tier and can't use this rate.
          </Callout>
        </Box>
      )}
    </ModalFrame>
  );
}

// ─── Golfer search ──────────────────────────────────────────────────────────

/** Attach a CRM golfer to the order, or to one seat on it. */
export function GolferSearch({
  target,
}: {
  target: 'primary' | { itemIdx: number; playerIdx: number };
}) {
  const { dispatch, toast } = usePos();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<string>('all');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    let pool = ALL_GOLFERS;
    if (filter === 'members') pool = pool.filter((g) => Boolean(g.memberType));
    else if (filter !== 'all') pool = pool.filter((g) => g.memberType === filter);
    if (q) pool = pool.filter((g) => g.name.toLowerCase().includes(q) || g.phone.includes(q));
    return pool.slice(0, 40);
  }, [query, filter]);

  const choose = (g: Golfer) => {
    if (target === 'primary') {
      dispatch({ type: 'selectGolfer', golfer: g });
    } else {
      dispatch({
        type: 'updatePlayer',
        itemIndex: target.itemIdx,
        playerIndex: target.playerIdx,
        patch: { name: g.name, crmId: g.id, phone: g.phone, memberType: g.memberType },
      });
    }
    dispatch({ type: 'closeModal' });
    toast(`${g.name} selected`);
  };

  return (
    <ModalFrame
      width={520}
      tall
      title="Find golfer"
      subtitle="Search the member roster and guest records"
      icon="person"
      actions={
        <>
          <OutlineButton onClick={() => dispatch({ type: 'openModal', modal: { kind: 'newCustomer' } })}>
            New customer
          </OutlineButton>
          <Box sx={{ flex: 1 }} />
          <OutlineButton onClick={() => dispatch({ type: 'closeModal' })}>Cancel</OutlineButton>
        </>
      }
    >
      <Field autoFocus value={query} onChange={setQuery} placeholder="Search name or phone…" />
      <Box sx={{ mt: 1.25, mb: 1.25 }}>
        <PillGroup
          value={filter}
          options={[
            { label: 'Everyone', value: 'all' },
            { label: 'Members', value: 'members' },
            ...(Object.keys(memberTypes) as MemberTypeKey[]).map((k) => ({
              label: memberTypes[k].label.replace(' Member', ''),
              value: k as string,
              color: memberTypes[k].color,
            })),
          ]}
          onChange={setFilter}
        />
      </Box>
      <ResultList maxHeight={400}>
        {results.map((g) => {
          const tier = g.memberType ? memberTypes[g.memberType] : null;
          return (
            <ResultRow
              key={g.id}
              primary={
                <Stack direction="row" alignItems="center" gap={0.5}>
                  <MemberDot memberType={g.memberType} size={7} />
                  {g.name}
                </Stack>
              }
              secondary={`${g.phone} · ${g.email} · HCP ${g.hcp}`}
              badge={tier?.label ?? 'Guest'}
              badgeColor={tier?.color}
              badgeBg={tier?.bg}
              onClick={() => choose(g)}
            />
          );
        })}
      </ResultList>
    </ModalFrame>
  );
}

// ─── Guest detail ───────────────────────────────────────────────────────────

/**
 * One seat's details: name, contact, handicap, note.
 *
 * Offers a CRM search first and a free-form form second, because most guests in a
 * foursome are already in the system and typing their details again would be waste.
 */
export function GuestDetail({ guestIndex }: { guestIndex: number }) {
  const { state, dispatch, toast } = usePos();
  const booking = selectedBooking(state);
  const itemIdx = state.cart.findIndex((i) => i.isCheckIn);
  const player = itemIdx >= 0 ? state.cart[itemIdx].players?.[guestIndex] : undefined;

  const existing = booking?.guests?.[guestIndex];
  const label = guestIndex === 0 ? booking?.name ?? 'Player 1' : `Guest ${guestIndex + 1}`;
  const currentName = player?.name ?? existing?.name ?? '';

  const [mode, setMode] = useState<'search' | 'form'>('search');
  const [query, setQuery] = useState('');
  const [first, setFirst] = useState(currentName.split(',')[1]?.trim() ?? '');
  const [last, setLast] = useState(currentName.split(',')[0]?.trim() ?? '');
  const [phone, setPhone] = useState(existing?.phone ?? player?.phone ?? '');
  const [email, setEmail] = useState(existing?.email ?? '');
  const [hcp, setHcp] = useState(String(existing?.hcp ?? ''));
  const [member, setMember] = useState<string>(String(existing?.memberType ?? player?.memberType ?? ''));
  const [notes, setNotes] = useState(existing?.notes ?? '');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return ALL_GOLFERS.filter(
      (g) => g.name.toLowerCase().includes(q) || g.phone.includes(q),
    ).slice(0, 8);
  }, [query]);

  const applyName = (name: string, patch: Partial<{ phone: string; memberType: string; crmId: string }> = {}) => {
    if (itemIdx >= 0) {
      dispatch({
        type: 'updatePlayer',
        itemIndex: itemIdx,
        playerIndex: guestIndex,
        patch: {
          name,
          phone: patch.phone,
          crmId: patch.crmId,
          memberType: (patch.memberType as MemberTypeKey) ?? null,
        },
      });
    }
    if (booking) {
      const guests = [...(booking.guests ?? [])];
      while (guests.length <= guestIndex) guests.push({ name: `Guest ${guests.length + 1}` });
      guests[guestIndex] = { ...guests[guestIndex], name, phone: patch.phone, email, notes, hcp, memberType: (patch.memberType as MemberTypeKey) ?? null };
      dispatch({ type: 'patchBooking', bookingId: booking.id, patch: { guests } });
    }
    dispatch({ type: 'closeModal' });
    toast(`${name} saved`);
  };

  const save = () => {
    const name = last ? `${last}, ${first}`.replace(/,\s*$/, '').replace(/^,\s*/, '') : first;
    if (!name.trim()) return toast('Enter a name');
    applyName(name, { phone, memberType: member });
  };

  return (
    <ModalFrame
      width={520}
      title={`${label} details`}
      subtitle={mode === 'search' ? 'Search existing records, or enter details manually' : 'Guest details'}
      icon="person_add"
      actions={
        mode === 'form' ? (
          <>
            <OutlineButton onClick={() => setMode('search')}>Back to search</OutlineButton>
            <Box sx={{ flex: 1 }} />
            <FilledButton onClick={save}>Save guest</FilledButton>
          </>
        ) : (
          <>
            <OutlineButton onClick={() => setMode('form')}>Enter manually</OutlineButton>
            <Box sx={{ flex: 1 }} />
            <OutlineButton onClick={() => dispatch({ type: 'closeModal' })}>Cancel</OutlineButton>
          </>
        )
      }
    >
      {mode === 'search' ? (
        <>
          <Field autoFocus value={query} onChange={setQuery} placeholder="Search name or phone…" />
          {results.length > 0 && (
            <Box sx={{ mt: 1.25 }}>
              <ResultList>
                {results.map((g) => (
                  <ResultRow
                    key={g.id}
                    primary={
                      <Stack direction="row" alignItems="center" gap={0.5}>
                        <MemberDot memberType={g.memberType} size={7} />
                        {g.name}
                      </Stack>
                    }
                    secondary={`${g.phone} · HCP ${g.hcp}`}
                    badge={g.memberType ? memberTypes[g.memberType].label : 'Guest'}
                    onClick={() =>
                      applyName(g.name, {
                        phone: g.phone,
                        memberType: g.memberType ?? undefined,
                        crmId: g.id,
                      })
                    }
                  />
                ))}
              </ResultList>
            </Box>
          )}
          {query.trim() && results.length === 0 && (
            <Box sx={{ mt: 1.25 }}>
              <Callout tone="info">
                No record matches "{query.trim()}". Enter their details manually to add them to this
                tee time.
              </Callout>
            </Box>
          )}
        </>
      ) : (
        <>
          <ModalSection title="Name">
            <Stack direction="row" gap={1.5}>
              <Field label="First" value={first} onChange={setFirst} autoFocus />
              <Field label="Last" value={last} onChange={setLast} />
            </Stack>
          </ModalSection>
          <ModalSection title="Contact">
            <Stack direction="row" gap={1.5}>
              <Field label="Phone" value={phone} onChange={setPhone} placeholder="(555) 000-0000" />
              <Field label="Email" value={email} onChange={setEmail} placeholder="name@email.com" />
            </Stack>
          </ModalSection>
          <ModalSection title="Golf">
            <Stack direction="row" gap={1.5}>
              <Field label="Handicap" value={hcp} onChange={setHcp} type="number" />
              <SelectField
                label="Membership"
                value={member}
                options={[
                  { label: 'Guest', value: '' },
                  ...(Object.keys(memberTypes) as MemberTypeKey[]).map((k) => ({
                    label: memberTypes[k].label,
                    value: k as string,
                  })),
                ]}
                onChange={setMember}
              />
            </Stack>
          </ModalSection>
          <ModalSection title="Note" hint="Shows on this player's cart line at point of sale">
            <Field multiline value={notes} onChange={setNotes} placeholder="No note" />
          </ModalSection>
        </>
      )}
    </ModalFrame>
  );
}

// ─── New customer ───────────────────────────────────────────────────────────

/** Create a CRM record from the counter. */
export function NewCustomer() {
  const { dispatch, toast } = usePos();
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [member, setMember] = useState('');
  const [hcp, setHcp] = useState('');
  const [notes, setNotes] = useState('');

  const save = () => {
    const name = last ? `${last}, ${first}`.replace(/,\s*$/, '') : first;
    if (!name.trim()) return toast('Enter a name');
    const golfer: Golfer = {
      id: `C${Date.now()}`,
      name,
      phone: phone || '—',
      email,
      type: member ? 'Member' : 'Guest',
      memberType: (member || null) as MemberTypeKey | null,
      hcp: parseInt(hcp, 10) || 0,
      notes,
    };
    dispatch({ type: 'selectGolfer', golfer });
    dispatch({ type: 'closeModal' });
    toast(`${name} created`);
  };

  return (
    <ModalFrame
      width={520}
      title="New customer"
      subtitle="Adds a record and attaches them to this order"
      icon="person_add"
      actions={
        <>
          <OutlineButton onClick={() => dispatch({ type: 'closeModal' })}>Cancel</OutlineButton>
          <FilledButton onClick={save}>Create customer</FilledButton>
        </>
      }
    >
      <ModalSection title="Name">
        <Stack direction="row" gap={1.5}>
          <Field label="First" value={first} onChange={setFirst} autoFocus />
          <Field label="Last" value={last} onChange={setLast} />
        </Stack>
      </ModalSection>
      <ModalSection title="Contact">
        <Stack direction="row" gap={1.5}>
          <Field label="Phone" value={phone} onChange={setPhone} placeholder="(555) 000-0000" />
          <Field label="Email" value={email} onChange={setEmail} placeholder="name@email.com" />
        </Stack>
      </ModalSection>
      <ModalSection title="Golf">
        <Stack direction="row" gap={1.5}>
          <SelectField
            label="Membership"
            value={member}
            options={[
              { label: 'Guest', value: '' },
              ...(Object.keys(memberTypes) as MemberTypeKey[]).map((k) => ({
                label: memberTypes[k].label,
                value: k as string,
              })),
            ]}
            onChange={setMember}
          />
          <Field label="Handicap" value={hcp} onChange={setHcp} type="number" />
        </Stack>
      </ModalSection>
      <ModalSection title="Notes">
        <Field multiline value={notes} onChange={setNotes} placeholder="Preferences, accessibility needs…" />
      </ModalSection>
    </ModalFrame>
  );
}

// ─── Walk-in ────────────────────────────────────────────────────────────────

/** The fast path: name a walk-in golfer and start their order. */
export function WalkIn() {
  const { dispatch, toast } = usePos();
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return ALL_GOLFERS.filter((g) => g.name.toLowerCase().includes(q) || g.phone.includes(q)).slice(0, 6);
  }, [query]);

  const start = (name: string, golfer?: Golfer) => {
    if (golfer) dispatch({ type: 'selectGolfer', golfer });
    else
      dispatch({
        type: 'selectGolfer',
        golfer: { id: `W${Date.now()}`, name, phone: '—', email: '', type: 'Guest', memberType: null, hcp: 0 },
      });
    dispatch({ type: 'setFlowMode', mode: 'walkin' });
    dispatch({ type: 'setCategory', category: 'CHECK IN' });
    dispatch({ type: 'closeModal' });
    toast(`Walk-in started · ${name}`);
  };

  return (
    <ModalFrame
      width={480}
      title="Walk-in"
      subtitle="Name the golfer, then ring their rate"
      icon="directions_walk"
      actions={
        <>
          <OutlineButton onClick={() => dispatch({ type: 'closeModal' })}>Cancel</OutlineButton>
          <FilledButton disabled={!query.trim()} onClick={() => start(query.trim())}>
            Start walk-in
          </FilledButton>
        </>
      }
    >
      <Field autoFocus value={query} onChange={setQuery} placeholder="Golfer name or phone…" />
      {results.length > 0 && (
        <Box sx={{ mt: 1.25 }}>
          <SectionLabel color={md3.outline} sx={{ mb: 0.75 }}>
            Existing records
          </SectionLabel>
          <ResultList maxHeight={200}>
            {results.map((g) => (
              <ResultRow
                key={g.id}
                primary={
                  <Stack direction="row" alignItems="center" gap={0.5}>
                    <MemberDot memberType={g.memberType} size={7} />
                    {g.name}
                  </Stack>
                }
                secondary={`${g.phone} · HCP ${g.hcp}`}
                badge={g.memberType ? memberTypes[g.memberType].label : 'Guest'}
                onClick={() => start(g.name, g)}
              />
            ))}
          </ResultList>
        </Box>
      )}
    </ModalFrame>
  );
}

// ─── Player modifier picker ─────────────────────────────────────────────────

/**
 * Apply modifiers to one player.
 *
 * Grouped by what they do to the price — rate overrides replace it, transport adds to
 * it, discounts reduce it — because that grouping is exactly the precedence the
 * pricing follows, and only one override and one transport can be active at a time.
 */
export function PlayerModifierPicker({ itemIdx, playerIdx }: { itemIdx: number; playerIdx: number }) {
  const { state, dispatch } = usePos();
  const item = state.cart[itemIdx];
  const player = item?.players?.[playerIdx];
  const [seat, setSeat] = useState(playerIdx);

  if (!item || !player) return null;
  const activePlayer = item.players?.[seat] ?? player;
  const applied = new Set((activePlayer.modifierTags ?? []).map((t) => t.name));
  const unitPrice = item.unitPrice ?? 0;

  const mods = CATALOG['MODIFIERS'].items;
  const groups = [
    { label: 'Rate overrides', hint: 'Replaces the green fee — one at a time', items: mods.filter((m) => !m.isDiscount && !m.isTransport) },
    { label: 'Transport', hint: 'Added on top — one at a time', items: mods.filter((m) => m.isTransport) },
    { label: 'Discounts', hint: 'Reduce the green fee — these stack', items: mods.filter((m) => m.isDiscount) },
  ];

  const breakdown = cart.playerBreakdown(unitPrice, activePlayer);

  return (
    <ModalFrame
      width={520}
      tall
      title="Modifiers"
      subtitle={`${activePlayer.name} · ${item.name}`}
      icon="local_offer"
      iconColor="#2563eb"
      actions={<FilledButton onClick={() => dispatch({ type: 'closeModal' })}>Done</FilledButton>}
    >
      {(item.players?.length ?? 0) > 1 && (
        <ModalSection title="Player">
          <PillGroup
            value={seat}
            options={(item.players ?? []).map((p, i) => ({
              label: p.name,
              value: i,
              color: playerAccents[i % playerAccents.length],
            }))}
            onChange={setSeat}
          />
        </ModalSection>
      )}

      <Stack
        direction="row"
        alignItems="baseline"
        justifyContent="space-between"
        sx={{ p: '11px 14px', bgcolor: md3.surfaceContainer, borderRadius: `${radius.md}px`, mb: 2.25 }}
      >
        <Box>
          <Typography sx={{ fontSize: 11, color: md3.onSurfaceVariant }}>Green fee</Typography>
          <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{cart.money(breakdown.fee)}</Typography>
        </Box>
        <Box>
          <Typography sx={{ fontSize: 11, color: md3.onSurfaceVariant }}>Transport</Typography>
          <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{cart.money(breakdown.transport)}</Typography>
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          <Typography sx={{ fontSize: 11, color: md3.onSurfaceVariant }}>Player total</Typography>
          <Typography sx={{ fontSize: 18, fontWeight: 800 }}>{cart.money(breakdown.total)}</Typography>
        </Box>
      </Stack>

      {groups.map((g) => (
        <ModalSection key={g.label} title={g.label} hint={g.hint}>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 0.75 }}>
            {g.items.map((m) => {
              const on = applied.has(m.n);
              const delta = m.isDiscount ? m.p : m.isTransport ? m.p : m.p - unitPrice;
              return (
                <ButtonBase
                  key={m.n}
                  onClick={() =>
                    dispatch({
                      type: 'togglePlayerModifier',
                      itemIndex: itemIdx,
                      playerIndex: seat,
                      modName: m.n,
                    })
                  }
                  sx={{
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: 0.375,
                    p: '10px 12px',
                    borderRadius: `${radius.md}px`,
                    border: `1.5px solid ${on ? m.tagColor : md3.outlineVariant}`,
                    bgcolor: on ? `${m.tagColor}1a` : '#fff',
                    textAlign: 'left',
                    '&:hover': { borderColor: m.tagColor },
                  }}
                >
                  <Stack direction="row" alignItems="center" gap={0.75} sx={{ width: '100%' }}>
                    <Box
                      component="span"
                      sx={{
                        px: 0.875,
                        py: '2px',
                        borderRadius: '3px',
                        fontSize: 9,
                        fontWeight: 800,
                        letterSpacing: '.5px',
                        bgcolor: m.tagColor,
                        color: '#fff',
                      }}
                    >
                      {m.tag}
                    </Box>
                    <Box sx={{ flex: 1 }} />
                    {on && <Icon name="check" size={15} color={m.tagColor} />}
                  </Stack>
                  <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{m.n}</Typography>
                  <Typography sx={{ fontSize: 10.5, color: md3.onSurfaceVariant }}>
                    {m.desc} · {m.isOverride ? 'sets fee to $0.00' : deltaMoney(delta)}
                  </Typography>
                </ButtonBase>
              );
            })}
          </Box>
        </ModalSection>
      ))}
    </ModalFrame>
  );
}

// ─── Action panel ───────────────────────────────────────────────────────────

/**
 * Check-in, refund, or rain check applied to a specific player, found by search.
 *
 * The player pool is the current booking when one is loaded, and otherwise every
 * booking on the day — which is how a counter operator handles "someone from the 8:16
 * needs a rain check" without hunting the grid first.
 */
export function ActionPanel({ action }: { action: 'checkin' | 'refund' | 'raincheck' }) {
  const { state, dispatch, toast } = usePos();
  const cfg = AP_CONFIGS[action];
  const booking = selectedBooking(state);
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<{ bookingId: string; idx: number } | null>(null);

  const pool = useMemo(() => {
    const source = booking ? [booking] : dayBookings(state).filter((b) => b.pay !== 'block' && b.pay !== 'event');
    const rows = source.flatMap((b) =>
      (b.playerStates ?? []).map((p, idx) => ({
        bookingId: b.id,
        idx,
        name: idx === 0 ? b.name : b.guests?.[idx]?.name || `Guest ${idx + 1}`,
        booking: b,
        stateRow: p,
      })),
    );
    const q = query.trim().toLowerCase();
    return (q ? rows.filter((r) => r.name.toLowerCase().includes(q) || r.booking.conf.toLowerCase().includes(q)) : rows).slice(0, 60);
  }, [booking, state, query]);

  const apply = () => {
    if (!picked) return;
    const b = state.bookings.find((x) => x.id === picked.bookingId);
    if (!b) return;
    const row = pool.find((r) => r.bookingId === picked.bookingId && r.idx === picked.idx);

    if (action === 'checkin') {
      dispatch({
        type: 'patchBooking',
        bookingId: b.id,
        patch: {
          playerStates: b.playerStates.map((p, i) =>
            i === picked.idx ? { ...p, step: 0, noShow: false } : p,
          ),
        },
      });
      toast(`${row?.name} checked in`);
    } else {
      dispatch({
        type: 'patchBooking',
        bookingId: b.id,
        patch: {
          pay: action === 'refund' ? 'refund' : 'rain_chk',
          financialActions: [
            ...(b.financialActions ?? []),
            {
              time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
              label: action === 'refund' ? 'Refund' : 'Rain check',
              player: row?.name ?? 'Player',
              type: action === 'refund' ? 'refund' : 'raincheck',
            },
          ],
        },
      });
      toast(`${cfg.title} · ${row?.name}`);
    }
    dispatch({ type: 'closeModal' });
  };

  return (
    <ModalFrame
      width={520}
      tall
      title={cfg.title}
      subtitle={booking ? `${booking.name} · ${booking.conf}` : "Search today's players"}
      icon={cfg.icon}
      iconColor={cfg.color}
      actions={
        <>
          <OutlineButton onClick={() => dispatch({ type: 'closeModal' })}>Cancel</OutlineButton>
          <FilledButton disabled={!picked} onClick={apply}>
            {cfg.title}
          </FilledButton>
        </>
      }
    >
      <Field autoFocus value={query} onChange={setQuery} placeholder="Search player or confirmation…" />
      <Box sx={{ mt: 1.25 }}>
        <ResultList maxHeight={420}>
          {pool.map((r) => {
            const isPicked = picked?.bookingId === r.bookingId && picked.idx === r.idx;
            const course = state.courses.find((c) => c.id === r.booking.course);
            return (
              <ResultRow
                key={`${r.bookingId}-${r.idx}`}
                primary={
                  <Stack direction="row" alignItems="center" gap={0.5}>
                    <MemberDot name={r.name} size={7} />
                    {r.name}
                  </Stack>
                }
                secondary={`${formatTimeLabel(r.booking.timeMin)} · ${course?.name} · ${r.booking.conf}`}
                badge={r.stateRow.noShow ? 'NO SHOW' : r.stateRow.paid ? 'PAID' : 'UNPAID'}
                badgeColor={r.stateRow.paid ? '#16a34a' : md3.error}
                badgeBg={r.stateRow.paid ? '#dcfce7' : '#ffdad6'}
                selected={isPicked}
                onClick={() => setPicked({ bookingId: r.bookingId, idx: r.idx })}
              />
            );
          })}
        </ResultList>
      </Box>
      {action !== 'checkin' && picked && (
        <Box sx={{ mt: 1.5 }}>
          <Callout tone="warning">
            This records a {action === 'refund' ? 'refund' : 'rain check'} against the booking and
            appears in its financial trail.
          </Callout>
        </Box>
      )}
      {/* Referenced so the panel refreshes if the modifier catalog changes. */}
      <Box sx={{ display: 'none' }}>{Object.keys(MODIFIER_ITEMS).length}</Box>
    </ModalFrame>
  );
}
