import { useState } from 'react';
import { Box, ButtonBase, Divider, Typography } from '@mui/material';
import { grid as gridTokens, md3, radius, shifts } from '../../theme/tokens';
import type { ShiftKey } from '../../theme/tokens';
import { DEMO_TODAY } from '../data/bookings';
import { dayGolferCount, timeRowKey } from '../state/pos-store';
import { usePos } from '../state/PosProvider';
import { DatePickerPopover } from './DatePickerPopover';
import { ListView } from './ListView';
import { SwitchButton } from './PosView';
import { TeeSheetGrid } from './TeeSheetGrid';
import { TeeSheetSettingsPanel } from './TeeSheetSettingsPanel';
import { Icon } from './primitives';
import { Stack } from './Stack';

/**
 * The tee sheet: toolbar, then either the calendar grid or the list view.
 *
 * The toolbar is the operator's whole navigation surface for the day — date, time
 * band, view mode, search, settings — so it stays fixed while everything below it
 * scrolls.
 */
export function TeeSheetView() {
  const { state, dispatch } = usePos();

  return (
    <Stack sx={{ flex: 1, minWidth: 0, height: '100%' }}>
      <TeeSheetToolbar />
      {state.multiSelectActive && <MultiSelectBar />}
      {state.teeSheetMode === 'cal' ? <TeeSheetGrid /> : <ListView />}

      {/* The collapsed left panel leaves a rail to bring it back. */}
      {state.leftPanelCollapsed && (
        <ButtonBase
          onClick={() => dispatch({ type: 'toggleLeftPanel', collapsed: false })}
          title="Show order panel"
          sx={{
            position: 'absolute',
            left: 8,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 32,
            height: 32,
            borderRadius: '50%',
            bgcolor: '#fff',
            border: `1.5px solid ${md3.outlineVariant}`,
            color: md3.onSurfaceVariant,
            boxShadow: '0 1px 2px rgba(0,0,0,.1),0 2px 6px 2px rgba(0,0,0,.08)',
            zIndex: 30,
            '&:hover': {
              bgcolor: md3.primaryContainer,
              color: md3.primary,
              borderColor: md3.primary,
            },
          }}
        >
          <Icon name="chevron_right" size={18} />
        </ButtonBase>
      )}
    </Stack>
  );
}

// ─── Toolbar ────────────────────────────────────────────────────────────────

function TeeSheetToolbar() {
  const { state, dispatch } = usePos();
  const [dateAnchor, setDateAnchor] = useState<HTMLElement | null>(null);
  const [dayMenuOpen, setDayMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const golfers = dayGolferCount(state);
  const dateLabel = state.currentDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const shift = shifts[state.shift] ?? shifts.full;

  return (
    <Stack
      direction="row"
      alignItems="center"
      gap={0.75}
      sx={{
        height: gridTokens.topbarH,
        bgcolor: '#fff',
        borderBottom: `1px solid ${md3.outlineVariant}`,
        px: 1.75,
        flexShrink: 0,
        position: 'relative',
        zIndex: 40,
      }}
    >
      <ToolbarButton
        icon="chevron_left"
        onClick={() => dispatch({ type: 'shiftDate', days: -1 })}
        title="Previous day"
      />
      <Box sx={{ position: 'relative' }}>
        <ButtonBase
          onClick={(e) => setDateAnchor(dateAnchor ? null : e.currentTarget)}
          sx={{
            fontSize: 16,
            fontWeight: 700,
            px: 0.5,
            whiteSpace: 'nowrap',
            borderRadius: `${radius.sm}px`,
            '&:hover': { bgcolor: md3.surfaceContainer },
          }}
        >
          {dateLabel}
          <Icon name="expand_more" size={18} color={md3.outline} />
        </ButtonBase>
        {dateAnchor && (
          <DatePickerPopover onClose={() => setDateAnchor(null)} />
        )}
      </Box>
      <ToolbarButton
        icon="chevron_right"
        onClick={() => dispatch({ type: 'shiftDate', days: 1 })}
        title="Next day"
      />

      <ToolbarButton label="Today" onClick={() => dispatch({ type: 'setDate', date: DEMO_TODAY() })} />
      <ToolbarButton
        label="Weekend"
        onClick={() => {
          const d = DEMO_TODAY();
          const day = d.getDay();
          d.setDate(d.getDate() + (day === 6 ? 0 : 6 - day));
          dispatch({ type: 'setDate', date: d });
        }}
      />

      <Divider orientation="vertical" flexItem sx={{ my: 1.25, mx: 0.25 }} />

      {/* Day / shift selector */}
      <Box sx={{ position: 'relative' }}>
        <ButtonBase
          onClick={() => setDayMenuOpen(!dayMenuOpen)}
          sx={{
            gap: 0.375,
            px: 1.5,
            py: 0.875,
            borderRadius: `${radius.xl}px`,
            border: `1.5px solid ${md3.outlineVariant}`,
            bgcolor: '#fff',
            fontSize: 13,
            fontWeight: 700,
            '&:hover': { bgcolor: md3.surfaceContainer },
          }}
        >
          <Icon name={shift.icon} size={15} color={shift.iconColor} />
          {shift.label}
          <Icon name="arrow_drop_down" size={16} />
        </ButtonBase>
        {dayMenuOpen && (
          <>
            <Box onClick={() => setDayMenuOpen(false)} sx={{ position: 'fixed', inset: 0, zIndex: 299 }} />
            <Box
              sx={{
                position: 'absolute',
                top: 'calc(100% + 5px)',
                left: 0,
                bgcolor: '#fff',
                border: `1.5px solid ${md3.outlineVariant}`,
                borderRadius: `${radius.md}px`,
                boxShadow: '0 4px 8px 3px rgba(0,0,0,.1)',
                zIndex: 300,
                overflow: 'hidden',
                minWidth: 176,
              }}
            >
              {(Object.keys(shifts) as ShiftKey[]).map((key) => (
                <Stack
                  key={key}
                  direction="row"
                  alignItems="center"
                  gap={1}
                  onClick={() => {
                    dispatch({ type: 'setShift', shift: key });
                    setDayMenuOpen(false);
                  }}
                  sx={{
                    p: '10px 14px',
                    fontSize: 13,
                    cursor: 'pointer',
                    borderBottom: `1px solid ${md3.surfaceContainer}`,
                    '&:last-of-type': { borderBottom: 'none' },
                    color: state.shift === key ? md3.primary : md3.onSurface,
                    fontWeight: state.shift === key ? 700 : 400,
                    '&:hover': { bgcolor: md3.surfaceContainer },
                  }}
                >
                  <Icon name={shifts[key].icon} size={15} color={shifts[key].iconColor} />
                  {shifts[key].label}
                </Stack>
              ))}
            </Box>
          </>
        )}
      </Box>

      <Box sx={{ flex: 1 }} />

      <Stack
        direction="row"
        alignItems="center"
        gap={0.625}
        sx={{
          px: 1.5,
          py: 0.75,
          borderRadius: `${radius.xl}px`,
          border: `1.5px solid ${md3.outlineVariant}`,
          bgcolor: md3.surfaceContainer,
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        <Icon name="group" size={15} color={md3.onSurfaceVariant} />
        <Box component="span" sx={{ color: md3.primary, fontSize: 15 }}>
          {golfers}
        </Box>
        golfers
      </Stack>

      {/* View toggle */}
      <Stack
        direction="row"
        sx={{
          border: `1.5px solid ${md3.outlineVariant}`,
          borderRadius: `${radius.md}px`,
          overflow: 'hidden',
        }}
      >
        {(
          [
            ['cal', 'date_range', 'Calendar'],
            ['list', 'format_list_bulleted', 'List'],
          ] as const
        ).map(([mode, icon, title]) => (
          <ButtonBase
            key={mode}
            title={title}
            onClick={() => dispatch({ type: 'setTeeSheetMode', mode })}
            sx={{
              width: 36,
              height: 32,
              color: state.teeSheetMode === mode ? md3.primary : md3.onSurfaceVariant,
              bgcolor: state.teeSheetMode === mode ? md3.primaryContainer : 'transparent',
              '&:hover': {
                bgcolor: state.teeSheetMode === mode ? md3.primaryContainer : md3.surfaceContainer,
              },
            }}
          >
            <Icon name={icon} size={18} />
          </ButtonBase>
        ))}
      </Stack>

      <ToolbarButton
        icon="search"
        title="Search bookings"
        onClick={() => dispatch({ type: 'openModal', modal: { kind: 'teeSheetSearch' } })}
      />
      <ToolbarButton
        icon="bar_chart"
        title="Day summary"
        onClick={() => dispatch({ type: 'openSidebar', courseId: null })}
      />
      <Box sx={{ position: 'relative' }}>
        <ToolbarButton
          icon="tune"
          title="Tee sheet settings"
          active={settingsOpen}
          onClick={() => setSettingsOpen(!settingsOpen)}
        />
        {settingsOpen && <TeeSheetSettingsPanel onClose={() => setSettingsOpen(false)} />}
      </Box>

      <SwitchButton primary icon="point_of_sale" onClick={() => dispatch({ type: 'setView', view: 'pos' })}>
        Register
      </SwitchButton>
    </Stack>
  );
}

/** Pill button used across the tee-sheet toolbar; icon-only when given no label. */
function ToolbarButton({
  label,
  icon,
  title,
  active,
  onClick,
}: {
  label?: string;
  icon?: string;
  title?: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <ButtonBase
      onClick={onClick}
      title={title ?? label}
      sx={{
        gap: 0.625,
        px: label ? 1.5 : 1,
        py: 0.875,
        borderRadius: `${radius.xl}px`,
        border: `1.5px solid ${active ? md3.primary : md3.outlineVariant}`,
        bgcolor: active ? md3.primaryContainer : 'transparent',
        color: active ? md3.primary : md3.onSurfaceVariant,
        fontSize: 13,
        fontWeight: 500,
        whiteSpace: 'nowrap',
        '&:hover': { bgcolor: md3.surfaceContainer },
      }}
    >
      {icon && <Icon name={icon} size={16} />}
      {label}
    </ButtonBase>
  );
}

// ─── Multi-select bar ───────────────────────────────────────────────────────

/**
 * The bulk-action bar, shown once the operator enters multi-select from a chip's
 * context menu.
 *
 * A dark bar rather than a light one: it's a modal-ish state where normal clicking
 * is repurposed to selection, so it needs to look unmistakably different from the
 * toolbar above it.
 */
function MultiSelectBar() {
  const { state, dispatch, toast } = usePos();
  const n = state.multiSelectIds.length;
  const guard = () => {
    if (n === 0) {
      toast('Select at least one tee time');
      return false;
    }
    return true;
  };

  const actions = [
    {
      label: 'Mark paid',
      icon: 'paid',
      run: () => {
        const ids = state.multiSelectIds;
        state.bookings
          .filter((b) => ids.includes(b.id))
          .forEach((b) =>
            dispatch({
              type: 'patchBooking',
              bookingId: b.id,
              patch: {
                pay: 'paid',
                playerStates: b.playerStates.map((p) => ({ ...p, paid: true })),
              },
            }),
          );
        toast(`${n} tee time${n > 1 ? 's' : ''} marked paid`);
        dispatch({ type: 'exitMultiSelect' });
      },
    },
    {
      label: 'No show',
      icon: 'person_off',
      run: () => {
        state.bookings
          .filter((b) => state.multiSelectIds.includes(b.id))
          .forEach((b) =>
            dispatch({
              type: 'patchBooking',
              bookingId: b.id,
              patch: {
                pay: 'no_show',
                playerStates: b.playerStates.map((p) => ({ ...p, noShow: true, step: -1 })),
              },
            }),
          );
        toast(`${n} marked no-show`);
        dispatch({ type: 'exitMultiSelect' });
      },
    },
    {
      label: 'Rain check',
      icon: 'wb_cloudy',
      run: () => {
        dispatch({ type: 'patchBookings', bookingIds: state.multiSelectIds, patch: { pay: 'rain_chk' } });
        toast(`Rain checks issued for ${n}`);
        dispatch({ type: 'exitMultiSelect' });
      },
    },
    {
      label: 'Message',
      icon: 'forum',
      run: () => {
        toast(`Message queued to ${n} group${n > 1 ? 's' : ''}`);
        dispatch({ type: 'exitMultiSelect' });
      },
    },
  ];

  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      sx={{
        height: 52,
        bgcolor: '#1f2937',
        color: '#fff',
        px: 1.75,
        flexShrink: 0,
        borderBottom: '1px solid #111827',
        position: 'relative',
        zIndex: 60,
      }}
    >
      <Stack direction="row" alignItems="center" gap={1.5}>
        <ButtonBase
          onClick={() => dispatch({ type: 'exitMultiSelect' })}
          sx={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            bgcolor: 'rgba(255,255,255,.08)',
            color: '#fff',
            '&:hover': { bgcolor: 'rgba(255,255,255,.18)' },
          }}
        >
          <Icon name="close" size={16} />
        </ButtonBase>
        <Typography sx={{ fontSize: 14.5, fontWeight: 600 }}>
          <Box component="span" sx={{ fontWeight: 800, color: '#93c5fd' }}>
            {n}
          </Box>{' '}
          selected
        </Typography>
        <ButtonBase
          onClick={() => {
            const ids = state.bookings
              .filter((b) => b.date === toDateKey(state.currentDate) && b.pay !== 'block')
              .map((b) => b.id);
            dispatch({ type: 'setMultiSelect', ids });
          }}
          sx={{ color: '#93c5fd', fontSize: 13, fontWeight: 600, px: 1, py: 0.5, borderRadius: '4px' }}
        >
          Select all
        </ButtonBase>
        {n > 0 && (
          <ButtonBase
            onClick={() => dispatch({ type: 'setMultiSelect', ids: [] })}
            sx={{ color: '#93c5fd', fontSize: 13, fontWeight: 600, px: 1, py: 0.5, borderRadius: '4px' }}
          >
            Deselect all
          </ButtonBase>
        )}
      </Stack>

      <Stack direction="row" alignItems="center" gap={0.5}>
        {actions.map((a) => (
          <ButtonBase
            key={a.label}
            onClick={() => guard() && a.run()}
            sx={{
              gap: 0.75,
              height: 34,
              px: 1.5,
              borderRadius: '6px',
              border: '1px solid rgba(255,255,255,.16)',
              bgcolor: 'rgba(255,255,255,.06)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              whiteSpace: 'nowrap',
              '&:hover': { bgcolor: 'rgba(255,255,255,.14)', borderColor: 'rgba(255,255,255,.28)' },
            }}
          >
            <Icon name={a.icon} size={15} />
            {a.label}
          </ButtonBase>
        ))}
        <Divider orientation="vertical" sx={{ height: 22, mx: 0.5, borderColor: 'rgba(255,255,255,.18)' }} />
        <ButtonBase
          onClick={() =>
            guard() &&
            dispatch({
              type: 'openModal',
              modal: {
                kind: 'confirm',
                title: `Clear ${n} tee time${n > 1 ? 's' : ''}?`,
                body: 'The slots are released and the bookings are removed. This cannot be undone.',
                confirmLabel: `Clear ${n}`,
                onConfirm: 'clearSelected',
              },
            })
          }
          sx={{
            gap: 0.75,
            height: 34,
            px: 1.5,
            borderRadius: '6px',
            border: '1px solid rgba(252,165,165,.3)',
            bgcolor: 'rgba(255,255,255,.06)',
            color: '#fca5a5',
            fontSize: 13,
            fontWeight: 600,
            '&:hover': { bgcolor: 'rgba(220,38,38,.18)', borderColor: '#fca5a5', color: '#fff' },
          }}
        >
          <Icon name="delete_sweep" size={15} />
          Clear
        </ButtonBase>
      </Stack>
      {/* Referenced so the bar recomputes if annotations change mid-selection. */}
      <Box sx={{ display: 'none' }}>{timeRowKey(state.currentDate, 0)}</Box>
    </Stack>
  );
}

/** Local `YYYY-MM-DD`. Duplicated from `toDateStr` to avoid a circular import. */
function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
