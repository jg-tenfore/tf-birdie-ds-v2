import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Box,
  ButtonBase,
  Chip,
  InputAdornment,
  InputBase,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Radio,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import Check from '@mui/icons-material/Check';
import Close from '@mui/icons-material/Close';
import ExpandMore from '@mui/icons-material/ExpandMore';
import Search from '@mui/icons-material/Search';
import { md3, memberTypes, mobile, noteColors, radius } from '../../../../theme/tokens';
import type { MemberTypeKey } from '../../../../theme/tokens';
import { formatTimeLabel } from '../../../data/courses';
import { timeRange } from '../../../logic/bookings';
import type { Course, Golfer } from '../../../types';
import { golferSupporting, initials, tierShort, timeOptions } from './people-utils';
import type { GolferFilter, useGolferSearch } from './people-utils';
import { Stack } from '../../../components/Stack';
import { BottomSheet } from '../../chrome';

/**
 * Building blocks shared by the People and More destinations.
 *
 * Two families live here: the golfer list (search bar, filter chips, alphabetical list)
 * that both the People root and the golfer picker render, and the form controls the
 * operations dialogs share (sections, a bottom-sheet picker, segmented buttons, money
 * fields, a range selector). Anything that opens a menu uses `BottomSheet`, never a
 * portalled MUI menu, so it stays inside the phone frame.
 */

// ─── Avatar ─────────────────────────────────────────────────────────────────

/** Initials on the member tier's colours; guests get a neutral surface. */
export function GolferAvatar({ golfer, size = 40 }: { golfer: Pick<Golfer, 'name' | 'memberType'>; size?: number }) {
  const tier = golfer.memberType ? memberTypes[golfer.memberType] : null;
  return (
    <Box
      aria-hidden
      sx={{
        width: size,
        height: size,
        borderRadius: '50%',
        flexShrink: 0,
        display: 'grid',
        placeItems: 'center',
        bgcolor: tier?.bg ?? md3.surfaceHighest,
        color: tier ? md3.onSurface : md3.onSurfaceVariant,
        fontSize: size * 0.4,
        fontWeight: 500,
        boxShadow: tier ? `inset 0 0 0 2px ${tier.color}` : 'none',
      }}
    >
      {initials(golfer.name)}
    </Box>
  );
}

/** MD3 assist-style chip naming the tier, with its colour dot. */
export function TierChip({ memberType }: { memberType: MemberTypeKey | null }) {
  const tier = memberType ? memberTypes[memberType] : null;
  return (
    <Chip
      label={tier?.label ?? 'Guest'}
      icon={
        <Box
          component="span"
          sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: tier?.color ?? md3.outline, ml: '10px !important' }}
        />
      }
      sx={{ bgcolor: tier?.bg ?? md3.surfaceHigh, color: md3.onSurface, border: 'none' }}
    />
  );
}

// ─── Search + filter + list ─────────────────────────────────────────────────

/** MD3 search bar: a 56dp full pill on surface-container-high. */
export function SearchBar({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      gap={1}
      sx={{ mx: 2, height: 56, px: 2, borderRadius: 28, bgcolor: md3.surfaceHigh }}
    >
      <Search sx={{ color: md3.onSurfaceVariant }} />
      <InputBase
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputProps={{ 'aria-label': placeholder }}
        sx={{ flex: 1, fontSize: 16 }}
      />
      {value && (
        <ButtonBase aria-label="Clear search" onClick={() => onChange('')} sx={{ borderRadius: '50%', p: 0.5 }}>
          <Close sx={{ color: md3.onSurfaceVariant }} />
        </ButtonBase>
      )}
    </Stack>
  );
}

const FILTERS: Array<{ id: GolferFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'members', label: 'Members' },
  { id: 'guests', label: 'Guests' },
  ...(Object.keys(memberTypes) as MemberTypeKey[]).map((k) => ({ id: k as GolferFilter, label: tierShort(k) })),
];

/** One MD3 filter chip: outlined at rest, secondary-container with a check when selected. */
export function FilterChip({
  label,
  selected,
  onClick,
  dot,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  dot?: string;
}) {
  return (
    <Chip
      label={label}
      onClick={onClick}
      aria-pressed={selected}
      icon={
        selected ? (
          <Check sx={{ fontSize: 18 }} />
        ) : dot ? (
          <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: dot, ml: '12px !important' }} />
        ) : undefined
      }
      variant={selected ? 'filled' : 'outlined'}
      sx={{
        flexShrink: 0,
        bgcolor: selected ? mobile.secondaryContainer : 'transparent',
        color: selected ? mobile.onSecondaryContainer : md3.onSurfaceVariant,
        borderColor: md3.outlineVariant,
        '& .MuiChip-icon': { color: selected ? mobile.onSecondaryContainer : undefined },
        '&&:hover, &&.Mui-focusVisible': { bgcolor: selected ? mobile.secondaryContainer : md3.surfaceContainer },
      }}
    />
  );
}

/** A horizontally scrolling chip row — scrolls inside itself, never widens the page. */
export function ChipRow({ children }: { children: ReactNode }) {
  return (
    <Stack
      direction="row"
      gap={1}
      sx={{ px: 2, py: 1.5, overflowX: 'auto', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}
    >
      {children}
    </Stack>
  );
}

/** The search bar and filter chips, for a top app bar's `children` slot. */
export function GolferSearchHeader({
  search,
}: {
  search: ReturnType<typeof useGolferSearch>;
}) {
  return (
    <Box sx={{ pb: 0 }}>
      <SearchBar value={search.query} onChange={search.setQuery} placeholder="Search name or phone" />
      <ChipRow>
        {FILTERS.map((f) => (
          <FilterChip
            key={f.id}
            label={f.label}
            selected={search.filter === f.id}
            onClick={() => search.setFilter(search.filter === f.id && f.id !== 'all' ? 'all' : f.id)}
            dot={f.id in memberTypes ? memberTypes[f.id as MemberTypeKey].color : undefined}
          />
        ))}
      </ChipRow>
    </Box>
  );
}

/** One golfer as an MD3 two-line list item. */
export function GolferRow({ golfer, onClick }: { golfer: Golfer; onClick: () => void }) {
  return (
    <ListItemButton onClick={onClick} sx={{ minHeight: mobile.listItem.two, gap: 2 }}>
      <GolferAvatar golfer={golfer} />
      <ListItemText primary={golfer.name} secondary={golferSupporting(golfer)} sx={{ my: 0, minWidth: 0 }} />
      <Typography variant="caption" sx={{ flexShrink: 0 }}>
        HCP {golfer.hcp}
      </Typography>
    </ListItemButton>
  );
}

/**
 * The result list, sectioned by surname initial with sticky headers — the contacts-app
 * pattern, since that's how people look a name up on a phone.
 */
export function GolferList({
  golfers,
  onPick,
  leading,
}: {
  golfers: Golfer[];
  onPick: (g: Golfer) => void;
  /** Rows above the alphabet — "Add new customer" in the picker. */
  leading?: ReactNode;
}) {
  const groups = useMemo(() => {
    const m = new Map<string, Golfer[]>();
    golfers.forEach((g) => {
      const k = g.name[0]?.toUpperCase() ?? '#';
      m.set(k, [...(m.get(k) ?? []), g]);
    });
    return [...m.entries()];
  }, [golfers]);

  return (
    <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, pb: 12 }}>
      {leading}
      {groups.map(([letter, list]) => (
        <li key={letter}>
          <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
            <ListSubheader sx={{ bgcolor: md3.surface, top: 0, zIndex: 1 }}>{letter}</ListSubheader>
            {list.map((g) => (
              <li key={g.id}>
                <GolferRow golfer={g} onClick={() => onPick(g)} />
              </li>
            ))}
          </Box>
        </li>
      ))}
      {golfers.length === 0 && (
        <Typography sx={{ px: 3, py: 4, color: md3.onSurfaceVariant, textAlign: 'center' }}>
          No one matches. Try a surname or the last four digits of a phone number.
        </Typography>
      )}
    </Box>
  );
}

// ─── Form layout ────────────────────────────────────────────────────────────

/** A labelled group of fields in a full-screen dialog. */
export function FormSection({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <Box sx={{ px: 2, pt: 2.5 }}>
      <Typography variant="subtitle2" sx={{ color: md3.primary, mb: hint ? 0.25 : 1.5 }}>
        {title}
      </Typography>
      {hint && (
        <Typography variant="caption" component="p" sx={{ mb: 1.5 }}>
          {hint}
        </Typography>
      )}
      {children}
    </Box>
  );
}

/** Two fields side by side, each taking half. */
export function FieldRow({ children }: { children: ReactNode }) {
  return (
    <Stack direction="row" gap={1.5} sx={{ '& > *': { flex: 1, minWidth: 0 } }}>
      {children}
    </Stack>
  );
}

/** Outlined number field with a `$` prefix. Empty string means "not set". */
export function MoneyField({
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
    <TextField
      label={label}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, ''))}
      sx={{ '& .MuiInputBase-input': { pl: 0.5 } }}
      slotProps={{
        input: { startAdornment: <InputAdornment position="start">$</InputAdornment> },
        htmlInput: { inputMode: 'decimal' },
        inputLabel: { shrink: true },
      }}
    />
  );
}

/**
 * MD3 segmented button — 2 to 5 mutually exclusive options, checkmark on the selected one.
 */
export function SegmentedButton<T extends string | number>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: Array<{ label: string; value: T; disabled?: boolean }>;
  onChange: (v: T) => void;
  ariaLabel: string;
}) {
  return (
    <ToggleButtonGroup
      exclusive
      fullWidth
      value={value}
      aria-label={ariaLabel}
      onChange={(_, v: T | null) => v != null && onChange(v)}
      sx={{
        '& .MuiToggleButton-root': {
          borderColor: md3.outline,
          color: md3.onSurface,
          px: 1,
          gap: 0.5,
          whiteSpace: 'nowrap',
          '&.Mui-selected, &.Mui-selected:hover': {
            bgcolor: mobile.secondaryContainer,
            color: mobile.onSecondaryContainer,
          },
        },
        '& .MuiToggleButton-root:first-of-type': { borderRadius: '20px 0 0 20px' },
        '& .MuiToggleButton-root:last-of-type': { borderRadius: '0 20px 20px 0' },
      }}
    >
      {options.map((o) => (
        <ToggleButton key={String(o.value)} value={o.value} disabled={o.disabled}>
          {o.value === value && <Check sx={{ fontSize: 18 }} />}
          {o.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}

/**
 * A field that looks like an MD3 outlined dropdown and opens a bottom sheet of options.
 * Long lists (every tee time of the day) scroll inside the sheet.
 */
export function PickerField<T extends string | number>({
  label,
  value,
  options,
  onChange,
  sheetTitle,
}: {
  label: string;
  value: T;
  options: Array<{ label: string; value: T; supporting?: string }>;
  onChange: (v: T) => void;
  sheetTitle?: string;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  return (
    <>
      <TextField
        label={label}
        value={current?.label ?? ''}
        onClick={() => setOpen(true)}
        slotProps={{
          input: {
            readOnly: true,
            endAdornment: <ExpandMore sx={{ color: md3.onSurfaceVariant }} />,
            sx: { cursor: 'pointer', '& input': { cursor: 'pointer' } },
          },
          htmlInput: { 'aria-haspopup': 'dialog' },
        }}
      />
      <BottomSheet open={open} onClose={() => setOpen(false)} title={sheetTitle ?? label}>
        <Box sx={{ maxHeight: 420, overflowY: 'auto' }}>
          {options.map((o) => (
            <ListItemButton
              key={String(o.value)}
              selected={o.value === value}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              sx={{ pl: 3 }}
            >
              <ListItemIcon>
                <Radio checked={o.value === value} tabIndex={-1} sx={{ p: 0 }} />
              </ListItemIcon>
              <ListItemText primary={o.label} secondary={o.supporting} />
            </ListItemButton>
          ))}
        </Box>
      </BottomSheet>
    </>
  );
}

/**
 * Start time plus "this time only / a range". The start is editable because the same
 * dialog opens from a tee-sheet row (start known) and from More (start is a default).
 */
export function TimeRangeFields({
  startMin,
  onStartChange,
  mode,
  onModeChange,
  endMin,
  onEndChange,
}: {
  startMin: number;
  onStartChange: (v: number) => void;
  mode: 'single' | 'range';
  onModeChange: (m: 'single' | 'range') => void;
  endMin: number;
  onEndChange: (v: number) => void;
}) {
  const count = timeRange(startMin, mode === 'range' ? endMin : startMin).length;
  return (
    <Stack gap={2}>
      <SegmentedButton
        ariaLabel="Applies to"
        value={mode}
        onChange={onModeChange}
        options={[
          { label: 'This time', value: 'single' },
          { label: 'A range', value: 'range' },
        ]}
      />
      <FieldRow>
        <PickerField
          label={mode === 'range' ? 'From' : 'Tee time'}
          value={startMin}
          options={timeOptions()}
          onChange={(v) => {
            onStartChange(v);
            if (endMin < v) onEndChange(v);
          }}
        />
        {mode === 'range' && (
          <PickerField label="Through" value={Math.max(endMin, startMin)} options={timeOptions(startMin)} onChange={onEndChange} />
        )}
      </FieldRow>
      <Typography variant="caption">
        {count} tee time{count === 1 ? '' : 's'}
        {mode === 'range' ? ` · ${formatTimeLabel(startMin)} – ${formatTimeLabel(Math.max(endMin, startMin))}` : ''}
      </Typography>
    </Stack>
  );
}

/** Multi-select course chips. */
export function CourseChips({
  courses,
  selected,
  onChange,
  single = false,
}: {
  courses: Course[];
  selected: string[];
  onChange: (ids: string[]) => void;
  single?: boolean;
}) {
  return (
    <Stack direction="row" gap={1} flexWrap="wrap">
      {courses.map((c) => {
        const on = selected.includes(c.id);
        return (
          <FilterChip
            key={c.id}
            label={c.name}
            selected={on}
            onClick={() =>
              onChange(single ? [c.id] : on ? selected.filter((x) => x !== c.id) : [...selected, c.id])
            }
          />
        );
      })}
    </Stack>
  );
}

/** Tone for an inline notice — reuses the note palette so it stays on-token. */
const NOTICE = { info: noteColors.blue, warning: noteColors.yellow, danger: noteColors.red, success: noteColors.green };

/** An inline notice card inside a form: what this will do, or what it will overwrite. */
export function Notice({
  tone = 'info',
  icon,
  title,
  children,
}: {
  tone?: keyof typeof NOTICE;
  icon?: ReactNode;
  title?: string;
  children: ReactNode;
}) {
  const c = NOTICE[tone];
  return (
    <Stack
      direction="row"
      gap={1.5}
      sx={{ mx: 2, mt: 2.5, p: 2, borderRadius: `${radius.md}px`, bgcolor: c.bg, color: c.text, border: `1px solid ${c.border}` }}
    >
      {icon && <Box sx={{ color: c.dot, display: 'flex', pt: 0.25 }}>{icon}</Box>}
      <Box sx={{ minWidth: 0 }}>
        {title && (
          <Typography variant="subtitle2" sx={{ color: c.text, mb: 0.25 }}>
            {title}
          </Typography>
        )}
        <Typography variant="body2" component="div" sx={{ color: c.text }}>
          {children}
        </Typography>
      </Box>
    </Stack>
  );
}
