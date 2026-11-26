import { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { elevation, md3, radius } from '../../theme/tokens';
import { ROUND_STEP } from '../data/config';
import { formatTimeLabel } from '../data/courses';
import { dayBookings } from '../state/pos-store';
import { usePos } from '../state/PosProvider';
import { Icon, PayBadge } from './primitives';
import { Stack } from './Stack';
import { checkInPlayer } from '../logic/bookings';
import { useWestonEdits } from '../edition';

/**
 * The two right-click menus on the tee sheet.
 *
 * These carry most of the sheet's power: everything an operator can do to a booking
 * or to a whole time row without opening a dialog. They're built here rather than
 * with MUI's `Menu` because both need a header summarising the target and grouped
 * sections with labels — a flat item list would lose the context that makes a
 * destructive action safe to pick.
 */
export function ContextMenus() {
  const { state } = usePos();
  if (!state.contextMenu) return null;
  return state.contextMenu.kind === 'booking' ? <BookingMenu /> : <TimeLabelMenu />;
}

// ─── Shared shell ───────────────────────────────────────────────────────────

type Entry =
  | { section: string }
  | {
      icon: string;
      label: string;
      badge?: string;
      badgeColor?: string;
      destructive?: boolean;
      run: () => void;
    };

/**
 * Where a menu opened at a click's client coordinates goes.
 *
 * Kept on screen: flipped back from the right and bottom edges rather than left to clip.
 *
 * A terminal scaled down to fit — Storybook on a small canvas, or the prototype's **Fit to
 * window** showing a device bigger than the window — sits inside a CSS transform, and a
 * transform makes its box the containing block for `position: fixed`. The click's coordinates
 * are the window's, so there they are mapped into the frame's own unscaled space, and the menu
 * is kept inside the frame rather than the window. At 1:1 nothing is transformed and the
 * window's coordinates are the right ones, as they always were.
 */
function placeMenu(
  x: number,
  y: number,
  width: number,
  height: number,
  host: HTMLElement | null,
): { left: number; top: number } {
  const frame = host?.closest<HTMLElement>('[data-pos-shell]');
  if (frame && frame.offsetWidth > 0) {
    const r = frame.getBoundingClientRect();
    const scale = r.width / frame.offsetWidth;
    if (Math.abs(scale - 1) > 0.001) {
      return {
        left: Math.min((x - r.left) / scale, frame.offsetWidth - width - 8),
        top: Math.min((y - r.top) / scale, Math.max(8, frame.offsetHeight - height - 8)),
      };
    }
  }
  return {
    left: Math.min(x, window.innerWidth - width - 8),
    top: Math.min(y, Math.max(8, window.innerHeight - height - 8)),
  };
}

function MenuShell({
  x,
  y,
  header,
  entries,
  width = 250,
}: {
  x: number;
  y: number;
  header: React.ReactNode;
  entries: Entry[];
  width?: number;
}) {
  const { dispatch } = usePos();
  // The backdrop, once mounted — how the menu finds the terminal frame it opened in.
  const [host, setHost] = useState<HTMLElement | null>(null);
  // The menu's real height once drawn. It used to be assumed at 460, but the booking menu runs
  // taller than that once its sections are all present, so a right-click low on the sheet
  // pushed the bottom entries off the terminal — on every frame, not just the small ones.
  const [height, setHeight] = useState(452);
  const measure = (el: HTMLElement | null) => {
    if (el && el.offsetHeight > 0 && el.offsetHeight !== height) setHeight(el.offsetHeight);
  };
  const { left, top } = placeMenu(x, y, width, height, host);

  return (
    <>
      <Box
        ref={setHost}
        onClick={() => dispatch({ type: 'closeContextMenu' })}
        onContextMenu={(e) => {
          e.preventDefault();
          dispatch({ type: 'closeContextMenu' });
        }}
        sx={{ position: 'fixed', inset: 0, zIndex: 8999 }}
      />
      <Box
        ref={measure}
        sx={{
          position: 'fixed',
          left,
          top,
          zIndex: 9000,
          width,
          bgcolor: '#fff',
          border: `1.5px solid ${md3.outlineVariant}`,
          borderRadius: `${radius.lg}px`,
          boxShadow: elevation.e3,
          overflow: 'hidden',
        }}
      >
        {header}
        {entries.map((e, i) =>
          'section' in e ? (
            <Box
              key={`s${i}`}
              sx={{
                p: '6px 14px 2px',
                fontSize: 9,
                fontWeight: 800,
                letterSpacing: '.7px',
                textTransform: 'uppercase',
                color: md3.outline,
                borderTop: `1px solid ${md3.surfaceContainer}`,
              }}
            >
              {e.section}
            </Box>
          ) : (
            <Stack
              key={e.label}
              direction="row"
              alignItems="center"
              gap={1.25}
              onClick={() => {
                dispatch({ type: 'closeContextMenu' });
                e.run();
              }}
              sx={{
                p: '10px 14px',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                color: e.destructive ? md3.error : md3.onSurface,
                '&:hover': {
                  bgcolor: e.destructive ? '#fff0ee' : md3.primaryContainer,
                  color: e.destructive ? md3.error : md3.primary,
                  '& svg': { color: e.destructive ? md3.error : md3.primary },
                },
              }}
            >
              <Icon
                name={e.icon}
                size={17}
                color={e.destructive ? md3.error : md3.outline}
                sx={{ width: 20 }}
              />
              <Box component="span" sx={{ flex: 1 }}>
                {e.label}
              </Box>
              {e.badge && (
                <Box
                  component="span"
                  sx={{
                    fontSize: 10,
                    fontWeight: 800,
                    px: 0.875,
                    py: '1px',
                    borderRadius: '3px',
                    bgcolor: e.badgeColor ?? md3.surfaceContainer,
                    color: md3.onSurfaceVariant,
                  }}
                >
                  {e.badge}
                </Box>
              )}
            </Stack>
          ),
        )}
      </Box>
    </>
  );
}

// ─── Booking chip menu ──────────────────────────────────────────────────────

function BookingMenu() {
  const { state, dispatch, toast } = usePos();
  const weston = useWestonEdits();
  // Weston Edits: "Booking details" is the reservation panel, not the dialog.
  const openDetails = (bookingId: string) =>
    dispatch(
      weston
        ? { type: 'openReservation', bookingId }
        : { type: 'openModal', modal: { kind: 'bookingDetail', bookingId } },
    );
  const menu = state.contextMenu;
  if (menu?.kind !== 'booking') return null;

  const b = state.bookings.find((x) => x.id === menu.bookingId);
  if (!b) return null;

  const course = state.courses.find((c) => c.id === b.course);
  const paidCount = (b.playerStates ?? []).filter((p) => p.paid).length;
  const checkedIn = (b.playerStates ?? []).filter((p) => p.step >= 0 && !p.noShow).length;
  const isEvent = b.pay === 'event' || b.groupEvent;
  const isBlock = b.pay === 'block';

  // Round progress moves only the players who turned up — as the original's "All Teed Off" /
  // "All Finished" did — so a no-show seat stays a no-show rather than reading "Teed off".
  const advanceAll = (step: number) =>
    dispatch({
      type: 'patchBooking',
      bookingId: b.id,
      patch: { playerStates: b.playerStates.map((p) => (p.noShow ? p : { ...p, step })) },
    });

  const header = (
    <Box sx={{ p: '10px 14px 8px', borderBottom: `1px solid ${md3.surfaceContainer}`, bgcolor: md3.surfaceContainer }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
        <Typography sx={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase' }}>
          {b.name}
        </Typography>
        <PayBadge pay={b.pay} />
      </Stack>
      <Typography sx={{ fontSize: 11, color: md3.onSurfaceVariant, mt: '1px' }}>
        {formatTimeLabel(b.timeMin)} · {course?.name} · {b.players}P
        {b.holes ? ` · ${b.holes}` : ''}
      </Typography>
    </Box>
  );

  // Blocks and league events have no payment or check-in story, so they get a much
  // shorter menu — editing or clearing the slot is all that applies.
  if (isBlock) {
    return (
      <MenuShell
        x={menu.x}
        y={menu.y}
        header={header}
        entries={[
          { section: 'Block' },
          {
            icon: 'edit',
            label: 'Edit block',
            run: () => dispatch({ type: 'openModal', modal: { kind: 'blockTime', timeMin: b.timeMin, editing: true } }),
          },
          {
            icon: 'delete',
            label: 'Remove block',
            destructive: true,
            run: () => {
              dispatch({ type: 'deleteBookings', bookingIds: [b.id] });
              toast('Block removed');
            },
          },
        ]}
      />
    );
  }

  if (isEvent) {
    return (
      <MenuShell
        x={menu.x}
        y={menu.y}
        header={header}
        entries={[
          { section: 'League' },
          {
            icon: 'edit',
            label: 'Edit league',
            run: () =>
              dispatch({
                type: 'openModal',
                modal: { kind: 'league', timeMin: b.groupMeta?.startMin ?? b.timeMin, editGroupId: b.groupId },
              }),
          },
          {
            icon: 'group',
            label: 'Booking details',
            run: () => openDetails(b.id),
          },
          {
            icon: 'delete',
            label: 'Delete league',
            destructive: true,
            run: () => {
              const ids = state.bookings.filter((x) => x.groupId === b.groupId).map((x) => x.id);
              dispatch({ type: 'deleteBookings', bookingIds: ids });
              toast(`League removed · ${ids.length} slots freed`);
            },
          },
        ]}
      />
    );
  }

  return (
    <MenuShell
      x={menu.x}
      y={menu.y}
      header={header}
      entries={[
        { section: 'Open' },
        {
          icon: 'point_of_sale',
          label: 'Load into register',
          run: () => dispatch({ type: 'loadBooking', bookingId: b.id }),
        },
        {
          icon: 'open_in_full',
          label: 'Booking details',
          run: () => openDetails(b.id),
        },

        { section: 'Check-in' },
        {
          icon: 'how_to_reg',
          label: 'Check in all players',
          badge: `${checkedIn}/${b.players}`,
          run: () => {
            dispatch({ type: 'patchBooking', bookingId: b.id, patch: { playerStates: b.playerStates.map(checkInPlayer) } });
            toast(`${b.name} · all checked in`);
          },
        },
        {
          icon: 'sports_golf',
          label: 'Mark teed off',
          run: () => {
            advanceAll(ROUND_STEP.teedOff);
            toast(`${b.name} · teed off`);
          },
        },
        {
          icon: 'flag',
          label: 'Mark finished',
          run: () => {
            advanceAll(ROUND_STEP.finished);
            toast(`${b.name} · finished`);
          },
        },

        { section: 'Payment' },
        {
          icon: 'paid',
          label: 'Mark all paid',
          badge: `${paidCount}/${b.players}`,
          run: () => {
            dispatch({
              type: 'patchBooking',
              bookingId: b.id,
              patch: { pay: 'paid', playerStates: b.playerStates.map((p) => ({ ...p, paid: true })) },
            });
            toast(`${b.name} · marked paid`);
          },
        },
        {
          icon: 'receipt',
          label: 'Mark all unpaid',
          run: () => {
            dispatch({
              type: 'patchBooking',
              bookingId: b.id,
              patch: { pay: 'open', playerStates: b.playerStates.map((p) => ({ ...p, paid: false })) },
            });
            toast(`${b.name} · balance reopened`);
          },
        },
        {
          icon: 'reply',
          label: 'Refund',
          run: () => dispatch({ type: 'openModal', modal: { kind: 'actionPanel', action: 'refund' } }),
        },
        {
          icon: 'wb_cloudy',
          label: 'Issue rain check',
          run: () => {
            dispatch({ type: 'patchBooking', bookingId: b.id, patch: { pay: 'rain_chk' } });
            toast(`Rain check issued · ${b.name}`);
          },
        },

        { section: 'Manage' },
        {
          icon: 'touch_app',
          label: 'Select multiple',
          run: () => dispatch({ type: 'enterMultiSelect', seedId: b.id }),
        },
        {
          icon: 'swap_horiz',
          label: 'Move players',
          run: () => dispatch({ type: 'openModal', modal: { kind: 'movePlayers', timeMin: b.timeMin } }),
        },
        {
          icon: 'person_off',
          label: 'Mark no-show',
          destructive: true,
          run: () => {
            dispatch({
              type: 'patchBooking',
              bookingId: b.id,
              patch: {
                pay: 'no_show',
                playerStates: b.playerStates.map((p) => ({ ...p, noShow: true, step: -1 })),
              },
            });
            toast(`${b.name} · no-show`);
          },
        },
        {
          icon: 'delete',
          label: 'Delete booking',
          destructive: true,
          run: () =>
            dispatch({
              type: 'openModal',
              modal: {
                kind: 'confirm',
                title: 'Delete this booking?',
                body: `${b.name} · ${formatTimeLabel(b.timeMin)} · ${course?.name}. The slot is released and this cannot be undone.`,
                confirmLabel: 'Delete booking',
                onConfirm: `deleteBooking:${b.id}`,
              },
            }),
        },
      ]}
    />
  );
}

// ─── Time row menu ──────────────────────────────────────────────────────────

/**
 * The time-gutter menu: operations that apply to a whole row across all courses —
 * blocking it, annotating it, overriding its price, seating a league in it, or
 * moving everyone out of it.
 */
function TimeLabelMenu() {
  const { state, dispatch, toast } = usePos();
  const menu = state.contextMenu;
  if (menu?.kind !== 'timeLabel') return null;

  const timeMin = menu.timeMin;
  const atTime = dayBookings(state).filter((b) => b.timeMin === timeMin);
  const count = atTime.reduce((s, b) => s + b.players, 0);
  const dayShort = state.currentDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const header = (
    <Box sx={{ p: '10px 14px 8px', borderBottom: `1px solid ${md3.surfaceContainer}`, bgcolor: md3.surfaceContainer }}>
      <Typography sx={{ fontSize: 13, fontWeight: 800 }}>{formatTimeLabel(timeMin)}</Typography>
      <Typography sx={{ fontSize: 11, color: md3.onSurfaceVariant, mt: '1px' }}>
        {dayShort} · {count} golfer{count === 1 ? '' : 's'} across {atTime.length} tee time
        {atTime.length === 1 ? '' : 's'}
      </Typography>
    </Box>
  );

  return (
    <MenuShell
      x={menu.x}
      y={menu.y}
      header={header}
      entries={[
        { section: 'This time row' },
        {
          icon: 'block',
          label: 'Block this time',
          run: () => dispatch({ type: 'openModal', modal: { kind: 'blockTime', timeMin } }),
        },
        {
          icon: 'sticky_note_2',
          label: state.timeNotes[`${state.currentDate.getFullYear()}-${state.currentDate.getMonth() + 1}-${state.currentDate.getDate()}_${timeMin}`]
            ? 'Edit note'
            : 'Add note',
          run: () => dispatch({ type: 'openModal', modal: { kind: 'timeNote', timeMin } }),
        },
        {
          icon: 'sell',
          label: 'Override price',
          run: () => dispatch({ type: 'openModal', modal: { kind: 'timePrice', timeMin } }),
        },

        { section: 'Groups' },
        {
          icon: 'groups',
          label: 'Create league / outing',
          run: () => dispatch({ type: 'openModal', modal: { kind: 'league', timeMin } }),
        },
        {
          icon: 'swap_horiz',
          label: 'Move players out',
          run: () => dispatch({ type: 'openModal', modal: { kind: 'movePlayers', timeMin } }),
        },

        { section: 'Bulk' },
        {
          icon: 'paid',
          label: 'Mark row paid',
          badge: String(atTime.length),
          run: () => {
            atTime.forEach((b) =>
              dispatch({
                type: 'patchBooking',
                bookingId: b.id,
                patch: { pay: 'paid', playerStates: b.playerStates.map((p) => ({ ...p, paid: true })) },
              }),
            );
            toast(`${formatTimeLabel(timeMin)} · ${atTime.length} marked paid`);
          },
        },
        {
          icon: 'how_to_reg',
          label: 'Check in row',
          run: () => {
            atTime.forEach((b) =>
              dispatch({
                type: 'patchBooking',
                bookingId: b.id,
                patch: { playerStates: b.playerStates.map(checkInPlayer) },
              }),
            );
            toast(`${formatTimeLabel(timeMin)} · checked in`);
          },
        },
        {
          icon: 'delete_sweep',
          label: 'Clear this time',
          destructive: true,
          run: () =>
            dispatch({
              type: 'openModal',
              modal: {
                kind: 'confirm',
                title: `Clear ${formatTimeLabel(timeMin)}?`,
                body: `${atTime.length} tee time${atTime.length === 1 ? '' : 's'} across all courses will be removed and the slots released.`,
                confirmLabel: 'Clear time',
                onConfirm: `clearTime:${timeMin}`,
              },
            }),
        },
      ]}
    />
  );
}
