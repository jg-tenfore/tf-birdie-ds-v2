import { useState } from 'react';
import type { ReactNode } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { md3, memberTypes } from '../../../../theme/tokens';
import { activeFilterCount, filterBookings, payCounts } from '../../../logic/bookings';
import { Stack } from '../../../components/Stack';
import { dayBookings, emptyListFilters } from '../../../state/pos-store';
import type { ListFilters } from '../../../state/pos-store';
import { usePos } from '../../../state/PosProvider';
import { DialogTopBar, MobileScreen } from '../../chrome';
import { useMobileNav } from '../../navigation';
import type { ScreenProps } from '../types';
import { FilterChip } from './parts';
import { shortCourse } from './tee-helpers';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box sx={{ px: 2, py: 2, borderBottom: `1px solid ${md3.outlineVariant}` }}>
      <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
        {title}
      </Typography>
      <Stack direction="row" gap={1} flexWrap="wrap">
        {children}
      </Stack>
    </Box>
  );
}

const toggleIn = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

/**
 * Tee sheet filters — a full-screen dialog, because it's a set of choices you can back
 * out of. Edits go to a draft; **Apply** commits them to `state.listFilters` and ✕ throws
 * the draft away, so a half-set filter never leaks onto the sheet. The live match count
 * sits above the choices so the operator can see a filter empty the day before applying it.
 *
 * Same fields as the terminal's list-view drawer, plus payment status (a chip row on the
 * terminal). Sort is left out: the phone sheet is always a time list, so status or course
 * order would have nothing to reorder.
 */
export function TeeSheetFiltersScreen(_: ScreenProps<'teeSheetFilters'>) {
  const { state, dispatch } = usePos();
  const nav = useMobileNav();
  const [draft, setDraft] = useState<ListFilters>(state.listFilters);
  const set = (patch: Partial<ListFilters>) => setDraft({ ...draft, ...patch });

  const day = dayBookings(state);
  const counts = payCounts(day);
  const matches = filterBookings(day, { ...draft, search: '' }).length;
  const n = activeFilterCount(draft);

  const one = (key: 'status' | 'guest' | 'membership' | 'holes', options: Array<[string, string]>, withCounts = false) =>
    options.map(([v, label]) => (
      <FilterChip
        key={v}
        label={label}
        count={withCounts ? (counts[v] ?? 0) : undefined}
        selected={draft[key] === v}
        onClick={() => set({ [key]: draft[key] === v && v !== 'all' ? 'all' : v })}
      />
    ));

  return (
    <MobileScreen
      topBar={
        <DialogTopBar
          title="Filters"
          confirmLabel="Apply"
          onConfirm={() => {
            dispatch({ type: 'patchListFilters', patch: { ...draft, search: state.listFilters.search } });
            nav.pop();
          }}
        />
      }
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ pl: 2, pr: 1, py: 0.5 }}>
        <Typography variant="body2" sx={{ color: md3.onSurfaceVariant }}>
          {matches} of {day.length} tee times match{n ? ` · ${n} filter${n === 1 ? '' : 's'}` : ''}
        </Typography>
        <Button size="small" disabled={!n} onClick={() => setDraft({ ...emptyListFilters, search: draft.search })}>
          Clear all
        </Button>
      </Stack>

      <Section title="Payment">
        {one(
          'status',
          [
            ['all', 'All'],
            ['open', 'Unpaid'],
            ['paid', 'Paid'],
            ['no_show', 'No-show'],
            ['rain_chk', 'Rain check'],
            ['refund', 'Refunded'],
          ],
          true,
        )}
      </Section>
      <Section title="Check-in">
        {one('guest', [
          ['all', 'Any'],
          ['pending', 'Not arrived'],
          ['checkedin', 'Checked in'],
        ])}
      </Section>
      <Section title="Course">
        {state.courses
          .filter((c) => c.visible)
          .map((c) => (
            <FilterChip key={c.id} label={shortCourse(c)} selected={draft.courses.includes(c.id)} onClick={() => set({ courses: toggleIn(draft.courses, c.id) })} />
          ))}
      </Section>
      <Section title="Membership">
        {one('membership', [
          ['all', 'Any'],
          ['member', 'Any member'],
          ['guest', 'Guests'],
          ...(Object.keys(memberTypes) as Array<keyof typeof memberTypes>).map((k) => [k, memberTypes[k].label.replace(' Member', '')] as [string, string]),
        ])}
      </Section>
      <Section title="Holes">
        {one('holes', [
          ['all', 'Any'],
          ['9H', '9 holes'],
          ['18H', '18 holes'],
        ])}
      </Section>
      <Section title="Party size">
        {['1', '2', '3', '4'].map((p) => (
          <FilterChip key={p} label={`${p} player${p === '1' ? '' : 's'}`} selected={draft.players.includes(p)} onClick={() => set({ players: toggleIn(draft.players, p) })} />
        ))}
      </Section>
      <Section title="Special">
        {(
          [
            ['notes', 'Has a note'],
            ['unpaid', 'Any unpaid player'],
            ['groups', 'Groups & leagues'],
            ['blocks', 'Blocks & events'],
          ] as Array<[string, string]>
        ).map(([v, label]) => (
          <FilterChip key={v} label={label} selected={draft.special.includes(v)} onClick={() => set({ special: toggleIn(draft.special, v) })} />
        ))}
      </Section>
      <Box sx={{ height: 24 }} />
    </MobileScreen>
  );
}
