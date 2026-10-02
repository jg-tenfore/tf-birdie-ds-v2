import { useState, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box, ButtonBase, InputBase, Typography } from '@mui/material';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { md3, radius } from '../../../../theme/tokens';
import { money } from '../../../../pos/logic/cart';
import { Icon } from '../../../../pos/components/primitives';
import { Stack } from '../../../../pos/components/Stack';
import { Screen } from '../../../pos/screen-helpers';
import { Avatar, Chip, MockPanelHeader, WhatChanged } from '../../100126/mock-kit';
import { memberGuest, outing } from '../../100126/scenarios';
import { Seg, SidePanel, TOUCH, Terminal, TouchButton } from '../mock-kit-2';
import {
  DAY_LABEL,
  EXTRAS,
  LEAGUE_FEE,
  SEATS,
  firstName,
  formatLabel,
  groupLabel,
  leagues,
  matches,
  dueOf,
  owes,
  startLabel,
  transportOf,
  type Arrival,
  type Format,
  type Golfer,
  type League,
} from './leagues';

/**
 * V1 → V2 Migration / 100226 / 8 · League view v2
 *
 * **Weston, on 100126's group view:** *"the idea is just to have a place where you can manage the
 * whole group… speed and checking in of golfers who are arriving at the same time."* He wants more on
 * it, and it is **not phase one**. Two of his examples: *"Justin, you're the 7:20"* — placing the
 * roster on tee times, ahead of time or on the day — and *"Justin's here, pay. Johnny, check in,
 * pay"* without leaving the screen.
 *
 * **Original** — a Member-Guest tee time opens like any other reservation: one group of four, with
 * ‹ › to step through the rest.
 *
 * **Proposal** — the normal per-tee-time flow stays the default; a **League view** is one tap away
 * from a league's tee time. In it, all four things Justin chose:
 *
 * 1. **Roster to tee times** — the roster on the left, the tee times (or shotgun teams) on the right:
 *    tap a name, then a seat, or drag it across.
 * 2. **Check in without leaving** — search by name or tee time; **Check in** and **Pay** on every
 *    golfer; **Extra** jumps to the register for a bucket of balls and comes straight back.
 * 3. **Shotgun or tee times** — shotgun lists everyone by name or team under one big search, because
 *    they all arrive at once; tee times groups them by time, with the next one up marked.
 * 4. **Several leagues in a day** — a switcher across the top, each keeping its own state.
 *
 * The roster is invented; the tee-timed league uses the Member-Guest seed's tee times on May 30.
 */
const meta = {
  title: 'V1 → V2 Migration/100226/8 · League view v2',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** Today: one tee time of the outing, opened like a single reservation. */
export const Original: Story = {
  render: () => <Screen edition="v1v2" initialState={outing(memberGuest()[0])} />,
};

// ─── State ──────────────────────────────────────────────────────────────────

interface LeagueState {
  groups: Record<string, number | null>;
  arrivals: Record<string, Arrival>;
  format: Format;
}

type Tab = 'checkin' | 'assign';

const initialState = (l: League): LeagueState => ({ groups: { ...l.groups }, arrivals: { ...l.arrivals }, format: l.format });

const count = (l: League, s: LeagueState) => ({
  in: l.roster.filter((g) => s.arrivals[g.id]?.in).length,
  paid: l.roster.filter((g) => s.arrivals[g.id]?.paid).length,
  placed: l.roster.filter((g) => s.groups[g.id] != null).length,
});

// ─── Small parts ────────────────────────────────────────────────────────────

const LABEL_SX = { fontSize: 11, fontWeight: 800, letterSpacing: '.05em', color: md3.outline } as const;

function SearchField({ value, onChange, placeholder, big }: { value: string; onChange: (v: string) => void; placeholder: string; big?: boolean }) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      gap={1}
      sx={{ height: big ? 56 : TOUCH + 4, px: 1.5, flex: big ? undefined : 1, minWidth: 0, borderRadius: `${radius.xl}px`, border: `1.5px solid ${value ? md3.primary : md3.outlineVariant}`, bgcolor: '#fff' }}
    >
      <Icon name="search" size={big ? 24 : 19} color={md3.onSurfaceVariant} />
      <InputBase
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputProps={{ 'aria-label': 'Search the league', 'data-league-search': true }}
        sx={{ flex: 1, fontSize: big ? 18 : 14, fontWeight: 600 }}
      />
      {value && (
        <ButtonBase aria-label="Clear search" onClick={() => onChange('')} sx={{ width: 32, height: 32, borderRadius: '50%' }}>
          <Icon name="close" size={18} />
        </ButtonBase>
      )}
    </Stack>
  );
}

/** One golfer on the check-in screen: who, what they owe, Check in, Pay, Extra. */
function GolferRow({ g, a, tag, onCheckIn, onPay, onExtra }: { g: Golfer; a: Arrival; tag?: string; onCheckIn: () => void; onPay: () => void; onExtra: () => void }) {
  const t = transportOf(g);
  return (
    <Stack data-league-golfer={g.id} direction="row" alignItems="center" gap={1} sx={{ minHeight: 52, px: 1.5, py: 0.5, borderTop: `1px solid ${md3.surfaceContainer}`, bgcolor: a.paid ? '#f6fdf9' : '#fff' }}>
      <Avatar name={g.name} color={a.paid ? md3.primary : md3.outline} size={30} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" alignItems="center" gap={0.75}>
          <Typography sx={{ fontSize: 14.5, fontWeight: 800, whiteSpace: 'nowrap' }}>{g.name}</Typography>
          {tag && <Chip label={tag} tone="muted" />}
          {(a.extras ?? []).length > 0 && <Chip label={`+ ${(a.extras ?? []).map((e) => e.name).join(', ')}`} tone="new" icon="storefront" />}
        </Stack>
        <Box sx={{ fontSize: 11.5, color: md3.onSurfaceVariant, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          League fee {money(LEAGUE_FEE)} · {t.name} {money(t.price)}
        </Box>
      </Box>
      <TouchButton tone={a.in ? 'done' : 'outline'} label={a.in ? `${g.name} is checked in` : `Check in ${g.name}`} onClick={a.in ? undefined : onCheckIn} sx={{ minWidth: 104 }}>
        {a.in ? (
          <>
            In <Icon name="check" size={16} />
          </>
        ) : (
          'Check in'
        )}
      </TouchButton>
      <TouchButton tone={a.paid ? 'done' : 'filled'} label={a.paid ? `${g.name} has paid` : `Pay for ${g.name}`} onClick={a.paid ? undefined : onPay} sx={{ minWidth: 118 }}>
        {a.paid ? (
          <>
            Paid <Icon name="check" size={16} />
          </>
        ) : (
          `Pay ${money(dueOf(g, a))}`
        )}
      </TouchButton>
      <TouchButton tone="ghost" icon="add_shopping_cart" label={`Extra for ${g.name}`} onClick={onExtra} />
    </Stack>
  );
}

function GroupCard({ title, badge, sub, children, id }: { title: string; badge?: ReactNode; sub: string; children: ReactNode; id: string }) {
  return (
    <Box data-league-group={id} sx={{ bgcolor: '#fff', border: `1px solid ${md3.outlineVariant}`, borderRadius: `${radius.md}px`, overflow: 'hidden', alignSelf: 'start' }}>
      <Stack direction="row" alignItems="center" gap={1} sx={{ px: 1.5, height: 44, bgcolor: md3.surfaceContainer }}>
        <Typography sx={{ fontSize: 15, fontWeight: 800 }}>{title}</Typography>
        {badge}
        <Box sx={{ flex: 1 }} />
        <Typography sx={{ fontSize: 12, color: md3.onSurfaceVariant, fontWeight: 600 }}>{sub}</Typography>
      </Stack>
      {children}
    </Box>
  );
}

// ─── Check in ───────────────────────────────────────────────────────────────

function CheckIn({
  l,
  s,
  query,
  setQuery,
  sort,
  setSort,
  arrive,
  onExtra,
  onPlace,
}: {
  l: League;
  s: LeagueState;
  query: string;
  setQuery: (q: string) => void;
  sort: 'name' | 'team';
  setSort: (v: 'name' | 'team') => void;
  arrive: (id: string, patch: Arrival) => void;
  onExtra: (g: Golfer) => void;
  onPlace: (g: Golfer) => void;
}) {
  const label = (g: Golfer) => (s.groups[g.id] == null ? null : groupLabel(l, s.format, s.groups[g.id]!));
  const row = (g: Golfer, tag?: string) => (
    <GolferRow
      key={g.id}
      g={g}
      a={s.arrivals[g.id] ?? {}}
      tag={tag}
      onCheckIn={() => arrive(g.id, { in: true })}
      onPay={() => arrive(g.id, { in: true, paid: true, settled: owes(g, s.arrivals[g.id]) })}
      onExtra={() => onExtra(g)}
    />
  );
  const found = l.roster.filter((g) => matches(g, label(g), query));
  const unplaced = found.filter((g) => s.groups[g.id] == null);
  const groupIds = Array.from({ length: l.groupCount }, (_, k) => k);

  if (s.format === 'shotgun') {
    // Everyone arrives at once: one big search, and a list by name or by team.
    const byName = [...found].sort((a, b) => a.name.localeCompare(b.name));
    return (
      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', p: '12px 20px 16px' }}>
        <Stack direction="row" gap={1.5} alignItems="center" sx={{ mb: 1.5 }}>
          <Box sx={{ flex: 1 }}>
            <SearchField big value={query} onChange={setQuery} placeholder={`Search ${l.roster.length} golfers by name or team`} />
          </Box>
          <Seg label="Sort" value={sort} onChange={setSort} options={[{ value: 'name', label: 'A–Z' }, { value: 'team', label: 'By team' }]} />
        </Stack>
        <Box data-league-list sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          {sort === 'name' ? (
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, alignItems: 'start' }}>
              {[0, 1].map((col) => {
                const half = Math.ceil(byName.length / 2);
                const part = col === 0 ? byName.slice(0, half) : byName.slice(half);
                return (
                  part.length > 0 && (
                    <GroupCard key={col} id={`az-${col}`} title={`${part[0].name.split(',')[0]} – ${part[part.length - 1].name.split(',')[0]}`} sub={`${part.length} golfers`}>
                      {part.map((g) => row(g, label(g) ?? 'No team yet'))}
                    </GroupCard>
                  )
                );
              })}
            </Box>
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, alignItems: 'start' }}>
              {groupIds.map((k) => {
                const members = found.filter((g) => s.groups[g.id] === k);
                if (!members.length) return null;
                return (
                  <GroupCard key={k} id={`team-${k}`} title={groupLabel(l, 'shotgun', k)} sub={`${members.filter((g) => s.arrivals[g.id]?.in).length}/${members.length} in`}>
                    {members.map((g) => row(g))}
                  </GroupCard>
                );
              })}
              {unplaced.length > 0 && (
                <GroupCard id="unplaced" title="No team yet" sub={`${unplaced.length}`}>
                  {unplaced.map((g) => row(g))}
                </GroupCard>
              )}
            </Box>
          )}
          {found.length === 0 && <Typography sx={{ p: 3, textAlign: 'center', color: md3.onSurfaceVariant }}>Nobody in {l.name} matches "{query}".</Typography>}
        </Box>
      </Box>
    );
  }

  // Tee times: grouped by time, the next one up marked.
  const upNext = groupIds.find((k) => l.roster.some((g) => s.groups[g.id] === k && !s.arrivals[g.id]?.in));
  return (
    <Box data-league-list sx={{ flex: 1, minHeight: 0, overflowY: 'auto', p: '12px 20px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gridAutoRows: 'max-content', gap: 1.5, alignContent: 'start' }}>
      {groupIds.map((k) => {
        const members = found.filter((g) => s.groups[g.id] === k);
        if (!members.length) return null;
        const all = l.roster.filter((g) => s.groups[g.id] === k);
        return (
          <GroupCard
            key={k}
            id={`time-${k}`}
            title={groupLabel(l, 'tee-times', k)}
            badge={k === upNext ? <Chip label="Up next" tone="warn" icon="schedule" /> : all.every((g) => s.arrivals[g.id]?.paid) ? <Chip label="All paid" tone="ok" /> : null}
            sub={`${all.filter((g) => s.arrivals[g.id]?.in).length}/${all.length} in · ${SEATS - all.length} open`}
          >
            {members.map((g) => row(g))}
          </GroupCard>
        );
      })}
      {unplaced.length > 0 && (
        <GroupCard id="unplaced" title="No tee time yet" sub={`${unplaced.length} to place`}>
          {unplaced.map((g) => (
            <Box key={g.id} sx={{ position: 'relative' }}>
              {row(g)}
              <Box sx={{ px: 1.5, pb: 1, mt: -0.25 }}>
                <ButtonBase onClick={() => onPlace(g)} sx={{ fontSize: 12.5, fontWeight: 800, color: md3.primary, minHeight: 32 }}>
                  Place {firstName(g.name)} on a tee time ›
                </ButtonBase>
              </Box>
            </Box>
          ))}
        </GroupCard>
      )}
      {found.length === 0 && <Typography sx={{ p: 3, gridColumn: '1 / -1', textAlign: 'center', color: md3.onSurfaceVariant }}>Nobody in {l.name} matches "{query}".</Typography>}
    </Box>
  );
}

// ─── Assign ─────────────────────────────────────────────────────────────────

function Assign({ l, s, picked, setPicked, place }: { l: League; s: LeagueState; picked: string | null; setPicked: (id: string | null) => void; place: (id: string, k: number | null) => void }) {
  const [only, setOnly] = useState<'all' | 'open'>('all');
  const groupIds = Array.from({ length: l.groupCount }, (_, k) => k);
  const unplaced = l.roster.filter((g) => s.groups[g.id] == null).length;
  const pickedGolfer = l.roster.find((g) => g.id === picked) ?? null;
  const shown = [...l.roster].filter((g) => only === 'all' || s.groups[g.id] == null).sort((a, b) => a.name.localeCompare(b.name));
  const drop = (k: number) => (e: React.DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    if (id && l.roster.filter((g) => s.groups[g.id] === k).length < SEATS) place(id, k);
  };
  return (
    <Stack direction="row" sx={{ flex: 1, minHeight: 0 }}>
      <Box data-league-roster sx={{ width: 380, flexShrink: 0, borderRight: `1px solid ${md3.outlineVariant}`, bgcolor: '#fff', display: 'flex', flexDirection: 'column' }}>
        <Stack direction="row" alignItems="center" gap={1} sx={{ p: '12px 16px 8px' }}>
          <Typography sx={{ ...LABEL_SX, flex: 1 }}>
            ROSTER · {l.roster.length} · {unplaced} TO PLACE
          </Typography>
          <Seg label="Show" value={only} onChange={setOnly} options={[{ value: 'all', label: 'All' }, { value: 'open', label: 'To place' }]} />
        </Stack>
        <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: 1, pb: 1 }}>
          {shown.map((g) => {
            const k = s.groups[g.id];
            const on = picked === g.id;
            return (
              <ButtonBase
                key={g.id}
                data-roster-golfer={g.id}
                aria-pressed={on}
                draggable
                onDragStart={(e: React.DragEvent) => e.dataTransfer.setData('text/plain', g.id)}
                onClick={() => setPicked(on ? null : g.id)}
                sx={{ width: '100%', minHeight: 46, justifyContent: 'flex-start', gap: 1, px: 1, borderRadius: `${radius.sm}px`, mb: 0.25, bgcolor: on ? md3.primaryContainer : 'transparent', border: `1.5px solid ${on ? md3.primary : 'transparent'}` }}
              >
                <Icon name="drag_indicator" size={16} color={md3.outline} />
                <Avatar name={g.name} color={k == null ? md3.outline : md3.secondary} size={26} />
                <Typography sx={{ fontSize: 14, fontWeight: 700, flex: 1, textAlign: 'left' }}>{g.name}</Typography>
                {k == null ? <Chip label="To place" tone="warn" /> : <Chip label={groupLabel(l, s.format, k)} tone="muted" />}
              </ButtonBase>
            );
          })}
        </Box>
      </Box>
      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ p: '12px 20px 0' }}>
          <WhatChanged>
            {pickedGolfer
              ? `${pickedGolfer.name} picked — tap an open seat to put ${firstName(pickedGolfer.name)} there, or tap the name again to drop it.`
              : `Tap a name, then a seat — or drag it across. Ahead of time as prep, or on the day: "${firstName(l.roster[0].name)}, you're the ${groupLabel(l, s.format, 2).replace(/ [AP]M$/, '')}."`}
          </WhatChanged>
        </Box>
        <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', p: '12px 20px 16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridAutoRows: 'max-content', gap: 1.5, alignContent: 'start' }}>
          {groupIds.map((k) => {
            const members = l.roster.filter((g) => s.groups[g.id] === k);
            return (
              <Box
                key={k}
                data-assign-group={k}
                onDragOver={(e: React.DragEvent) => e.preventDefault()}
                onDrop={drop(k)}
                sx={{ bgcolor: '#fff', border: `1px solid ${md3.outlineVariant}`, borderRadius: `${radius.md}px`, overflow: 'hidden' }}
              >
                <Stack direction="row" alignItems="center" sx={{ px: 1.5, height: 40, bgcolor: md3.surfaceContainer }}>
                  <Typography sx={{ fontSize: 14, fontWeight: 800, flex: 1 }}>{groupLabel(l, s.format, k)}</Typography>
                  <Typography sx={{ fontSize: 11.5, color: md3.onSurfaceVariant, fontWeight: 600 }}>
                    {members.length}/{SEATS}
                  </Typography>
                </Stack>
                {Array.from({ length: SEATS }, (_, seat) => {
                  const g = members[seat];
                  if (g)
                    return (
                      <Stack key={seat} data-assign-seat={`${k}:${seat}`} direction="row" alignItems="center" gap={1} sx={{ minHeight: 46, px: 1.5, borderTop: `1px solid ${md3.surfaceContainer}` }}>
                        <Avatar name={g.name} color={md3.secondary} size={24} />
                        <Typography sx={{ fontSize: 13.5, fontWeight: 700, flex: 1 }}>{g.name}</Typography>
                        <ButtonBase aria-label={`Take ${g.name} off ${groupLabel(l, s.format, k)}`} onClick={() => place(g.id, null)} sx={{ width: TOUCH, height: TOUCH, borderRadius: '50%' }}>
                          <Icon name="close" size={16} color={md3.onSurfaceVariant} />
                        </ButtonBase>
                      </Stack>
                    );
                  return (
                    <ButtonBase
                      key={seat}
                      data-assign-seat={`${k}:${seat}`}
                      aria-label={`Open seat on ${groupLabel(l, s.format, k)}`}
                      onClick={() => {
                        if (!picked) return;
                        place(picked, k);
                        setPicked(null);
                      }}
                      sx={{ width: '100%', minHeight: 46, justifyContent: 'flex-start', gap: 1, px: 1.5, borderTop: `1px solid ${md3.surfaceContainer}`, color: picked ? md3.primary : md3.outline, bgcolor: picked ? '#f0fdf4' : 'transparent', fontSize: 13, fontWeight: 700 }}
                    >
                      <Icon name="person_add" size={17} />
                      {pickedGolfer ? `Put ${firstName(pickedGolfer.name)} here` : 'Open seat'}
                    </ButtonBase>
                  );
                })}
              </Box>
            );
          })}
        </Box>
      </Box>
    </Stack>
  );
}

// ─── The register, for an extra ─────────────────────────────────────────────

function ExtrasRegister({ l, g, a, onAdd, onBack }: { l: League; g: Golfer; a: Arrival; onAdd: (id: string) => void; onBack: () => void }) {
  const t = transportOf(g);
  const lines = [{ name: 'League fee', price: LEAGUE_FEE }, { name: t.name, price: t.price }, ...(a.extras ?? [])];
  return (
    <Box data-league-register sx={{ position: 'absolute', inset: 0, zIndex: 20, bgcolor: md3.surface, display: 'flex', flexDirection: 'column' }}>
      <Stack direction="row" alignItems="center" gap={1.5} sx={{ height: 56, px: 2.5, bgcolor: md3.onSurface, color: '#fff', flexShrink: 0 }}>
        <TouchButton icon="arrow_back" onClick={onBack} label={`Back to ${l.name}`}>
          Back to {l.name}
        </TouchButton>
        <Typography sx={{ fontSize: 14, fontWeight: 700, opacity: 0.9 }}>Register · ringing an extra for {g.name}; you come straight back to the league.</Typography>
      </Stack>
      <Stack direction="row" sx={{ flex: 1, minHeight: 0 }}>
        <Box sx={{ width: 320, borderRight: `1px solid ${md3.outlineVariant}`, bgcolor: '#fff', p: 2, pb: 7, display: 'flex', flexDirection: 'column' }}>
          <Typography sx={LABEL_SX}>ORDER · {g.name.toUpperCase()}</Typography>
          <Box sx={{ mt: 1, flex: 1 }}>
            {lines.map((x, i) => (
              <Stack key={`${x.name}-${i}`} direction="row" justifyContent="space-between" sx={{ py: 0.75, borderBottom: `1px solid ${md3.surfaceContainer}`, fontSize: 13.5 }}>
                <span>{x.name}</span>
                <b>{money(x.price)}</b>
              </Stack>
            ))}
          </Box>
          <Stack direction="row" justifyContent="space-between" sx={{ fontSize: 15, fontWeight: 800, mb: 1.5 }}>
            <span>{a.settled ? 'Still due' : 'Due'}</span>
            <span data-register-due>{money(dueOf(g, a))}</span>
          </Stack>
          <TouchButton tone="filled" onClick={onBack} sx={{ width: '100%' }}>
            Done · back to the league
          </TouchButton>
        </Box>
        <Box sx={{ flex: 1, p: 2.5 }}>
          <Typography sx={LABEL_SX}>QUICK KEYS · RANGE & PRO SHOP</Typography>
          <Box sx={{ mt: 1.5, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1.5 }}>
            {EXTRAS.map((x) => (
              <ButtonBase
                key={x.id}
                aria-label={`Add ${x.name}`}
                onClick={() => onAdd(x.id)}
                sx={{ height: 96, flexDirection: 'column', gap: 0.5, borderRadius: `${radius.md}px`, bgcolor: '#fff', border: `1.5px solid ${md3.outlineVariant}`, fontSize: 14, fontWeight: 800 }}
              >
                <Icon name={x.icon} size={22} color={md3.primary} />
                {x.name}
                <Box component="span" sx={{ fontSize: 12.5, fontWeight: 600, color: md3.onSurfaceVariant }}>
                  {money(x.price)}
                </Box>
              </ButtonBase>
            ))}
          </Box>
        </Box>
      </Stack>
    </Box>
  );
}

// ─── The League view ────────────────────────────────────────────────────────

function LeagueView({ start = 'senior', tab: tab0 = 'checkin', onBack }: { start?: string; tab?: Tab; onBack?: () => void }) {
  const all = leagues();
  const [id, setId] = useState(start);
  const [state, setState] = useState<Record<string, LeagueState>>(() => Object.fromEntries(all.map((l) => [l.id, initialState(l)])));
  const [tab, setTab] = useState<Tab>(tab0);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'name' | 'team'>('name');
  const [picked, setPicked] = useState<string | null>(null);
  const [register, setRegister] = useState<string | null>(null);
  const l = all.find((x) => x.id === id)!;
  const s = state[id];
  const c = count(l, s);
  const patch = (fn: (s: LeagueState) => LeagueState) => setState((st) => ({ ...st, [id]: fn(st[id]) }));
  const arrive = (gid: string, p: Arrival) => patch((x) => ({ ...x, arrivals: { ...x.arrivals, [gid]: { ...x.arrivals[gid], ...p } } }));
  const place = (gid: string, k: number | null) => patch((x) => ({ ...x, groups: { ...x.groups, [gid]: k } }));
  const regGolfer = l.roster.find((g) => g.id === register);

  return (
    <Box data-league-view={id} data-league-mode={s.format} data-league-tab={tab} sx={{ position: 'absolute', inset: 0, zIndex: 1100, bgcolor: md3.surface, display: 'flex', flexDirection: 'column' }}>
      {/* Which league, and how it is going. */}
      <Stack direction="row" alignItems="center" gap={1.5} sx={{ px: 2.5, height: 64, bgcolor: '#fff', borderBottom: `1px solid ${md3.outlineVariant}`, flexShrink: 0 }}>
        <TouchButton icon="arrow_back" onClick={onBack}>
          Tee sheet
        </TouchButton>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ ...LABEL_SX, color: md3.primary }}>LEAGUE VIEW</Typography>
          <Typography data-league-title sx={{ fontSize: 18, fontWeight: 800, lineHeight: 1.2 }}>
            {l.name}
          </Typography>
        </Box>
        <Chip label={`${c.in}/${l.roster.length} checked in`} tone={c.in ? 'ok' : 'muted'} icon="how_to_reg" />
        <Chip label={`${c.paid} paid`} tone={c.paid ? 'ok' : 'muted'} icon="paid" />
        <Chip label={`${l.roster.length - c.placed} to place`} tone={l.roster.length - c.placed ? 'warn' : 'muted'} icon="person_add" />
      </Stack>

      {/* Today's leagues. */}
      <Stack direction="row" alignItems="center" gap={1} sx={{ px: 2.5, py: 1, bgcolor: '#fff', borderBottom: `1px solid ${md3.outlineVariant}`, flexShrink: 0 }}>
        <Typography sx={{ ...LABEL_SX, mr: 0.5 }}>{DAY_LABEL.toUpperCase()} · {all.length} LEAGUES</Typography>
        {all.map((x) => {
          const on = x.id === id;
          const xc = count(x, state[x.id]);
          return (
            <ButtonBase
              key={x.id}
              data-league-switch={x.id}
              aria-pressed={on}
              onClick={() => {
                setId(x.id);
                setQuery('');
                setPicked(null);
              }}
              sx={{ minHeight: 44, px: 1.5, gap: 1, borderRadius: `${radius.md}px`, border: `1.5px solid ${on ? md3.primary : md3.outlineVariant}`, bgcolor: on ? md3.primaryContainer : '#fff', textAlign: 'left' }}
            >
              <Box>
                <Typography sx={{ fontSize: 13.5, fontWeight: 800, lineHeight: 1.2 }}>{x.name}</Typography>
                <Typography sx={{ fontSize: 11.5, color: md3.onSurfaceVariant }}>
                  {startLabel(x)} · {formatLabel(state[x.id].format)} · {xc.in}/{x.roster.length} in
                </Typography>
              </Box>
            </ButtonBase>
          );
        })}
      </Stack>

      {/* What you are doing, and how the league goes out today. */}
      <Stack direction="row" alignItems="center" gap={1.5} sx={{ px: 2.5, py: 1, borderBottom: `1px solid ${md3.outlineVariant}`, flexShrink: 0 }}>
        <Seg
          label="League view"
          value={tab}
          onChange={(t) => {
            setTab(t);
            setPicked(null);
          }}
          options={[
            { value: 'checkin', label: 'Check in', icon: 'how_to_reg' },
            { value: 'assign', label: s.format === 'shotgun' ? 'Assign teams' : 'Assign tee times', icon: 'groups' },
          ]}
        />
        {tab === 'checkin' && s.format === 'tee-times' ? (
          <SearchField value={query} onChange={setQuery} placeholder="Search by name or tee time — “Justin”, “7:20”" />
        ) : (
          <Box sx={{ flex: 1 }} />
        )}
        <Typography sx={{ ...LABEL_SX }}>GOES OUT AS</Typography>
        <Seg label="Format" value={s.format} onChange={(format) => patch((x) => ({ ...x, format }))} options={[{ value: 'shotgun', label: 'Shotgun', icon: 'bolt' }, { value: 'tee-times', label: 'Tee times', icon: 'schedule' }]} />
      </Stack>

      {tab === 'checkin' ? (
        <CheckIn
          l={l}
          s={s}
          query={query}
          setQuery={setQuery}
          sort={sort}
          setSort={setSort}
          arrive={arrive}
          onExtra={(g) => setRegister(g.id)}
          onPlace={(g) => {
            setTab('assign');
            setPicked(g.id);
          }}
        />
      ) : (
        <Assign l={l} s={s} picked={picked} setPicked={setPicked} place={place} />
      )}

      {regGolfer && (
        <ExtrasRegister
          l={l}
          g={regGolfer}
          a={s.arrivals[regGolfer.id] ?? {}}
          onAdd={(xid) => {
            const x = EXTRAS.find((e) => e.id === xid)!;
            const a = s.arrivals[regGolfer.id] ?? {};
            // An extra after paying reopens the bill for just the extra.
            arrive(regGolfer.id, { extras: [...(a.extras ?? []), x], ...(a.paid && { paid: false, settled: a.settled ?? owes(regGolfer, a) }) });
          }}
          onBack={() => setRegister(null)}
        />
      )}
    </Box>
  );
}

// ─── The way in ─────────────────────────────────────────────────────────────

/** The 7:20 of the Senior League — the Member-Guest seed's tee time, named for the league here. */
const leagueTeeTime = () => ({ ...memberGuest()[2], name: 'Senior League', conf: 'LG-SENIOR' });

function WayInMock() {
  const [open, setOpen] = useState(false);
  const b = leagueTeeTime();
  const senior = leagues()[0];
  const here = senior.roster.filter((g) => senior.groups[g.id] === 2);
  return (
    <>
      <SidePanel>
        <MockPanelHeader b={b} contact={`${b.conf} · League tee time · 3 of 4 placed`} />
        <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', p: '14px 16px' }}>
          <Stack data-league-entry direction="row" alignItems="center" gap={1.5} sx={{ p: 1.5, mb: 1.5, borderRadius: `${radius.md}px`, bgcolor: '#f5f3ff', border: '1px solid #ddd6fe' }}>
            <Icon name="groups" size={26} color="#6d28d9" />
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: 14.5, fontWeight: 800, color: '#4c1d95' }}>Part of Senior League · {senior.roster.length} golfers on 5 tee times</Typography>
              <Typography sx={{ fontSize: 12.5, color: '#5b21b6' }}>This tee time still opens on its own, as today. To check in and pay the whole league from one screen, open League view.</Typography>
            </Box>
            <TouchButton tone="filled" icon="groups" onClick={() => setOpen(true)}>
              League view
            </TouchButton>
          </Stack>
          <Typography sx={{ ...LABEL_SX, mb: 1 }}>PLAYERS · 7:20 AM</Typography>
          {here.map((g) => (
            <Stack key={g.id} direction="row" alignItems="center" gap={1} sx={{ minHeight: 52, px: 1.5, mb: 0.75, borderRadius: `${radius.md}px`, bgcolor: md3.surfaceContainer }}>
              <Avatar name={g.name} color={md3.secondary} size={30} />
              <Typography sx={{ fontSize: 14.5, fontWeight: 800, flex: 1 }}>{g.name}</Typography>
              <Typography sx={{ fontSize: 12.5, color: md3.onSurfaceVariant }}>
                League fee {money(LEAGUE_FEE)} · {transportOf(g).name} {money(transportOf(g).price)}
              </Typography>
            </Stack>
          ))}
          <Stack direction="row" alignItems="center" gap={1} sx={{ minHeight: 52, px: 1.5, borderRadius: `${radius.md}px`, border: `1.5px dashed ${md3.outlineVariant}`, color: md3.onSurfaceVariant, fontSize: 13.5, fontWeight: 700 }}>
            <Icon name="person_add" size={18} /> Open seat — place someone from the roster in League view
          </Stack>
        </Box>
        <Stack direction="row" justifyContent="flex-end" gap={1} sx={{ p: '12px 16px', borderTop: `1px solid ${md3.outlineVariant}` }}>
          <TouchButton>Close</TouchButton>
        </Stack>
      </SidePanel>
      {open && <LeagueView onBack={() => setOpen(false)} />}
    </>
  );
}

// ─── Stories ────────────────────────────────────────────────────────────────

const viewOf = (el: HTMLElement) =>
  waitFor(() => {
    const v = el.querySelector<HTMLElement>('[data-league-view]');
    if (!v) throw new Error('no league view yet');
    return v;
  });

/** No two cards in `selector` overlap — a grid row that shrank to fit would draw one over the next. */
async function expectNoOverlap(view: HTMLElement, selector: string) {
  const rects = [...view.querySelectorAll<HTMLElement>(selector)].map((n) => n.getBoundingClientRect());
  for (const a of rects)
    for (const b of rects) {
      if (a === b) continue;
      const sideBySide = a.right <= b.left + 1 || b.right <= a.left + 1;
      const stacked = a.bottom <= b.top + 1 || b.bottom <= a.top + 1;
      await expect(sideBySide || stacked).toBe(true);
    }
}

/** Senior League, tee times: check in and pay without leaving; switch league or format. */
export const Proposal: Story = {
  render: () => (
    <Terminal backdrop={outing()}>
      <LeagueView />
    </Terminal>
  ),
  play: async ({ canvasElement }) => {
    const view = await viewOf(canvasElement);
    const v = within(view);
    // Five tee times, and the four still to place.
    await expect(view.querySelectorAll('[data-league-group^="time-"]').length).toBe(5);
    await expect(view.querySelector('[data-league-group="unplaced"]')).not.toBeNull();
    await expectNoOverlap(view, '[data-league-group]');
    // "Johnny, check in, pay": search by tee time, then pay without leaving.
    await userEvent.type(view.querySelector<HTMLInputElement>('[data-league-search]')!, '7:20');
    await expect(view.querySelectorAll('[data-league-group]').length).toBe(1);
    await userEvent.click(v.getByRole('button', { name: 'Check in Alvarez, Johnny' }));
    await userEvent.click(v.getByRole('button', { name: 'Pay for Alvarez, Johnny' }));
    await expect(v.getByRole('button', { name: 'Alvarez, Johnny has paid' })).toBeTruthy();
    await expect(v.getByText('6/20 checked in')).toBeTruthy();
    // An extra: to the register and straight back, with the bucket on Tom's bill.
    await userEvent.click(v.getByRole('button', { name: 'Extra for Hughes, Tom' }));
    await userEvent.click(within(view.querySelector<HTMLElement>('[data-league-register]')!).getByRole('button', { name: 'Add Large bucket' }));
    await userEvent.click(v.getByRole('button', { name: 'Back to Senior League' }));
    await expect(view.querySelector('[data-league-register]')).toBeNull();
    await expect(v.getByRole('button', { name: 'Pay for Hughes, Tom' }).textContent).toBe(`Pay ${money(LEAGUE_FEE + 26.82 + 12)}`);
    // An extra after paying reopens Johnny's bill for just the extra.
    await userEvent.click(v.getByRole('button', { name: 'Extra for Alvarez, Johnny' }));
    await userEvent.click(within(view.querySelector<HTMLElement>('[data-league-register]')!).getByRole('button', { name: 'Add Small bucket' }));
    await userEvent.click(v.getByRole('button', { name: 'Back to Senior League' }));
    await expect(v.getByRole('button', { name: 'Pay for Alvarez, Johnny' }).textContent).toBe(`Pay ${money(6)}`);
    await userEvent.click(v.getByRole('button', { name: 'Clear search' }));
    // Shotgun instead: one big search, everyone by name.
    await userEvent.click(within(v.getByRole('group', { name: 'Format' })).getByRole('button', { name: /Shotgun/ }));
    await expect(view.getAttribute('data-league-mode')).toBe('shotgun');
    await expect(v.getAllByText('Team 3 · Hole 3').length).toBeGreaterThan(0);
    // Another league today, with its own roster.
    await userEvent.click(view.querySelector<HTMLElement>('[data-league-switch="skins"]')!);
    await expect(view.querySelector('[data-league-title]')!.textContent).toBe('Skins League');
    await expect(view.querySelectorAll('[data-league-golfer]').length).toBe(12);
    // …and back: the Senior League kept its state.
    await userEvent.click(view.querySelector<HTMLElement>('[data-league-switch="senior"]')!);
    await expect(view.getAttribute('data-league-mode')).toBe('shotgun');
    await expect(v.getByText('6/20 checked in')).toBeTruthy();
    // Leave it as it goes out today: tee times.
    await userEvent.click(within(v.getByRole('group', { name: 'Format' })).getByRole('button', { name: /Tee times/ }));
    await expect(view.getAttribute('data-league-mode')).toBe('tee-times');
  },
};

/** Placing the roster: "Justin, you're the 7:20." */
export const AssignTeeTimes: Story = {
  name: 'Proposal · assign tee times',
  render: () => (
    <Terminal backdrop={outing()}>
      <LeagueView tab="assign" />
    </Terminal>
  ),
  play: async ({ canvasElement }) => {
    const view = await viewOf(canvasElement);
    const v = within(view);
    await expect(view.querySelectorAll('[data-roster-golfer]').length).toBe(20);
    await expect(v.getByText('4 to place')).toBeTruthy();
    await expectNoOverlap(view, '[data-assign-group]');
    // Tap Justin, then the open seat on the 7:20.
    await userEvent.click(view.querySelector<HTMLElement>('[data-roster-golfer="g0"]')!);
    const seven20 = view.querySelector<HTMLElement>('[data-assign-group="2"]')!;
    await userEvent.click(within(seven20).getByRole('button', { name: 'Open seat on 7:20 AM' }));
    await expect(within(seven20).getByText('Girard, Justin')).toBeTruthy();
    await expect(within(seven20).queryByRole('button', { name: /Open seat/ })).toBeNull();
    await expect(v.getByText('3 to place')).toBeTruthy();
    await expect(within(view.querySelector<HTMLElement>('[data-roster-golfer="g0"]')!).getByText('7:20 AM')).toBeTruthy();
  },
};

/** Men's League, shotgun: everyone at once — one big search, sorted by name or team. */
export const Shotgun: Story = {
  name: 'Proposal · shotgun',
  render: () => (
    <Terminal backdrop={outing()}>
      <LeagueView start="mens" />
    </Terminal>
  ),
  play: async ({ canvasElement }) => {
    const view = await viewOf(canvasElement);
    const v = within(view);
    await expect(view.getAttribute('data-league-mode')).toBe('shotgun');
    await expect(view.querySelectorAll('[data-league-golfer]').length).toBe(20);
    // "Justin's here, pay."
    await userEvent.type(view.querySelector<HTMLInputElement>('[data-league-search]')!, 'justin');
    await expect(view.querySelectorAll('[data-league-golfer]').length).toBe(1);
    await userEvent.click(v.getByRole('button', { name: 'Pay for Girard, Justin' }));
    await expect(v.getByText('1 paid')).toBeTruthy();
    await userEvent.click(v.getByRole('button', { name: 'Clear search' }));
    // By team: five teams on five holes.
    await userEvent.click(within(v.getByRole('group', { name: 'Sort' })).getByRole('button', { name: 'By team' }));
    await expect(view.querySelectorAll('[data-league-group^="team-"]').length).toBe(5);
  },
};

/** The way in: a league's tee time opens as today, with League view one tap away. */
export const WayIn: Story = {
  name: 'Proposal · way in',
  render: () => (
    <Terminal backdrop={outing()}>
      <WayInMock />
    </Terminal>
  ),
  play: async ({ canvasElement }) => {
    const panel = await waitFor(() => {
      const p = canvasElement.querySelector<HTMLElement>('[data-mock-panel]');
      if (!p) throw new Error('no panel yet');
      return p;
    });
    await expect(canvasElement.querySelector('[data-league-view]')).toBeNull();
    await userEvent.click(within(panel).getByRole('button', { name: /League view/ }));
    const view = await viewOf(canvasElement);
    await expect(view.querySelector('[data-league-title]')!.textContent).toBe('Senior League');
    await userEvent.click(within(view).getByRole('button', { name: /Tee sheet/ }));
    await expect(canvasElement.querySelector('[data-league-view]')).toBeNull();
  },
};
