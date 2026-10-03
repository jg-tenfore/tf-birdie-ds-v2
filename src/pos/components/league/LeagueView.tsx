import { useState } from 'react';
import { Box, ButtonBase, Typography } from '@mui/material';
import { md3, radius } from '../../../theme/tokens';
import {
  LEAGUE_SEATS,
  firstName,
  formatLabel,
  groupLabel,
  leagueById,
  leaguesOn,
  type League,
  type LeagueFormat,
  type LeagueGolfer,
} from '../../data/leagues';
import { money } from '../../logic/cart';
import { playerName } from '../../logic/reservation';
import {
  golferFeeLine,
  golferStatus,
  groupBooking,
  leagueCounts,
  leagueFormatOf,
  matchesGolfer,
  openSeats,
  seatOf,
  type GolferStatus,
  type LeagueTab,
} from '../../state/league';
import type { PosState } from '../../state/pos-store';
import { usePos } from '../../state/PosProvider';
import { Icon } from '../primitives';
import { Stack } from '../Stack';
import { Seg, TOUCH, TouchButton } from '../Touch';
import { Avatar, Chip, GroupCard, Hint, SearchField } from './LeagueParts';

const LABEL_SX = { fontSize: 11, fontWeight: 800, letterSpacing: '.05em', color: md3.outline } as const;

/**
 * The League view (V1 → V2, 100226) — a league's tee times in one place.
 *
 * Weston, on the 100126 group view: *"the idea is just to have a place where you can manage the whole
 * group… speed and checking in of golfers who are arriving at the same time."* Two of his examples
 * shaped it: *"Justin, you're the 7:20"* — placing the roster on tee times — and *"Justin's here, pay.
 * Johnny, check in, pay"* without leaving the screen.
 *
 * - **Check in** — search by name or tee time (a shotgun: one big search, A–Z or by team); **Check
 *   in**, **Pay** and **Extra** on every golfer. Pay is the register's own checkout, over this screen.
 * - **Assign** — the roster on the left, the tee times (or teams) on the right: tap a name then a
 *   seat, or drag it across; ✕ takes someone off.
 * - **Goes out as** — Shotgun or Tee times. A label here; the tee sheet does not move.
 * - **Today's leagues** — a switcher across the top, each league its own state (it is the sheet's).
 *
 * Everything reads and writes the real bookings (`state/league.ts`), so the tee sheet agrees.
 */
export function LeagueView() {
  const { state } = usePos();
  const l = leagueById(state.leagueGroupId);
  if (!l) return null;
  return <LeagueScreen l={l} />;
}

const dayLabel = (date: string): string => {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

/** Group `k`'s name today — its booking's own time when it has one, so a moved tee time reads true. */
const labelOf = (s: PosState, l: League, format: LeagueFormat, k: number): string =>
  groupLabel(l, format, k, groupBooking(s.bookings, l, k)?.timeMin);

function LeagueScreen({ l }: { l: League }) {
  const { state, dispatch } = usePos();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'name' | 'team'>('name');
  const [picked, setPicked] = useState<string | null>(null);
  const today = leaguesOn(l.date, state.venueId);
  const format = leagueFormatOf(state, l);
  const tab = state.leagueTab;
  const c = leagueCounts(state, l);
  const toPlace = l.roster.length - c.placed;

  return (
    <Box
      data-league-view={l.groupId}
      data-league-mode={format}
      data-league-tab={tab}
      sx={{ position: 'absolute', inset: 0, zIndex: 100, bgcolor: md3.surface, display: 'flex', flexDirection: 'column' }}
    >
      {/* Which league, and how it is going. */}
      <Stack direction="row" alignItems="center" gap={1.5} sx={{ px: 2.5, height: 64, bgcolor: '#fff', borderBottom: `1px solid ${md3.outlineVariant}`, flexShrink: 0 }}>
        <TouchButton icon="arrow_back" onClick={() => dispatch({ type: 'closeLeague' })}>
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
        <Chip label={`${toPlace} to place`} tone={toPlace ? 'warn' : 'muted'} icon="person_add" />
      </Stack>

      {/* Today's leagues. */}
      <Stack direction="row" alignItems="center" gap={1} sx={{ px: 2.5, py: 1, bgcolor: '#fff', borderBottom: `1px solid ${md3.outlineVariant}`, flexShrink: 0 }}>
        <Typography sx={{ ...LABEL_SX, mr: 0.5 }}>
          {dayLabel(l.date).toUpperCase()} · {today.length} {today.length === 1 ? 'LEAGUE' : 'LEAGUES'}
        </Typography>
        {today.map((x) => {
          const on = x.groupId === l.groupId;
          const xc = leagueCounts(state, x);
          return (
            <ButtonBase
              key={x.groupId}
              data-league-switch={x.groupId}
              aria-pressed={on}
              onClick={() => {
                dispatch({ type: 'openLeague', groupId: x.groupId });
                setQuery('');
                setPicked(null);
              }}
              sx={{ minHeight: 44, px: 1.5, gap: 1, borderRadius: `${radius.md}px`, border: `1.5px solid ${on ? md3.primary : md3.outlineVariant}`, bgcolor: on ? md3.primaryContainer : '#fff', textAlign: 'left' }}
            >
              <Box>
                <Typography sx={{ fontSize: 13.5, fontWeight: 800, lineHeight: 1.2 }}>{x.name}</Typography>
                <Typography sx={{ fontSize: 11.5, color: md3.onSurfaceVariant }}>
                  {labelOf(state, x, 'tee-times', 0)} · {formatLabel(leagueFormatOf(state, x))} · {xc.in}/{x.roster.length} in
                </Typography>
              </Box>
            </ButtonBase>
          );
        })}
      </Stack>

      {/* What you are doing, and how the league goes out today. */}
      <Stack direction="row" alignItems="center" gap={1.5} sx={{ px: 2.5, py: 1, borderBottom: `1px solid ${md3.outlineVariant}`, flexShrink: 0 }}>
        <Seg<LeagueTab>
          label="League view"
          value={tab}
          onChange={(t) => {
            dispatch({ type: 'setLeagueTab', tab: t });
            setPicked(null);
          }}
          options={[
            { value: 'checkin', label: 'Check in', icon: 'how_to_reg' },
            { value: 'assign', label: format === 'shotgun' ? 'Assign teams' : 'Assign tee times', icon: 'groups' },
          ]}
        />
        {tab === 'checkin' && format === 'tee-times' ? (
          <SearchField value={query} onChange={setQuery} placeholder="Search by name or tee time — “Justin”, “7:20”" />
        ) : (
          <Box sx={{ flex: 1 }} />
        )}
        <Typography sx={LABEL_SX}>GOES OUT AS</Typography>
        <Seg<LeagueFormat>
          label="Format"
          value={format}
          onChange={(f) => dispatch({ type: 'setLeagueFormat', groupId: l.groupId, format: f })}
          options={[
            { value: 'shotgun', label: 'Shotgun', icon: 'bolt' },
            { value: 'tee-times', label: 'Tee times', icon: 'schedule' },
          ]}
        />
      </Stack>

      {tab === 'checkin' ? (
        <CheckIn
          l={l}
          format={format}
          query={query}
          setQuery={setQuery}
          sort={sort}
          setSort={setSort}
          onPlace={(g) => {
            dispatch({ type: 'setLeagueTab', tab: 'assign' });
            setPicked(g.id);
          }}
        />
      ) : (
        <Assign l={l} format={format} picked={picked} setPicked={setPicked} />
      )}
    </Box>
  );
}

// ─── Check in ───────────────────────────────────────────────────────────────

/** One golfer: who, what they are sold on, Check in, Pay, Extra. */
function GolferRow({ l, g, tag }: { l: League; g: LeagueGolfer; tag?: string }) {
  const { state, dispatch } = usePos();
  const st: GolferStatus = golferStatus(state, l, g.id);
  const placed = Boolean(st.ref);
  const act = (type: 'leagueCheckIn' | 'leaguePay' | 'leagueExtra') => dispatch({ type, groupId: l.groupId, golferId: g.id });
  return (
    <Stack
      data-league-golfer={g.id}
      data-golfer-paid={st.paid || undefined}
      direction="row"
      alignItems="center"
      gap={1}
      sx={{ minHeight: 52, px: 1.5, py: 0.5, borderTop: `1px solid ${md3.surfaceContainer}`, bgcolor: st.paid ? '#f6fdf9' : '#fff' }}
    >
      <Avatar name={g.name} color={st.paid ? md3.primary : md3.outline} size={30} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" alignItems="center" gap={0.75} sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 14.5, fontWeight: 800, whiteSpace: 'nowrap' }}>{g.name}</Typography>
          {tag && <Chip label={tag} tone="muted" />}
          {st.extras.length > 0 && <Chip label={`+ ${st.extras.join(', ')}`} tone="new" icon="storefront" />}
        </Stack>
        <Box data-golfer-fees sx={{ fontSize: 11.5, color: md3.onSurfaceVariant, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {st.ref ? golferFeeLine(state, st.ref) : 'Not on a tee time yet'}
        </Box>
      </Box>
      <TouchButton
        tone={st.in ? 'done' : 'outline'}
        label={st.in ? `${g.name} is checked in` : `Check in ${g.name}`}
        disabled={!placed}
        onClick={st.in ? undefined : () => act('leagueCheckIn')}
        sx={{ minWidth: 104 }}
      >
        {st.in ? (
          <>
            In <Icon name="check" size={16} />
          </>
        ) : (
          'Check in'
        )}
      </TouchButton>
      <TouchButton
        tone={st.paid ? 'done' : 'filled'}
        label={st.paid ? `${g.name} has paid` : `Pay for ${g.name}`}
        disabled={!placed}
        onClick={st.paid ? undefined : () => act('leaguePay')}
        sx={{ minWidth: 118 }}
      >
        {st.paid ? (
          <>
            Paid <Icon name="check" size={16} />
          </>
        ) : placed ? (
          `Pay ${money(st.due)}`
        ) : (
          'Pay'
        )}
      </TouchButton>
      <TouchButton tone="ghost" icon="add_shopping_cart" label={`Extra for ${g.name}`} disabled={!placed} onClick={() => act('leagueExtra')} />
    </Stack>
  );
}

function CheckIn({
  l,
  format,
  query,
  setQuery,
  sort,
  setSort,
  onPlace,
}: {
  l: League;
  format: LeagueFormat;
  query: string;
  setQuery: (q: string) => void;
  sort: 'name' | 'team';
  setSort: (v: 'name' | 'team') => void;
  onPlace: (g: LeagueGolfer) => void;
}) {
  const { state } = usePos();
  const groupOf = (g: LeagueGolfer) => seatOf(state.bookings, l, g.id)?.group ?? null;
  const label = (g: LeagueGolfer) => {
    const k = groupOf(g);
    return k == null ? null : labelOf(state, l, format, k);
  };
  const row = (g: LeagueGolfer, tag?: string) => <GolferRow key={g.id} l={l} g={g} tag={tag} />;
  const found = l.roster.filter((g) => matchesGolfer(g.name, label(g), query));
  const unplaced = found.filter((g) => groupOf(g) == null);
  const groupIds = l.teeTimes.map((_, k) => k);
  const none = found.length === 0 && (
    <Typography sx={{ p: 3, gridColumn: '1 / -1', textAlign: 'center', color: md3.onSurfaceVariant }}>
      Nobody in {l.name} matches “{query}”.
    </Typography>
  );

  if (format === 'shotgun') {
    // Everyone arrives at once: one big search, and a list by name or by team.
    const byName = [...found].sort((a, b) => a.name.localeCompare(b.name));
    const half = Math.ceil(byName.length / 2);
    return (
      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', p: '12px 20px 16px' }}>
        <Stack direction="row" gap={1.5} alignItems="center" sx={{ mb: 1.5 }}>
          <Box sx={{ flex: 1 }}>
            <SearchField big value={query} onChange={setQuery} placeholder={`Search ${l.roster.length} golfers by name or team`} />
          </Box>
          <Seg
            label="Sort"
            value={sort}
            onChange={setSort}
            options={[
              { value: 'name', label: 'A–Z' },
              { value: 'team', label: 'By team' },
            ]}
          />
        </Stack>
        <Box data-league-list sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, alignItems: 'start' }}>
            {sort === 'name'
              ? [byName.slice(0, half), byName.slice(half)].map(
                  (part, col) =>
                    part.length > 0 && (
                      <GroupCard key={col} id={`az-${col}`} title={`${part[0].name.split(',')[0]} – ${part[part.length - 1].name.split(',')[0]}`} sub={`${part.length} golfers`}>
                        {part.map((g) => row(g, label(g) ?? 'No team yet'))}
                      </GroupCard>
                    ),
                )
              : groupIds.map((k) => {
                  const members = found.filter((g) => groupOf(g) === k);
                  if (!members.length) return null;
                  const inN = members.filter((g) => golferStatus(state, l, g.id).in).length;
                  return (
                    <GroupCard key={k} id={`team-${k}`} title={labelOf(state, l, 'shotgun', k)} sub={`${inN}/${members.length} in`}>
                      {members.map((g) => row(g))}
                    </GroupCard>
                  );
                })}
            {sort === 'team' && unplaced.length > 0 && (
              <GroupCard id="unplaced" title="No team yet" sub={`${unplaced.length}`}>
                {unplaced.map((g) => row(g))}
              </GroupCard>
            )}
            {none}
          </Box>
        </Box>
      </Box>
    );
  }

  // Tee times: grouped by time, the next one up marked.
  const membersOf = (k: number) => l.roster.filter((g) => groupOf(g) === k);
  const upNext = groupIds.find((k) => membersOf(k).some((g) => !golferStatus(state, l, g.id).in));
  return (
    <Box
      data-league-list
      sx={{ flex: 1, minHeight: 0, overflowY: 'auto', p: '12px 20px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gridAutoRows: 'max-content', gap: 1.5, alignContent: 'start' }}
    >
      {groupIds.map((k) => {
        const members = found.filter((g) => groupOf(g) === k);
        if (!members.length) return null;
        const all = membersOf(k);
        const statuses = all.map((g) => golferStatus(state, l, g.id));
        return (
          <GroupCard
            key={k}
            id={`time-${k}`}
            title={labelOf(state, l, 'tee-times', k)}
            badge={k === upNext ? <Chip label="Up next" tone="warn" icon="schedule" /> : statuses.every((x) => x.paid) ? <Chip label="All paid" tone="ok" /> : null}
            sub={`${statuses.filter((x) => x.in).length}/${all.length} in · ${openSeats(state.bookings, l, k)} open`}
          >
            {members.map((g) => row(g))}
          </GroupCard>
        );
      })}
      {unplaced.length > 0 && (
        <GroupCard id="unplaced" title="No tee time yet" sub={`${unplaced.length} to place`}>
          {unplaced.map((g) => (
            <Box key={g.id}>
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
      {none}
    </Box>
  );
}

// ─── Assign ─────────────────────────────────────────────────────────────────

function Assign({ l, format, picked, setPicked }: { l: League; format: LeagueFormat; picked: string | null; setPicked: (id: string | null) => void }) {
  const { state, dispatch, toast } = usePos();
  const [only, setOnly] = useState<'all' | 'open'>('all');
  const groupIds = l.teeTimes.map((_, k) => k);
  const groupOf = (id: string) => seatOf(state.bookings, l, id)?.group ?? null;
  const unplaced = l.roster.filter((g) => groupOf(g.id) == null).length;
  const pickedGolfer = l.roster.find((g) => g.id === picked) ?? null;
  const shown = l.roster.filter((g) => only === 'all' || groupOf(g.id) == null).sort((a, b) => a.name.localeCompare(b.name));
  const place = (id: string, k: number | null) => {
    if (k != null && openSeats(state.bookings, l, k) === 0) return toast(`${labelOf(state, l, format, k)} is full`);
    dispatch({ type: 'leaguePlace', groupId: l.groupId, golferId: id, group: k });
  };
  const drop = (k: number) => (e: React.DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    if (id) place(id, k);
  };
  const example = l.roster[0];

  return (
    <Stack direction="row" sx={{ flex: 1, minHeight: 0 }}>
      <Box data-league-roster sx={{ width: 380, flexShrink: 0, borderRight: `1px solid ${md3.outlineVariant}`, bgcolor: '#fff', display: 'flex', flexDirection: 'column' }}>
        <Stack direction="row" alignItems="center" gap={1} sx={{ p: '12px 16px 8px' }}>
          <Typography sx={{ ...LABEL_SX, flex: 1 }}>
            ROSTER · {l.roster.length} · {unplaced} TO PLACE
          </Typography>
          <Seg
            label="Show"
            value={only}
            onChange={setOnly}
            options={[
              { value: 'all', label: 'All' },
              { value: 'open', label: 'To place' },
            ]}
          />
        </Stack>
        <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: 1, pb: 1 }}>
          {shown.map((g) => {
            const k = groupOf(g.id);
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
                {k == null ? <Chip label="To place" tone="warn" /> : <Chip label={labelOf(state, l, format, k)} tone="muted" />}
              </ButtonBase>
            );
          })}
        </Box>
      </Box>
      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ p: '12px 20px 0' }}>
          <Hint>
            {pickedGolfer
              ? `${pickedGolfer.name} picked — tap an open seat to put ${firstName(pickedGolfer.name)} there, or tap the name again to drop it.`
              : `Tap a name, then a seat — or drag it across. Ahead of time as prep, or on the day: “${firstName(example.name)}, you're the ${labelOf(state, l, format, Math.min(2, groupIds.length - 1)).replace(/ [AP]M$/, '')}.”`}
          </Hint>
        </Box>
        <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', p: '12px 20px 16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridAutoRows: 'max-content', gap: 1.5, alignContent: 'start' }}>
          {groupIds.map((k) => {
            const b = groupBooking(state.bookings, l, k);
            const name = labelOf(state, l, format, k);
            const taken = b?.players ?? 0;
            return (
              <Box
                key={k}
                data-assign-group={k}
                onDragOver={(e: React.DragEvent) => e.preventDefault()}
                onDrop={drop(k)}
                sx={{ bgcolor: '#fff', border: `1px solid ${md3.outlineVariant}`, borderRadius: `${radius.md}px`, overflow: 'hidden' }}
              >
                <Stack direction="row" alignItems="center" sx={{ px: 1.5, height: 40, bgcolor: md3.surfaceContainer }}>
                  <Typography sx={{ fontSize: 14, fontWeight: 800, flex: 1 }}>{name}</Typography>
                  <Typography sx={{ fontSize: 11.5, color: md3.onSurfaceVariant, fontWeight: 600 }}>
                    {taken}/{LEAGUE_SEATS}
                  </Typography>
                </Stack>
                {Array.from({ length: LEAGUE_SEATS }, (_, seat) => {
                  if (b && seat < b.players) {
                    const golferId = b.guests?.[seat]?.leagueGolferId;
                    const who = playerName(b, seat);
                    return (
                      <Stack key={seat} data-assign-seat={`${k}:${seat}`} direction="row" alignItems="center" gap={1} sx={{ minHeight: 46, px: 1.5, borderTop: `1px solid ${md3.surfaceContainer}` }}>
                        <Avatar name={who} color={md3.secondary} size={24} />
                        <Typography sx={{ fontSize: 13.5, fontWeight: 700, flex: 1 }}>{who}</Typography>
                        {golferId && (
                          <ButtonBase aria-label={`Take ${who} off ${name}`} onClick={() => place(golferId, null)} sx={{ width: TOUCH, height: TOUCH, borderRadius: '50%' }}>
                            <Icon name="close" size={16} color={md3.onSurfaceVariant} />
                          </ButtonBase>
                        )}
                      </Stack>
                    );
                  }
                  return (
                    <ButtonBase
                      key={seat}
                      data-assign-seat={`${k}:${seat}`}
                      aria-label={`Open seat on ${name}`}
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
