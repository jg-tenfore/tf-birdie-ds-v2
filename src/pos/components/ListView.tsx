import { useMemo, useState } from 'react';
import { Box, ButtonBase, Drawer, InputBase, Typography } from '@mui/material';
import { md3, memberTypes, payBadges, radius, shifts } from '../../theme/tokens';
import { TRANSPORT_META } from '../data/config';
import { formatTimeLabel } from '../data/courses';
import { findMemberByPhone } from '../data/golfers';
import { activeFilterCount, filterBookings, groupBookings, payCounts } from '../logic/bookings';
import { dayBookings } from '../state/pos-store';
import type { ListFilters } from '../state/pos-store';
import { usePos } from '../state/PosProvider';
import type { Booking } from '../types';
import { EmptyState, Icon, MemberDot, PayBadge, SectionLabel } from './primitives';
import { Stack } from './Stack';

/**
 * List view — the tee sheet as filterable cards rather than a grid.
 *
 * The grid answers "what does the day look like"; this answers "find me the ones
 * that need something". So it leads with payment-status chips carrying live counts,
 * and cards surface the balance rather than the slot position.
 *
 * Cards are grouped by whatever the sort is (time band, status, or course) so the
 * headers stay meaningful as the operator changes what they're hunting for.
 */
export function ListView() {
  const { state, dispatch } = usePos();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const all = dayBookings(state);
  const shift = shifts[state.shift] ?? shifts.full;

  // The global Day/shift selector also scopes the list, so the two views agree
  // about what "today" currently means.
  const inShift = useMemo(() => {
    const start = shift.startH * 60 + shift.startM;
    const end = shift.endH * 60 + shift.endM;
    return all.filter((b) => b.timeMin >= start && b.timeMin < end);
  }, [all, shift]);

  const counts = payCounts(inShift);
  const filtered = filterBookings(inShift, state.listFilters);
  const groups = groupBookings(filtered, state.listFilters.sort, state.courses);
  const activeCount = activeFilterCount(state.listFilters);

  const statusChips: Array<[string, string]> = [
    ['all', 'All'],
    ['open', 'Unpaid'],
    ['paid', 'Paid'],
    ['no_show', 'No show'],
    ['rain_chk', 'Rain check'],
    ['refund', 'Refunded'],
  ];

  return (
    <Stack sx={{ flex: 1, minHeight: 0, bgcolor: md3.surface, overflow: 'hidden' }}>
      {/* ── Filter bar ── */}
      <Stack
        direction="row"
        alignItems="center"
        gap={0.75}
        sx={{
          px: 2.25,
          py: 1,
          bgcolor: '#fff',
          borderBottom: `1px solid ${md3.outlineVariant}`,
          flexShrink: 0,
          overflowX: 'auto',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        <ButtonBase
          onClick={() => setDrawerOpen(true)}
          sx={{
            gap: 0.75,
            px: 1.75,
            py: 0.875,
            borderRadius: `${radius.xl}px`,
            border: `1.5px solid ${activeCount ? md3.primary : md3.outlineVariant}`,
            color: activeCount ? md3.primary : md3.onSurfaceVariant,
            bgcolor: '#fff',
            fontSize: 12,
            fontWeight: 700,
            flexShrink: 0,
            '&:hover': { bgcolor: md3.surfaceContainer },
          }}
        >
          <Icon name="tune" size={14} />
          All filters
          {activeCount > 0 && (
            <Box
              component="span"
              sx={{
                bgcolor: md3.primary,
                color: '#fff',
                borderRadius: '999px',
                px: 0.75,
                fontSize: 10,
                fontWeight: 800,
              }}
            >
              {activeCount}
            </Box>
          )}
        </ButtonBase>

        {statusChips.map(([key, label]) => {
          const active = state.listFilters.status === key;
          const n = counts[key] ?? 0;
          const dot = key === 'all' ? null : payBadges[key as keyof typeof payBadges]?.text;
          return (
            <ButtonBase
              key={key}
              onClick={() => dispatch({ type: 'patchListFilters', patch: { status: key } })}
              sx={{
                gap: 0.625,
                px: 1.5,
                py: 0.75,
                borderRadius: `${radius.xl}px`,
                border: `1.5px solid ${active ? md3.onSurface : md3.outlineVariant}`,
                bgcolor: active ? md3.onSurface : '#fff',
                color: active ? '#fff' : md3.onSurfaceVariant,
                fontSize: 12,
                fontWeight: 700,
                flexShrink: 0,
                '&:hover': { bgcolor: active ? md3.onSurface : md3.surfaceContainer },
              }}
            >
              {dot && (
                <Box
                  sx={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    bgcolor: active ? '#fff' : dot,
                    flexShrink: 0,
                  }}
                />
              )}
              {label}
              <Box component="span" sx={{ fontSize: 11, fontWeight: 800, opacity: 0.8 }}>
                {n}
              </Box>
            </ButtonBase>
          );
        })}

        <Box sx={{ flex: 1, minWidth: 8 }} />

        <SortChip />
        <ButtonBase
          onClick={() => setSearchOpen(!searchOpen)}
          title="Search"
          sx={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            color: searchOpen ? md3.primary : md3.onSurfaceVariant,
            bgcolor: searchOpen ? md3.primaryContainer : 'transparent',
            flexShrink: 0,
            '&:hover': { bgcolor: md3.surfaceContainer },
          }}
        >
          <Icon name="search" size={17} />
        </ButtonBase>
      </Stack>

      {searchOpen && (
        <Box sx={{ px: 2.25, py: 1, bgcolor: '#fff', borderBottom: `1px solid ${md3.outlineVariant}`, flexShrink: 0 }}>
          <InputBase
            autoFocus
            value={state.listFilters.search}
            onChange={(e) => dispatch({ type: 'patchListFilters', patch: { search: e.target.value } })}
            placeholder="Search name, confirmation, or phone…"
            sx={{
              width: '100%',
              px: 1.5,
              py: 0.75,
              borderRadius: `${radius.xl}px`,
              border: `1.5px solid ${md3.outlineVariant}`,
              bgcolor: md3.surfaceContainer,
              fontSize: 13,
            }}
          />
        </Box>
      )}

      {/* ── Cards ── */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: '14px 18px', minHeight: 0 }}>
        {filtered.length === 0 ? (
          <EmptyState icon="search_off" label="No tee times match these filters" />
        ) : (
          groups.map((g) => (
            <Box key={g.key} sx={{ mb: 2 }}>
              <Stack direction="row" alignItems="center" gap={1} sx={{ pt: 0.75, pb: 1 }}>
                <SectionLabel>{g.label}</SectionLabel>
                <Typography sx={{ fontSize: 11, fontWeight: 600, color: md3.outline }}>
                  {g.bookings.length}
                </Typography>
              </Stack>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 1.25 }}>
                {g.bookings.map((b) => (
                  <ListCard key={b.id} booking={b} />
                ))}
              </Box>
            </Box>
          ))
        )}
      </Box>

      <FilterDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </Stack>
  );
}

// ─── Card ───────────────────────────────────────────────────────────────────

/**
 * One booking as a card: outstanding balance on the left, then name, party detail,
 * and meta. The balance leads because that's what the list is for.
 */
function ListCard({ booking }: { booking: Booking }) {
  const { state, dispatch } = usePos();
  const course = state.courses.find((c) => c.id === booking.course);
  const member = findMemberByPhone(booking.phone);
  const isNoShow = booking.pay === 'no_show';

  const unpaid = (booking.playerStates ?? []).filter((p) => !p.paid && !p.noShow).length;
  const balance = unpaid * booking.price;
  const checkedIn = (booking.playerStates ?? []).filter((p) => p.step >= 0 && !p.noShow).length;

  return (
    <Stack
      direction="row"
      gap={1.5}
      onClick={() => dispatch({ type: 'loadBooking', bookingId: booking.id })}
      onContextMenu={(e) => {
        e.preventDefault();
        dispatch({
          type: 'openContextMenu',
          menu: { kind: 'booking', bookingId: booking.id, x: e.clientX, y: e.clientY },
        });
      }}
      sx={{
        alignItems: 'flex-start',
        bgcolor: '#fff',
        border: `1.5px solid ${md3.outlineVariant}`,
        borderRadius: `${radius.lg}px`,
        p: '12px 14px',
        cursor: 'pointer',
        transition: 'all .13s',
        opacity: isNoShow ? 0.55 : 1,
        '&:hover': {
          borderColor: md3.primary,
          transform: 'translateY(-1px)',
          boxShadow: '0 1px 2px rgba(0,0,0,.1),0 2px 6px 2px rgba(0,0,0,.08)',
        },
      }}
    >
      <Stack alignItems="center" gap={0.5} sx={{ flexShrink: 0, minWidth: 52 }}>
        <Typography sx={{ fontSize: 15, fontWeight: 800 }}>
          {balance > 0 ? `$${balance}` : '—'}
        </Typography>
        <PayBadge pay={booking.pay} size="sm" />
      </Stack>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" alignItems="baseline" justifyContent="space-between" sx={{ mb: 0.375 }}>
          <Stack direction="row" alignItems="center" gap={0.5} sx={{ minWidth: 0 }}>
            {member && <MemberDot memberType={member.memberType} size={7} />}
            <Typography
              sx={{
                fontSize: 13,
                fontWeight: 800,
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {booking.name}
            </Typography>
          </Stack>
          {booking.holes && (
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: md3.onSurfaceVariant, flexShrink: 0, ml: 0.75 }}>
              {booking.holes}
            </Typography>
          )}
        </Stack>

        <Stack
          direction="row"
          alignItems="center"
          gap={0.5}
          sx={{ fontSize: 11, color: md3.onSurfaceVariant, mb: 0.375, flexWrap: 'wrap' }}
        >
          <Icon name="group" size={12} />
          {booking.players}P
          <Icon name={TRANSPORT_META[booking.cart]?.icon ?? 'directions_walk'} size={12} />
          {TRANSPORT_META[booking.cart]?.label}
          {checkedIn > 0 && (
            <>
              <Icon name="how_to_reg" size={12} color={md3.primary} />
              <Box component="span" sx={{ color: md3.primary, fontWeight: 700 }}>
                {checkedIn}/{booking.players} in
              </Box>
            </>
          )}
          {booking.note && <Icon name="sticky_note_2" size={12} color="#f59e0b" />}
        </Stack>

        <Typography sx={{ fontSize: 10, color: md3.outline }}>
          <Box component="span" sx={{ fontWeight: 700, color: md3.primary }}>
            {formatTimeLabel(booking.timeMin)}
          </Box>
          {' · '}
          {course?.name}
          {' · '}
          {booking.conf}
        </Typography>
      </Box>
    </Stack>
  );
}

// ─── Sort chip ──────────────────────────────────────────────────────────────

function SortChip() {
  const { state, dispatch } = usePos();
  const [open, setOpen] = useState(false);
  const labels: Record<ListFilters['sort'], string> = {
    time: 'Time',
    status: 'Status',
    course: 'Course',
  };

  return (
    <Box sx={{ position: 'relative', flexShrink: 0 }}>
      <ButtonBase
        onClick={() => setOpen(!open)}
        sx={{
          gap: 0.625,
          px: 1.5,
          py: 0.875,
          borderRadius: `${radius.xl}px`,
          border: `1.5px solid ${md3.outlineVariant}`,
          bgcolor: '#fff',
          fontSize: 12,
          fontWeight: 700,
          color: md3.onSurfaceVariant,
          '&:hover': { bgcolor: md3.surfaceContainer },
        }}
      >
        <Icon name="sort" size={14} />
        {labels[state.listFilters.sort]}
        <Icon name="arrow_drop_down" size={14} />
      </ButtonBase>
      {open && (
        <>
          <Box onClick={() => setOpen(false)} sx={{ position: 'fixed', inset: 0, zIndex: 849 }} />
          <Box
            sx={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              right: 0,
              zIndex: 850,
              bgcolor: '#fff',
              border: `1.5px solid ${md3.outlineVariant}`,
              borderRadius: `${radius.lg}px`,
              p: 0.75,
              boxShadow: '0 4px 20px rgba(0,0,0,.12)',
              minWidth: 160,
            }}
          >
            {(Object.keys(labels) as Array<ListFilters['sort']>).map((k) => (
              <Stack
                key={k}
                direction="row"
                alignItems="center"
                gap={1}
                onClick={() => {
                  dispatch({ type: 'patchListFilters', patch: { sort: k } });
                  setOpen(false);
                }}
                sx={{
                  p: '8px 10px',
                  borderRadius: `${radius.md}px`,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  color: state.listFilters.sort === k ? md3.primary : md3.onSurfaceVariant,
                  bgcolor: state.listFilters.sort === k ? md3.primaryContainer : 'transparent',
                  '&:hover': { bgcolor: md3.surfaceContainer },
                }}
              >
                {labels[k]}
                {state.listFilters.sort === k && (
                  <Icon name="check" size={16} color={md3.primary} sx={{ ml: 'auto' }} />
                )}
              </Stack>
            ))}
          </Box>
        </>
      )}
    </Box>
  );
}

// ─── Filter drawer ──────────────────────────────────────────────────────────

/** The full filter set, in a right-hand drawer. Applies live; Clear all resets. */
function FilterDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, dispatch } = usePos();
  const f = state.listFilters;

  const toggleIn = (list: string[], v: string) =>
    list.includes(v) ? list.filter((x) => x !== v) : [...list, v];

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: 460, borderLeft: `1px solid ${md3.outlineVariant}` } } }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ p: '16px 20px', borderBottom: `1px solid ${md3.outlineVariant}`, flexShrink: 0 }}
      >
        <Typography sx={{ fontSize: 16, fontWeight: 800 }}>Filters</Typography>
        <ButtonBase onClick={onClose} sx={{ p: 0.75, borderRadius: '50%' }}>
          <Icon name="close" size={18} />
        </ButtonBase>
      </Stack>

      <Box sx={{ flex: 1, overflowY: 'auto', px: 2.5, pb: 2.5 }}>
        <FilterSection title="Check-in">
          <OptionRow
            options={[
              ['all', 'Any'],
              ['pending', 'Pending'],
              ['checkedin', 'Checked in'],
            ]}
            selected={[f.guest]}
            onPick={(v) => dispatch({ type: 'patchListFilters', patch: { guest: v } })}
          />
        </FilterSection>

        <FilterSection title="Membership">
          <OptionRow
            options={[
              ['all', 'Any'],
              ['member', 'Any member'],
              ['guest', 'Guests only'],
              ...(Object.keys(memberTypes) as Array<keyof typeof memberTypes>).map(
                (k) => [k, memberTypes[k].label] as [string, string],
              ),
            ]}
            selected={[f.membership]}
            onPick={(v) => dispatch({ type: 'patchListFilters', patch: { membership: v } })}
          />
        </FilterSection>

        <FilterSection title="Course">
          <OptionRow
            multi
            options={state.courses.map((c) => [c.id, c.name] as [string, string])}
            selected={f.courses}
            onPick={(v) => dispatch({ type: 'patchListFilters', patch: { courses: toggleIn(f.courses, v) } })}
          />
        </FilterSection>

        <FilterSection title="Holes">
          <OptionRow
            options={[
              ['all', 'All holes'],
              ['9H', '9 holes'],
              ['18H', '18 holes'],
            ]}
            selected={[f.holes]}
            onPick={(v) => dispatch({ type: 'patchListFilters', patch: { holes: v } })}
          />
        </FilterSection>

        <FilterSection title="Party size">
          <OptionRow
            multi
            options={['1', '2', '3', '4'].map((n) => [n, `${n} player${n === '1' ? '' : 's'}`] as [string, string])}
            selected={f.players}
            onPick={(v) => dispatch({ type: 'patchListFilters', patch: { players: toggleIn(f.players, v) } })}
          />
        </FilterSection>

        <FilterSection title="Special">
          <OptionRow
            multi
            options={[
              ['notes', 'Has a note'],
              ['unpaid', 'Any unpaid player'],
              ['groups', 'Groups & leagues'],
              ['blocks', 'Blocks & events'],
            ]}
            selected={f.special}
            onPick={(v) => dispatch({ type: 'patchListFilters', patch: { special: toggleIn(f.special, v) } })}
          />
        </FilterSection>
      </Box>

      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ p: '12px 20px', borderTop: `1px solid ${md3.outlineVariant}`, flexShrink: 0 }}
      >
        <ButtonBase
          onClick={() => dispatch({ type: 'clearListFilters' })}
          sx={{ fontSize: 12, color: md3.onSurfaceVariant, textDecoration: 'underline' }}
        >
          Clear all
        </ButtonBase>
        <ButtonBase
          onClick={onClose}
          sx={{
            px: 3,
            py: 1.125,
            borderRadius: `${radius.xl}px`,
            bgcolor: md3.onSurface,
            color: '#fff',
            fontSize: 13,
            fontWeight: 700,
            '&:hover': { bgcolor: '#333' },
          }}
        >
          Done
        </ButtonBase>
      </Stack>
    </Drawer>
  );
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box sx={{ py: 1.75, borderBottom: `1px solid ${md3.outlineVariant}`, '&:last-of-type': { borderBottom: 'none' } }}>
      <SectionLabel color={md3.outline} sx={{ mb: 1.25 }}>
        {title}
      </SectionLabel>
      {children}
    </Box>
  );
}

function OptionRow({
  options,
  selected,
  multi,
  onPick,
}: {
  options: Array<[string, string]>;
  selected: string[];
  multi?: boolean;
  onPick: (v: string) => void;
}) {
  return (
    <Stack direction="row" gap={0.75} sx={{ flexWrap: 'wrap' }}>
      {options.map(([val, label]) => {
        const active = selected.includes(val);
        return (
          <ButtonBase
            key={val}
            onClick={() => onPick(val)}
            sx={{
              px: 1.5,
              py: 0.625,
              borderRadius: `${radius.xl}px`,
              border: `1.5px solid ${active ? md3.primary : md3.outlineVariant}`,
              bgcolor: active ? md3.primary : '#fff',
              color: active ? '#fff' : md3.onSurfaceVariant,
              fontSize: 12,
              fontWeight: 700,
              '&:hover': { bgcolor: active ? md3.primary : md3.surfaceContainer },
            }}
          >
            {multi && active && <Icon name="check" size={13} sx={{ mr: 0.5 }} />}
            {label}
          </ButtonBase>
        );
      })}
    </Stack>
  );
}
