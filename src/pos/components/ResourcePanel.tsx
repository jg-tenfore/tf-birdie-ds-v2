import { useEffect } from 'react';
import { keyframes } from '@emotion/react';
import { Box, ButtonBase, Typography } from '@mui/material';
import { elevation, md3, payBadges, radius, reservationPanel } from '../../theme/tokens';
import { formatTimeLabel } from '../data/courses';
import { SHEETS, resourceById, resourcesOf, type ResourceBooking } from '../data/resources';
import { money } from '../logic/cart';
import {
  canStartAt,
  clampDuration,
  endMin,
  formatDuration,
  maxDurationAt,
  resourcePrice,
} from '../logic/resource-booking';
import { Field, FilledButton, OutlineButton } from '../modals/ModalFrame';
import { usePos } from '../state/PosProvider';
import { Icon } from './primitives';
import { Stack } from './Stack';

/**
 * A court or bay booking, open (V1 → V2).
 *
 * ## What v1 did
 *
 * A full-screen takeover titled with the schedule and the time — "Weekday Court Schedule - 7:20
 * AM" — so the **resource was named twice and the day not at all**. A court booking had no
 * length, no party size and no price, and RESERVE either booked the slot or, with no customer
 * picked, bounced to a separate Add Customer screen. v1's own notes flag the missing day.
 *
 * ## What this does
 *
 * The reservation panel's shape, at the size the content needs. It slides in over a dimmed
 * sheet, says *what, when and for how long* in its title, and ends in the same one primary
 * action as a tee time: **Check in & pay**, which puts the booking on the order and hands over to
 * the register. A court and a tee time are paid for the same way, so there is one habit to learn.
 *
 * Everything that can change is a stepper whose limits come from the sheet: the start moves in
 * the 30-minute grid and never onto another booking, the length never runs past the next booking
 * or closing time, and **Move to** lists only resources that are free for the whole slot. The
 * panel cannot produce a collision, so it never has to report one.
 *
 * 520px rather than the reservation panel's 820: there is no player grid here, and a panel twice
 * the width of its content reads as unfinished.
 */
const WIDTH = 520;

const slideIn = keyframes`from { transform: translateX(100%) } to { transform: translateX(0) }`;
const fadeIn = keyframes`from { opacity: 0 } to { opacity: 1 }`;

export function ResourcePanel() {
  const { state, dispatch, toast } = usePos();
  const id = state.resourcePanel?.bookingId;
  const b = id ? state.resourceBookings.find((x) => x.id === id) : undefined;

  // A draft that is closed without being confirmed was a stray tap, not a booking.
  const close = () => {
    if (b?.draft) dispatch({ type: 'removeResourceBooking', id: b.id });
    else dispatch({ type: 'closeResourcePanel' });
  };

  // Escape does what ✕ does — but not while a dialog (the customer picker, the cancel confirm)
  // is open over the panel, where Escape belongs to the dialog.
  useEffect(() => {
    if (!b) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || state.modal) return;
      dispatch(b.draft ? { type: 'removeResourceBooking', id: b.id } : { type: 'closeResourcePanel' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [b, state.modal, dispatch]);

  if (!b) return null;

  const cfg = SHEETS[b.kind];
  const resource = resourceById(b.resourceId);
  const all = state.resourceBookings;
  const patch = (p: Partial<ResourceBooking>) => dispatch({ type: 'patchResourceBooking', id: b.id, patch: p });

  const room = maxDurationAt(b.kind, b.resourceId, b.date, b.startMin, all, b.id);
  const price = resourcePrice(b);

  // The start can move while the booking still fits where it would land.
  const fitsAt = (start: number) => {
    if (start < cfg.openMin || start + cfg.minDurationMin > cfg.closeMin) return false;
    const others = all.filter((x) => x.id !== b.id);
    return canStartAt(b.kind, b.resourceId, b.date, start, others);
  };
  const moveStart = (delta: number) => {
    const start = b.startMin + delta;
    if (!fitsAt(start)) return;
    const others = all.filter((x) => x.id !== b.id);
    const fit = maxDurationAt(b.kind, b.resourceId, b.date, start, others);
    patch({ startMin: start, durationMin: clampDuration(b.kind, b.durationMin, fit) });
  };

  // Resources free for this whole slot — the only ones worth offering.
  const movable = resourcesOf(b.kind).filter(
    (r) =>
      r.id !== b.resourceId &&
      maxDurationAt(b.kind, r.id, b.date, b.startMin, all.filter((x) => x.id !== b.id), b.id) >= b.durationMin &&
      canStartAt(b.kind, r.id, b.date, b.startMin, all.filter((x) => x.id !== b.id)),
  );

  const status = b.paid ? 'Paid' : b.checkedIn ? 'Checked in' : b.draft ? 'New booking' : 'Booked';
  const onOrder = state.cart.some((i) => i.resourceBookingId === b.id);

  return (
    <>
      <Box
        data-resource-scrim
        aria-hidden
        sx={{ position: 'absolute', inset: 0, zIndex: 79, bgcolor: 'rgba(0,0,0,.6)', animation: `${fadeIn} ${reservationPanel.motion}` }}
      />
      <Box
        role="complementary"
        aria-label={`${resource?.name ?? 'Booking'} · ${b.name}`}
        data-resource-panel
        sx={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width: WIDTH,
          zIndex: 80,
          bgcolor: md3.onPrimary,
          borderLeft: `1px solid ${md3.outlineVariant}`,
          boxShadow: elevation.e3,
          display: 'flex',
          flexDirection: 'column',
          animation: `${slideIn} ${reservationPanel.motion}`,
        }}
      >
        {/* ── What, when, how long — the three things v1's title managed one and a half of. ── */}
        <Stack direction="row" alignItems="flex-start" gap={1} sx={{ p: '16px 20px 14px', borderBottom: `1px solid ${md3.outlineVariant}` }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" alignItems="center" gap={1}>
              <Typography sx={{ fontSize: 19, fontWeight: 800 }} noWrap>
                {resource?.name}
              </Typography>
              <StatusPill paid={b.paid} label={status} />
            </Stack>
            <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: md3.onSurface, mt: 0.25 }}>
              {formatTimeLabel(b.startMin)} – {formatTimeLabel(endMin(b))} · {formatDuration(b.durationMin)}
            </Typography>
            <Typography sx={{ fontSize: 12, color: md3.onSurfaceVariant }}>
              {new Date(`${b.date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </Typography>
          </Box>
          <ButtonBase aria-label="Close" onClick={close} sx={{ width: 44, height: 44, borderRadius: '50%', color: md3.onSurfaceVariant }}>
            <Icon name="close" size={22} />
          </ButtonBase>
        </Stack>

        <Box sx={{ flex: 1, overflowY: 'auto', p: '16px 20px' }}>
          {/* ── Who ── */}
          <Label>Booked for</Label>
          <ButtonBase
            data-resource-customer
            onClick={() => dispatch({ type: 'openModal', modal: { kind: 'golferSearch', target: { resourceBookingId: b.id } } })}
            sx={{
              width: '100%',
              minHeight: 56,
              px: 1.75,
              gap: 1.25,
              justifyContent: 'flex-start',
              borderRadius: `${radius.md}px`,
              border: `1.5px solid ${b.crmId ? md3.primary : md3.outlineVariant}`,
              bgcolor: b.crmId ? md3.primaryContainer : md3.onPrimary,
              textAlign: 'left',
            }}
          >
            <Icon name={b.crmId ? 'person' : 'person_search'} size={20} color={b.crmId ? md3.primary : md3.outline} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: 14.5, fontWeight: 700 }} noWrap>
                {b.name}
              </Typography>
              <Typography sx={{ fontSize: 11.5, color: md3.onSurfaceVariant }}>
                {b.crmId ? (b.phone ?? 'On file') : 'Not in the system — tap to find or add them'}
              </Typography>
            </Box>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: md3.primary }}>{b.crmId ? 'Change' : 'Find'}</Typography>
          </ButtonBase>

          {/* ── When and how long ── */}
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', mt: 2 }}>
            <Box>
              <Label>Starts</Label>
              <Stepper
                ariaLabel="start time"
                value={formatTimeLabel(b.startMin)}
                canDown={fitsAt(b.startMin - cfg.stepMin)}
                canUp={fitsAt(b.startMin + cfg.stepMin)}
                onDown={() => moveStart(-cfg.stepMin)}
                onUp={() => moveStart(cfg.stepMin)}
              />
            </Box>
            <Box>
              <Label>Length</Label>
              <Stepper
                ariaLabel="length"
                value={formatDuration(b.durationMin)}
                canDown={b.durationMin - cfg.stepMin >= cfg.minDurationMin}
                canUp={b.durationMin + cfg.stepMin <= room}
                onDown={() => patch({ durationMin: b.durationMin - cfg.stepMin })}
                onUp={() => patch({ durationMin: b.durationMin + cfg.stepMin })}
              />
            </Box>
          </Box>
          {b.durationMin + cfg.stepMin > room && room < cfg.maxDurationMin && (
            <Typography sx={{ fontSize: 11.5, color: md3.onSurfaceVariant, mt: 0.75 }}>
              {room + b.startMin >= cfg.closeMin ? 'Runs to closing time.' : 'The next booking starts right after this.'}
            </Typography>
          )}

          <Box sx={{ mt: 2 }}>
            <Label>{cfg.partyNoun[0].toUpperCase() + cfg.partyNoun.slice(1)}</Label>
            <Box sx={{ maxWidth: 220 }}>
              <Stepper
                ariaLabel={cfg.partyNoun}
                value={String(b.players)}
                canDown={b.players > 1}
                canUp={b.players < cfg.maxParty}
                onDown={() => patch({ players: b.players - 1 })}
                onUp={() => patch({ players: b.players + 1 })}
              />
            </Box>
          </Box>

          {/* ── Move to another court / bay ── */}
          {!b.paid && (
            <Box sx={{ mt: 2 }}>
              <Label>Move to</Label>
              {movable.length ? (
                <Stack direction="row" gap={0.75} sx={{ flexWrap: 'wrap' }}>
                  {movable.map((r) => (
                    <ButtonBase
                      key={r.id}
                      onClick={() => {
                        patch({ resourceId: r.id });
                        toast(`Moved to ${r.name}`);
                      }}
                      sx={{
                        height: 40,
                        px: 1.5,
                        borderRadius: `${radius.xl}px`,
                        border: `1.5px solid ${md3.outlineVariant}`,
                        fontSize: 12.5,
                        fontWeight: 600,
                      }}
                    >
                      {r.name}
                    </ButtonBase>
                  ))}
                </Stack>
              ) : (
                <Typography sx={{ fontSize: 12.5, color: md3.onSurfaceVariant }}>
                  Every other {b.kind === 'bay' ? 'bay' : 'court'} is taken for this slot.
                </Typography>
              )}
            </Box>
          )}

          <Box sx={{ mt: 2 }}>
            <Field label="Note" value={b.note ?? ''} onChange={(v) => patch({ note: v })} placeholder="Anything the next person should know" multiline />
          </Box>

          {/* ── The charge ── */}
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="baseline"
            sx={{ mt: 2, p: '12px 14px', bgcolor: md3.surfaceContainer, borderRadius: `${radius.md}px` }}
          >
            <Typography sx={{ fontSize: 12.5, color: md3.onSurfaceVariant }}>
              ${resource?.hourly}/hr × {formatDuration(b.durationMin)}
            </Typography>
            <Typography sx={{ fontSize: 18, fontWeight: 800, color: b.paid ? md3.primary : md3.onSurface }} data-resource-price>
              {b.paid ? 'Paid' : money(price)}
            </Typography>
          </Stack>
        </Box>

        {/* ── One primary action, as on a tee time. ── */}
        <Stack direction="row" gap={0.75} alignItems="center" sx={{ p: '12px 20px 14px', borderTop: `1px solid ${md3.outlineVariant}` }}>
          {!b.draft && !b.paid && (
            <OutlineButton
              destructive
              onClick={() =>
                dispatch({
                  type: 'openModal',
                  modal: {
                    kind: 'confirm',
                    title: 'Cancel this booking?',
                    body: `${resource?.name} at ${formatTimeLabel(b.startMin)} for ${b.name} will be removed.`,
                    confirmLabel: 'Cancel booking',
                    onConfirm: `removeResourceBooking:${b.id}`,
                  },
                })
              }
            >
              Cancel booking
            </OutlineButton>
          )}
          <Box sx={{ flex: 1 }} />
          {b.draft ? (
            <>
              <OutlineButton onClick={close}>Discard</OutlineButton>
              <OutlineButton
                onClick={() => {
                  patch({ draft: false });
                  dispatch({ type: 'closeResourcePanel' });
                  toast(`${resource?.name} booked`);
                }}
              >
                Book
              </OutlineButton>
            </>
          ) : (
            <OutlineButton onClick={close}>Close</OutlineButton>
          )}
          {!b.paid && (
            <FilledButton
              onClick={() => {
                patch({ draft: false });
                dispatch({ type: 'checkInResource', id: b.id });
              }}
            >
              {onOrder ? `Update order · ${money(price)}` : `Check in & pay · ${money(price)}`}
            </FilledButton>
          )}
        </Stack>
      </Box>
    </>
  );
}

function Label({ children }: { children: string }) {
  return (
    <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: '.05em', color: md3.onSurfaceVariant, mb: 0.75, textTransform: 'uppercase' }}>
      {children}
    </Typography>
  );
}

function StatusPill({ paid, label }: { paid: boolean; label: string }) {
  const tone = paid ? payBadges.paid : payBadges.open;
  return (
    <Box component="span" sx={{ px: 0.875, py: 0.25, borderRadius: 999, bgcolor: tone.bg, color: tone.text, fontSize: 10.5, fontWeight: 800, letterSpacing: '.04em', flexShrink: 0 }}>
      {label.toUpperCase()}
    </Box>
  );
}

/**
 * A 44px stepper. The tee sheet's party stepper is 28px, which is under this app's own touch
 * minimum; the panel is new, so it starts at the right size.
 */
function Stepper({
  ariaLabel,
  value,
  canDown,
  canUp,
  onDown,
  onUp,
}: {
  ariaLabel: string;
  value: string;
  canDown: boolean;
  canUp: boolean;
  onDown: () => void;
  onUp: () => void;
}) {
  const btn = (dir: 'down' | 'up') => (
    <ButtonBase
      aria-label={`${dir === 'up' ? 'Increase' : 'Decrease'} ${ariaLabel}`}
      disabled={dir === 'up' ? !canUp : !canDown}
      onClick={dir === 'up' ? onUp : onDown}
      sx={{
        width: 44,
        height: 44,
        flexShrink: 0,
        borderRadius: `${radius.sm}px`,
        border: `1.5px solid ${md3.outlineVariant}`,
        bgcolor: md3.onPrimary,
        opacity: (dir === 'up' ? canUp : canDown) ? 1 : 0.35,
      }}
    >
      <Icon name={dir === 'up' ? 'add' : 'remove'} size={18} />
    </ButtonBase>
  );
  return (
    <Stack direction="row" alignItems="center" gap={0.75}>
      {btn('down')}
      <Typography sx={{ flex: 1, textAlign: 'center', fontSize: 14.5, fontWeight: 800 }} data-stepper={ariaLabel}>
        {value}
      </Typography>
      {btn('up')}
    </Stack>
  );
}
