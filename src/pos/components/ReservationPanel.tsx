import { Box, ButtonBase, Dialog, Tab, Tabs, Typography } from '@mui/material';
import { keyframes } from '@mui/material/styles';
import { elevation, md3, reservationPanel } from '../../theme/tokens';
import { formatTimeLabel } from '../data/courses';
import { checkInPlayer } from '../logic/bookings';
import { buildTeeTimeCart, money, orderTotals } from '../logic/cart';
import { playerHoles, reservationDue, reservationSettled, roundLabel } from '../logic/reservation';
import { useModalContainer } from '../modals/modal-container';
import { FilledButton, OutlineButton } from '../modals/ModalFrame';
import { PANEL_WIDTHS, RESERVATION_TABS, rateContext } from '../state/pos-store';
import type { ReservationTab } from '../state/pos-store';
import { usePos } from '../state/PosProvider';
import type { Booking } from '../types';
import { BookingActivity, BookingFinancial, BookingNotes } from './BookingTabs';
import { PlayerRows } from './PlayerRows';
import { BookingMemberDot, Icon, PayBadge } from './primitives';
import { Stack } from './Stack';
import { WalkInTimePicker } from './WalkInTimePicker';
import { isFreshWalkIn } from '../logic/walk-in';

/**
 * The reservation panel (Weston Edits).
 *
 * Weston's point from the Loom: "the order comes after the golf." Clicking a tee time used to
 * pull it straight into the register as an order; in Birdie today it opens the reservation
 * first — players, holes, tee fees, transport, the customer — and only then is it rung up.
 * This panel is that step, as a slide-over from the right so "you're not losing the context
 * of where you're working on the tee sheet": the sheet stays visible and clickable beside
 * it, and clicking another booking switches the panel.
 *
 * Nothing reaches the cart until **Check in & pay**, which loads the reservation — exactly as
 * adjusted here — into the register.
 */
export function ReservationPanel() {
  const { state } = usePos();
  const panel = state.reservationPanel;
  const panelWidth = panel?.width ?? state.weston.panelWidth;
  const b = panel && state.bookings.find((x) => x.id === panel.bookingId);
  if (!panel || !b) return null;

  if (panel.presentation === 'modal') return <ReservationModal booking={b} />;

  return (
    <Box
      key="reservation-panel"
      role="complementary"
      aria-label={`Reservation · ${b.name}`}
      data-reservation-panel
      sx={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        // Weston: "I wonder if it should take up more space… I think it's more important to
        // have this bigger than to show more of the tee sheet." Three sizes to choose between
        // on the tablet; `cover` takes the sheet entirely and still exits with one ✕.
        width: panelWidth === 'cover' ? '100%' : PANEL_WIDTHS[panelWidth],
        // Over the tee-sheet toolbar (40) and multi-select bar (60); under popovers and dialogs.
        zIndex: 80,
        bgcolor: md3.onPrimary,
        borderLeft: `1px solid ${md3.outlineVariant}`,
        boxShadow: elevation.e3,
        display: 'flex',
        flexDirection: 'column',
        animation: `${slideIn} ${reservationPanel.motion}`,
      }}
    >
      <ReservationContent booking={b} tab={panel.tab} />
    </Box>
  );
}

const slideIn = keyframes`
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
`;

/**
 * The same content as a centred dialog — the comparison Weston asked to see ("can be
 * convinced either way"). Storybook only; see `ReservationPanelState.presentation`.
 */
function ReservationModal({ booking: b }: { booking: Booking }) {
  const { state, dispatch } = usePos();
  const container = useModalContainer();
  const panel = state.reservationPanel!;
  return (
    <Dialog
      open
      onClose={() => dispatch({ type: 'closeReservation' })}
      container={container ?? undefined}
      sx={container ? { position: 'absolute', inset: 0 } : undefined}
      slotProps={{
        ...(container && { backdrop: { sx: { position: 'absolute' } } }),
        paper: {
          sx: {
            width: 620,
            maxWidth: '94%',
            height: 'min(740px, 90%)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          },
        },
      }}
    >
      <ReservationContent booking={b} tab={panel.tab} />
    </Dialog>
  );
}

const TAB_LABELS: Record<ReservationTab, string> = {
  players: 'Players',
  financial: 'Financial',
  notes: 'Notes',
  activity: 'Activity',
};

/** Header, tabs, body and footer — shared by the slide-over and the dialog comparison. */
export function ReservationContent({
  booking: b,
  tab,
}: {
  booking: Booking;
  tab: ReservationTab;
}) {
  const { state, dispatch } = usePos();
  const course = state.courses.find((c) => c.id === b.course);
  const close = () => dispatch({ type: 'closeReservation' });

  return (
    <>
      {/* ── Header ── */}
      <Box sx={{ p: '14px 16px 0', flexShrink: 0 }}>
        <Stack direction="row" alignItems="flex-start" gap={1}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" alignItems="center" gap={0.75}>
              <BookingMemberDot booking={b} size={8} />
              <Typography sx={{ fontSize: 18, fontWeight: 800, lineHeight: 1.2 }} noWrap>
                {b.name}
              </Typography>
              <PayBadge pay={b.pay} />
            </Stack>
            <Typography sx={{ fontSize: 12.5, color: md3.onSurfaceVariant, mt: 0.375 }}>
              <Box component="span" sx={{ fontWeight: 700, color: md3.onSurface }}>
                {formatTimeLabel(b.timeMin)}
              </Box>
              {' · '}
              {course?.name ?? b.course}
              {' · '}
              {roundLabel(b).replace('Tee Time ', '')}
            </Typography>
            <Typography sx={{ fontSize: 11.5, color: md3.outline, mt: 0.25 }}>
              {b.conf} · {b.phone || 'No phone'}
            </Typography>
            {isFreshWalkIn(b) && <WalkInTimePicker booking={b} />}
          </Box>
          <ButtonBase
            onClick={close}
            aria-label="Close reservation"
            sx={{ p: 0.75, borderRadius: '50%', color: md3.onSurfaceVariant, '&:hover': { bgcolor: md3.surfaceContainer } }}
          >
            <Icon name="close" size={20} />
          </ButtonBase>
        </Stack>

        <Tabs
          value={tab}
          onChange={(_, v: ReservationTab) => dispatch({ type: 'setReservationTab', tab: v })}
          variant="fullWidth"
          sx={{ mt: 1, minHeight: 40, borderBottom: `1px solid ${md3.outlineVariant}` }}
        >
          {RESERVATION_TABS.map((t) => (
            <Tab key={t} value={t} label={TAB_LABELS[t]} sx={{ minHeight: 40, py: 0, minWidth: 0, px: 1 }} />
          ))}
        </Tabs>
      </Box>

      {/* ── Body ── */}
      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', p: '14px 16px' }}>
        {tab === 'players' && <PlayerRows booking={b} />}
        {tab === 'financial' && <BookingFinancial booking={b} />}
        {tab === 'notes' && <BookingNotes key={b.id} booking={b} />}
        {tab === 'activity' && <BookingActivity booking={b} />}
      </Box>

      <CheckInFooter booking={b} />
    </>
  );
}

// ─── Footer ─────────────────────────────────────────────────────────────────

/**
 * What the reservation will charge, and the one primary action: **Check in & pay**.
 *
 * It checks the arrived-but-not-checked-in players in, loads the reservation into the
 * register as adjusted here, and closes the panel. A booking already on the order says
 * **Update order** (its retail stays; the golf is rebuilt). A fully settled booking has
 * nothing to take — it says **Open in register**, and the register shows it paid.
 */
export function CheckInFooter({ booking: b }: { booking: Booking }) {
  const { state, dispatch } = usePos();
  // The exact order Check in & pay will build, totalled by the one function the register,
  // checkout and the reader use — green fees, transport and tax, with settled seats at $0.
  const rates = rateContext(state);
  const order = buildTeeTimeCart(b, state.courses, rates);
  const { total: due, tax } = orderTotals(order);
  const fees = reservationDue(b, rates);
  const extras = +(due - fees - tax).toFixed(2);
  const settled = reservationSettled(b);
  // Everyone a no-show: nothing to take and nobody to check in — undo a no-show first.
  const allNoShow = b.playerStates.length > 0 && b.playerStates.every((p) => p.noShow);
  const onOrder = state.selectedBookingId === b.id;
  const playing = b.playerStates.filter((p) => !p.noShow).length;
  const eighteens = b.playerStates.filter((p, i) => !p.noShow && playerHoles(b, i) === 18).length;

  const checkInAndPay = () => {
    if (!settled) {
      dispatch({
        type: 'patchBooking',
        bookingId: b.id,
        patch: { playerStates: b.playerStates.map((p) => (p.noShow ? p : checkInPlayer(p))) },
      });
    }
    dispatch({ type: 'loadBooking', bookingId: b.id });
  };

  const label = settled
    ? 'Open in register'
    : onOrder
      ? `Update order · ${money(due)}`
      : `Check in & pay · ${money(due)}`;

  return (
    <Box sx={{ borderTop: `1px solid ${md3.outlineVariant}`, p: '12px 16px 14px', flexShrink: 0, bgcolor: md3.onPrimary }}>
      <Stack direction="row" alignItems="baseline" justifyContent="space-between" sx={{ mb: 1.25 }}>
        <Typography sx={{ fontSize: 12, color: md3.onSurfaceVariant }}>
          {playing} playing
          {eighteens > 0 && eighteens < playing ? ` · ${eighteens} on 18` : ''}
          {settled ? '' : ` · fees ${money(fees)}${extras > 0 ? ` · carts ${money(extras)}` : ''} · tax ${money(tax)}`}
        </Typography>
        <Typography sx={{ fontSize: 18, fontWeight: 800, color: settled ? md3.primary : md3.onSurface }}>
          {allNoShow ? 'No-show · nothing due' : settled ? 'Paid in full' : `${money(due)} due`}
        </Typography>
      </Stack>
      <Stack direction="row" gap={0.75} alignItems="center">
        <OutlineButton
          onClick={() => dispatch({ type: 'openModal', modal: { kind: 'movePlayers', timeMin: b.timeMin } })}
        >
          Move
        </OutlineButton>
        <OutlineButton
          destructive
          onClick={() =>
            dispatch({
              type: 'openModal',
              modal: {
                kind: 'confirm',
                title: 'Delete this booking?',
                body: `${b.name} · ${formatTimeLabel(b.timeMin)}. The slot is released and this cannot be undone.`,
                confirmLabel: 'Delete booking',
                onConfirm: `deleteBooking:${b.id}`,
              },
            })
          }
        >
          Delete
        </OutlineButton>
        <Box sx={{ flex: 1 }} />
        <OutlineButton onClick={() => dispatch({ type: 'closeReservation' })}>Close</OutlineButton>
        <FilledButton disabled={allNoShow} onClick={checkInAndPay}>
          {allNoShow ? 'No-show' : label}
        </FilledButton>
      </Stack>
    </Box>
  );
}
