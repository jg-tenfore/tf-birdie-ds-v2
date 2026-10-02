import { useState, type ReactNode } from 'react';
import { Box, ButtonBase, Typography } from '@mui/material';
import { md3, payBadges, radius, shell } from '../../../theme/tokens';
import { PosApp } from '../../../pos/PosApp';
import { ROUND_STEPS } from '../../../pos/data/config';
import { venue } from '../../../pos/data/venues';
import { buildTeeTimeCart, money, orderTotals } from '../../../pos/logic/cart';
import { seatTransportRate } from '../../../pos/logic/seat-pricing';
import { rateContext } from '../../../pos/state/rate-context';
import type { PosState } from '../../../pos/state/pos-store';
import type { Booking } from '../../../pos/types';
import { Icon } from '../../../pos/components/primitives';
import { Stack } from '../../../pos/components/Stack';
import { useFitScale } from '../../pos/screen-helpers';
import { Chip, ProposalTag, type SeatView } from '../100126/mock-kit';
import { sheet, withBooking } from '../100126/scenarios';

/**
 * The 100226 round's additions to the 100126 mock kit (Storybook only).
 *
 * Same rule as last round: the **Proposal** stories are mocks that read the app's real data and copy
 * its look, beside an **Original** that renders the live V1 → V2 screen. Nothing in `src/pos`
 * changes. Everything here renders from props and state alone — no measuring the live DOM, no
 * timers — so a story draws the same in `storybook dev`, the test runner and the production build.
 */

export const LABEL = 'Proposal · 100226';

const GROUND = 8;

/**
 * `ProposalTerminal` with this round's tag, and a `backdropKey`: the live app behind the mock is
 * mounted from `backdrop` once, so a mock that needs the backdrop to change (an order landing on
 * the rail) passes a new key and gets a fresh app from the new state — declarative, like `Screen`.
 */
export function Terminal({
  backdrop,
  backdropKey,
  children,
}: {
  backdrop?: Partial<PosState>;
  backdropKey?: string;
  children?: ReactNode;
}) {
  const scale = useFitScale();
  const frame = (
    <Box sx={{ width: shell.width, height: shell.height, position: 'relative', borderRadius: `${radius.lg}px`, overflow: 'hidden', bgcolor: md3.surface }}>
      {backdrop && <PosApp key={backdropKey} initialState={backdrop} edition="v1v2" />}
      {children}
      <ProposalTag label={LABEL} />
    </Box>
  );
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: md3.scrim, display: 'flex', alignItems: 'center', justifyContent: 'center', p: `${GROUND}px` }}>
      {scale < 1 ? (
        <Box sx={{ width: shell.width * scale, height: shell.height * scale, flexShrink: 0 }}>
          <Box sx={{ width: shell.width, height: shell.height, transform: `scale(${scale})`, transformOrigin: 'top left' }}>{frame}</Box>
        </Box>
      ) : (
        frame
      )}
    </Box>
  );
}

/** The 820 slide-over, with its scrim starting at `scrimFrom` so an open order rail stays readable. */
export function SidePanel({ children, scrimFrom = 0, width = 820 }: { children: ReactNode; scrimFrom?: number; width?: number }) {
  return (
    <>
      <Box sx={{ position: 'absolute', top: 0, bottom: 0, left: scrimFrom, right: 0, bgcolor: 'rgba(15,23,18,.42)', zIndex: 1000 }} />
      <Box
        data-mock-panel
        sx={{ position: 'absolute', top: 0, right: 0, bottom: 0, width, zIndex: 1001, bgcolor: '#fff', boxShadow: '-8px 0 24px rgba(0,0,0,.18)', display: 'flex', flexDirection: 'column' }}
      >
        {children}
      </Box>
    </>
  );
}

// ─── The order, priced the way the register prices it ──────────────────────

const COURSES = venue('eighteen').courses;
const RATES = rateContext({ timePrices: {}, addedGolfers: [] });

/** The register rail's width, from the live layout (`grid.leftPanelW`). */
export const RAIL_W = 320;

/**
 * `b` with each of `seats` sold on the transport row its player row shows.
 *
 * Today the order prices an untouched seat's cart at the booking class's fee ($20.00) while the
 * row reads the catalog's Riding Cart ($26.82): the live rule is that the catalog only takes over
 * once someone picks a row (`seatTransportOverride`). **Add** is a promise that the order charges
 * what the row says, so the mock pins the row's transport on the seats it adds — and the row, the
 * rail and the footer agree.
 */
export function pinRowPrices(b: Booking, seats: readonly number[]): Booking {
  return {
    ...b,
    playerStates: b.playerStates.map((p, i) => (seats.includes(i) && p.transportRateId == null ? { ...p, transportRateId: seatTransportRate(b, i).id } : p)),
  };
}

/** What the order holding `seats` of `b` comes to — the rail's own arithmetic, at the rows' prices. */
export function orderOf(b: Booking, seats: readonly number[]) {
  if (!seats.length) return { subtotal: 0, tax: 0, total: 0 };
  const t = orderTotals(buildTeeTimeCart(pinRowPrices(b, seats), COURSES, RATES, seats));
  return { subtotal: t.goods, tax: t.tax, total: t.total };
}

/**
 * May 22's tee sheet with `seats` of `b` on the register's order and the rail open — what the live
 * app's own **Add** (`addSeatToOrder`) leaves behind. An empty order leaves the rail collapsed.
 */
export function sheetWithOrder(b: Booking, seats: readonly number[]): Partial<PosState> {
  if (!seats.length) return sheet({ bookings: withBooking(b) });
  const pinned = pinRowPrices(b, seats);
  return sheet({
    bookings: withBooking(pinned),
    leftPanelCollapsed: false,
    selectedBookingId: b.id,
    orderSeats: [...seats],
    cart: buildTeeTimeCart(pinned, COURSES, RATES, seats),
  });
}

// ─── Touch-sized parts ──────────────────────────────────────────────────────

/** 40px: the smallest target on these mocks — it is a touchscreen. */
export const TOUCH = 40;

/** A segmented toggle, each segment a full touch target. */
export function Seg<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string; icon?: string }>;
  onChange: (v: T) => void;
}) {
  return (
    <Stack direction="row" role="group" aria-label={label} sx={{ border: `1.5px solid ${md3.outlineVariant}`, borderRadius: `${radius.sm}px`, overflow: 'hidden', flexShrink: 0, bgcolor: '#fff' }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <ButtonBase
            key={String(o.value)}
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            sx={{ minWidth: 44, height: TOUCH - 3, px: 1.25, gap: 0.5, fontSize: 13, fontWeight: 800, bgcolor: on ? md3.onSurface : 'transparent', color: on ? '#fff' : md3.onSurface }}
          >
            {o.icon && <Icon name={o.icon} size={16} />}
            {o.label}
          </ButtonBase>
        );
      })}
    </Stack>
  );
}

/** A pill button at touch height. */
export function TouchButton({
  children,
  icon,
  tone = 'outline',
  onClick,
  label,
  disabled,
  sx,
}: {
  children?: ReactNode;
  icon?: string;
  tone?: 'outline' | 'filled' | 'done' | 'ghost';
  onClick?: () => void;
  label?: string;
  disabled?: boolean;
  sx?: object;
}) {
  const tones = {
    outline: { bg: '#fff', fg: md3.onSurface, bd: md3.outlineVariant },
    filled: { bg: md3.onSurface, fg: '#fff', bd: md3.onSurface },
    done: { bg: md3.primaryContainer, fg: md3.onPrimaryContainer, bd: md3.primary },
    ghost: { bg: 'transparent', fg: md3.onSurfaceVariant, bd: 'transparent' },
  }[tone];
  return (
    <ButtonBase
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      sx={{
        height: TOUCH,
        minWidth: children ? undefined : TOUCH,
        px: children ? 1.75 : 0,
        gap: 0.75,
        borderRadius: `${radius.xl}px`,
        border: `1.5px solid ${tones.bd}`,
        bgcolor: tones.bg,
        color: tones.fg,
        fontSize: 13.5,
        fontWeight: 800,
        whiteSpace: 'nowrap',
        flexShrink: 0,
        '&.Mui-disabled': { opacity: 0.45 },
        ...sx,
      }}
    >
      {icon && <Icon name={icon} size={17} />}
      {children}
    </ButtonBase>
  );
}

// ─── Status chip, touch-sized (100126 #2, approved) ─────────────────────────

const STEPS = ROUND_STEPS;

/** 100126's status chip at touch height: one chip for where the player is, tap to change it. */
export function StatusChipTouch({ step, onChange, name }: { step: number; onChange: (step: number) => void; name: string }) {
  const [open, setOpen] = useState(false);
  const at = STEPS.find((s) => s.step === step) ?? STEPS[0];
  return (
    <Box sx={{ position: 'relative', flexShrink: 0 }}>
      <ButtonBase
        data-status-chip={step}
        aria-label={`${name}: ${at.railLabel}. Change status`}
        onClick={() => setOpen((o) => !o)}
        sx={{ height: 34, gap: 0.5, px: 1.25, borderRadius: `${radius.xl}px`, border: `1.5px solid ${md3.outlineVariant}`, bgcolor: step >= 1 ? payBadges.paid.bg : '#fff', color: step >= 1 ? payBadges.paid.text : md3.onSurface, fontSize: 12, fontWeight: 800 }}
      >
        <Icon name={at.icon} size={14} />
        {at.railLabel}
        <Icon name="expand_more" size={15} />
      </ButtonBase>
      {open && (
        <Box sx={{ position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 8, bgcolor: '#fff', border: `1.5px solid ${md3.outlineVariant}`, borderRadius: `${radius.md}px`, boxShadow: '0 4px 12px rgba(0,0,0,.12)', py: 0.5, minWidth: 180 }}>
          {STEPS.map((s) => (
            <ButtonBase
              key={s.step}
              onClick={() => {
                onChange(s.step);
                setOpen(false);
              }}
              sx={{ width: '100%', height: TOUCH, justifyContent: 'flex-start', gap: 1, px: 1.5, fontSize: 13, fontWeight: s.step === step ? 800 : 500, '&:hover': { bgcolor: md3.surfaceContainer } }}
            >
              <Icon name={s.icon} size={16} />
              {s.railLabel}
            </ButtonBase>
          ))}
        </Box>
      )}
    </Box>
  );
}

// ─── Memberships: first one, then +N (100126 #3, with long and several) ─────

/** `~24` characters, then an ellipsis — the chip's budget for a real plan name. */
export const MEMBERSHIP_CHARS = 24;
export const clip = (s: string, n = MEMBERSHIP_CHARS) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

/**
 * The player's first membership, cut at ~24 characters, and a `+N` for the rest. Tapping either
 * opens a small card listing every membership (with its expiry) and customer type in full.
 */
export function MembershipChips({ s }: { s: SeatView }) {
  const [open, setOpen] = useState(false);
  if (!s.record) return <Chip label="Not linked" tone="muted" />;
  const ms = s.record.memberships;
  const types = s.record.customerTypes;
  const first = ms[0];
  const more = ms.length - 1;
  return (
    <Box sx={{ position: 'relative', minWidth: 0 }}>
      <ButtonBase
        data-membership-chips={s.i}
        aria-label={`${s.name}'s memberships`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        title={[...ms.map((m) => m.name), ...types].join(' · ')}
        sx={{ gap: 0.5, borderRadius: `${radius.xl}px`, minHeight: 34, px: 0.25 }}
      >
        {first ? <Chip label={clip(first.name)} tone="member" /> : <Chip label="No membership" tone="muted" />}
        {more > 0 && <Chip label={`+${more}`} tone="member" />}
        {types.slice(0, 1).map((t) => (
          <Chip key={t} label={clip(t, 18)} tone="type" />
        ))}
        {types.length > 1 && <Chip label={`+${types.length - 1}`} tone="type" />}
      </ButtonBase>
      {open && (
        <Box data-membership-card={s.i} sx={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 8, width: 340, bgcolor: '#fff', border: `1.5px solid ${md3.outlineVariant}`, borderRadius: `${radius.md}px`, boxShadow: '0 6px 18px rgba(0,0,0,.16)', p: 1.5 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: '.05em', color: md3.outline }}>MEMBERSHIPS · {ms.length}</Typography>
          {ms.length === 0 && <Typography sx={{ fontSize: 13, mt: 0.5 }}>None</Typography>}
          {ms.map((m) => (
            <Stack key={m.name} direction="row" justifyContent="space-between" gap={1} sx={{ mt: 0.75, fontSize: 13 }}>
              <Box sx={{ fontWeight: 700 }}>{m.name}</Box>
              <Box sx={{ color: md3.onSurfaceVariant, whiteSpace: 'nowrap' }}>to {m.expires}</Box>
            </Stack>
          ))}
          {types.length > 0 && (
            <>
              <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: '.05em', color: md3.outline, mt: 1.25 }}>CUSTOMER TYPE</Typography>
              <Stack direction="row" gap={0.5} sx={{ mt: 0.5, flexWrap: 'wrap' }}>
                {types.map((t) => (
                  <Chip key={t} label={t} tone="type" />
                ))}
              </Stack>
            </>
          )}
        </Box>
      )}
    </Box>
  );
}

/** Paid / Unpaid / No-show, as one chip. */
export function PayChip({ paid, noShow }: { paid: boolean; noShow?: boolean }) {
  if (noShow) return <Chip label="No-show" tone="muted" icon="person_off" />;
  return <Chip label={paid ? 'Paid' : 'Unpaid'} tone={paid ? 'ok' : 'warn'} />;
}

/** `$54.00`, bold, for the rate breakdown. */
export const Amount = ({ v }: { v: number }) => <b style={{ color: md3.onSurface, fontWeight: 800 }}>{money(v)}</b>;
