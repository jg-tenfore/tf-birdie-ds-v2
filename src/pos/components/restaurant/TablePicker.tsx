import { Box, ButtonBase, Typography } from '@mui/material';
import { md3, radius } from '../../../theme/tokens';
import type { FloorElement, Room } from '../../data/floor';
import { tableLabel } from '../../logic/restaurant';
import { Icon, SectionLabel } from '../primitives';
import { Stack } from '../Stack';

/**
 * Pick a table (V1 → V2, Wave 2) — the one control every restaurant dialog uses to choose where
 * a party sits: opening a tab, moving one, seating a reservation, assigning one ahead.
 *
 * Tiles by room, not a dropdown of numbers. A host thinks "one of the window four-tops", not
 * "Table 3", and a tile can carry the reason a table is not available right on it — "Occupied · Kim",
 * "Johnson · 7:00 PM" — so an unavailable table explains itself instead of
 * silently being missing from a list. v1 never had to, because v1 never let a reservation have a
 * table at all.
 *
 * Callers decide what is available: this only draws. A `warn` item is selectable but marked,
 * for the soft cases (a table held for someone else, a tight fit) where the host may know better.
 */

export interface TablePickerItem {
  room: Room;
  table: FloorElement;
  /** Why it can't be chosen. */
  disabled?: boolean;
  /** Printed under the table: the reason, or the warning. Defaults to its seat count. */
  note?: string;
  warn?: boolean;
}

export function TablePicker({
  items,
  value,
  onChange,
  none,
}: {
  items: TablePickerItem[];
  value: string | null;
  onChange: (tableId: string | null) => void;
  /** Offer "no table" as a choice — a bar tab, a reservation not yet placed. */
  none?: { label: string; note?: string };
}) {
  const rooms: { room: Room; items: TablePickerItem[] }[] = [];
  for (const it of items) {
    const g = rooms.find((r) => r.room.id === it.room.id);
    if (g) g.items.push(it);
    else rooms.push({ room: it.room, items: [it] });
  }

  return (
    <Stack gap={1.5} data-table-picker>
      {none && (
        <Box sx={{ alignSelf: 'flex-start', minWidth: 180 }}>
          <Tile label={none.label} note={none.note} selected={value === null} onClick={() => onChange(null)} icon="block" />
        </Box>
      )}
      {rooms.map((g) => (
        <Box key={g.room.id}>
          <SectionLabel color={md3.outline} sx={{ mb: 0.75 }}>
            {g.room.name}
          </SectionLabel>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(116px, 1fr))', gap: 0.75 }}>
            {g.items.map((it) => (
              <Tile
                key={it.table.id}
                label={tableLabel(it.table)}
                note={it.note ?? `${it.table.seats ?? 0} seats`}
                selected={value === it.table.id}
                disabled={it.disabled}
                warn={it.warn}
                onClick={() => onChange(it.table.id)}
              />
            ))}
          </Box>
        </Box>
      ))}
      {items.length === 0 && !none && (
        <Typography sx={{ fontSize: 12.5, color: md3.onSurfaceVariant }}>No table fits this party.</Typography>
      )}
    </Stack>
  );
}

function Tile({
  label,
  note,
  selected,
  disabled,
  warn,
  icon,
  onClick,
}: {
  label: string;
  note?: string;
  selected: boolean;
  disabled?: boolean;
  warn?: boolean;
  icon?: string;
  onClick: () => void;
}) {
  const accent = warn ? '#b45309' : md3.primary;
  return (
    <ButtonBase
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={selected}
      data-table-option={label}
      sx={{
        width: '100%',
        minHeight: 52,
        px: 1.25,
        py: 0.75,
        borderRadius: `${radius.md}px`,
        border: `1.5px solid ${selected ? accent : md3.outlineVariant}`,
        bgcolor: selected ? `${accent}14` : disabled ? md3.surfaceContainer : '#fff',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'center',
        textAlign: 'left',
        '&.Mui-disabled': { opacity: 0.6 },
      }}
    >
      <Stack direction="row" alignItems="center" gap={0.5}>
        {icon && <Icon name={icon} size={14} color={md3.onSurfaceVariant} />}
        <Typography sx={{ fontSize: 13.5, fontWeight: 800, color: md3.onSurface }}>{label}</Typography>
        {selected && <Icon name="check" size={15} color={accent} />}
      </Stack>
      {note && (
        <Typography
          sx={{ fontSize: 11, lineHeight: 1.3, color: warn ? '#92400e' : md3.onSurfaceVariant, fontWeight: warn ? 700 : 400 }}
        >
          {note}
        </Typography>
      )}
    </ButtonBase>
  );
}
