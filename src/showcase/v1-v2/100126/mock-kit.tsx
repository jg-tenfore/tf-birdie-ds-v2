import { useState, type ReactNode } from 'react';
import { Box, ButtonBase, Typography } from '@mui/material';
import { md3, mobile, payBadges, playerAccents, radius, shell } from '../../../theme/tokens';
import { PosApp } from '../../../pos/PosApp';
import { ROUND_STEPS } from '../../../pos/data/config';
import { formatTimeLabel } from '../../../pos/data/courses';
import { venue } from '../../../pos/data/venues';
import type { Customer } from '../../../pos/data/customers';
import { buildTeeTimeCart, money, orderTotals } from '../../../pos/logic/cart';
import { customerChips, type CustomerChip } from '../../../pos/logic/customer-search';
import { playerFee, playerHoles, playerName, roundLabel } from '../../../pos/logic/reservation';
import { seatPrice, seatRecord, type SeatPrice } from '../../../pos/logic/seat-pricing';
import { rateContext } from '../../../pos/state/rate-context';
import type { PosState } from '../../../pos/state/pos-store';
import type { Booking } from '../../../pos/types';
import { Icon } from '../../../pos/components/primitives';
import { Stack } from '../../../pos/components/Stack';
import { useFitScale } from '../../pos/screen-helpers';

/**
 * The 100126 feedback round's mock kit (Storybook only).
 *
 * Justin chose **Storybook-only mockups** for this round: each **Proposal** story is a mock built
 * here, beside an **Original** story that renders the live V1 → V2 screen. Nothing in `src/pos`
 * changes until a proposal is approved — so these parts copy the app's look (tokens, type sizes,
 * the 820 slide-over) and read its real data (seat prices, records, memberships), but they are
 * not the app's components and are not wired to its store.
 */

const GROUND = 8;

/** A small dark pill that marks a canvas as a proposal, so a screenshot cannot be mistaken for the app. */
export function ProposalTag({ label = 'Proposal · 100126' }: { label?: string }) {
  return (
    <Box
      data-proposal
      sx={{
        position: 'absolute',
        left: 12,
        bottom: 12,
        zIndex: 2000,
        px: 1.25,
        py: 0.5,
        borderRadius: `${radius.xl}px`,
        bgcolor: '#7c3aed',
        color: '#fff',
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: '.04em',
        pointerEvents: 'none',
        boxShadow: '0 2px 6px rgba(0,0,0,.25)',
      }}
    >
      {label.toUpperCase()}
    </Box>
  );
}

/**
 * The terminal, scaled to fit like `Screen`, with the live app as the backdrop and a proposal laid
 * over it. `backdrop` is the app's state behind the mock — usually the tee sheet the panel slides
 * over — and is not interactive while a mock covers it.
 */
export function ProposalTerminal({
  backdrop,
  children,
  edition = 'v1v2',
}: {
  backdrop?: Partial<PosState>;
  children?: ReactNode;
  edition?: 'v1v2' | 'weston';
}) {
  const scale = useFitScale();
  const frame = (
    <Box sx={{ width: shell.width, height: shell.height, position: 'relative', borderRadius: `${radius.lg}px`, overflow: 'hidden' }}>
      {backdrop && <PosApp initialState={backdrop} edition={edition} />}
      {children}
      <ProposalTag />
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

/** The phone frame, 402×797 on the dark ground, for the mobile proposals. */
export function ProposalPhone({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: md3.scrim, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Box
        sx={{
          width: mobile.frame.width,
          height: mobile.frame.height,
          position: 'relative',
          bgcolor: md3.surface,
          borderRadius: '28px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ height: mobile.statusBarH, px: 2.5, fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
          <span>9:41</span>
          <Typography sx={{ fontSize: 12, fontWeight: 700 }}>100%</Typography>
        </Stack>
        {children}
        <ProposalTag />
      </Box>
    </Box>
  );
}

/** The reservation slide-over's shell — 820 wide, over a scrim, as the live panel draws it. */
export function MockPanel({ children, width = 820 }: { children: ReactNode; width?: number }) {
  return (
    <>
      <Box sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(15,23,18,.42)', zIndex: 1000 }} />
      <Box
        data-mock-panel
        sx={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width,
          zIndex: 1001,
          bgcolor: '#fff',
          boxShadow: '-8px 0 24px rgba(0,0,0,.18)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {children}
      </Box>
    </>
  );
}

// ─── Data, from the real seed ──────────────────────────────────────────────

const COURSES = venue('eighteen').courses;
const RATES = rateContext({ timePrices: {}, addedGolfers: [] });

export interface SeatView {
  i: number;
  name: string;
  accent: string;
  holes: 9 | 18;
  price: SeatPrice;
  record: Customer | null;
  chips: CustomerChip[];
  paid: boolean;
  noShow: boolean;
  step: number;
  cart: boolean;
  cartKey?: number | string;
}

/** One seat, as a mock row needs it — the same pricing and record the live row reads. */
export function seatView(b: Booking, i: number): SeatView {
  const p = b.playerStates[i];
  const record = seatRecord(b, i);
  return {
    i,
    name: playerName(b, i),
    accent: playerAccents[i % playerAccents.length],
    holes: playerHoles(b, i),
    price: seatPrice(b, i, playerFee(b, i, RATES)),
    record,
    chips: record ? customerChips(record) : [],
    paid: Boolean(p?.paid),
    noShow: Boolean(p?.noShow),
    step: p?.step ?? -1,
    cart: (p?.transport ?? b.cart) !== 'walking',
    cartKey: p?.cartKey ?? undefined,
  };
}

export const seats = (b: Booking): SeatView[] => b.playerStates.map((_, i) => seatView(b, i));

/** What Check in & pay would charge — the live footer's own arithmetic. */
export function dueOf(b: Booking) {
  const t = orderTotals(buildTeeTimeCart(b, COURSES, RATES));
  return { total: t.total, tax: t.tax };
}

export const courseName = (b: Booking) => COURSES.find((c) => c.id === b.course)?.name ?? b.course;
export const when = (b: Booking) => `${formatTimeLabel(b.timeMin)} · ${courseName(b)} · ${roundLabel(b).replace('Tee Time ', '')}`;

// ─── Small parts, in the app's style ───────────────────────────────────────

export function Avatar({ name, color, size = 34 }: { name: string; color: string; size?: number }) {
  const initials = name.replace(/[^A-Za-z ,]/g, '').split(/[ ,]+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  return (
    <Box sx={{ width: size, height: size, borderRadius: '50%', bgcolor: color, color: '#fff', display: 'grid', placeItems: 'center', fontSize: size * 0.36, fontWeight: 800, flexShrink: 0 }}>
      {initials || '?'}
    </Box>
  );
}

const CHIP_TONES = {
  member: { bg: '#ede9fe', text: '#6d28d9' },
  type: { bg: '#e0f2fe', text: '#0369a1' },
  ok: { bg: payBadges.paid.bg, text: payBadges.paid.text },
  muted: { bg: '#f3f4f6', text: '#4b5563' },
  warn: { bg: '#fef3c7', text: '#92400e' },
  new: { bg: '#fae8ff', text: '#86198f' },
} as const;

export function Chip({ label, tone = 'muted', icon }: { label: ReactNode; tone?: keyof typeof CHIP_TONES; icon?: string }) {
  const c = CHIP_TONES[tone];
  return (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.375, px: 0.875, py: '2px', borderRadius: `${radius.xl}px`, bgcolor: c.bg, color: c.text, fontSize: 10.5, fontWeight: 800, whiteSpace: 'nowrap' }}>
      {icon && <Icon name={icon} size={12} />}
      {label}
    </Box>
  );
}

export function PillButton({ children, icon, filled, onClick, sx }: { children: ReactNode; icon?: string; filled?: boolean; onClick?: () => void; sx?: object }) {
  return (
    <ButtonBase
      onClick={onClick}
      sx={{
        gap: 0.75,
        px: 1.75,
        py: 1,
        borderRadius: `${radius.xl}px`,
        border: `1.5px solid ${filled ? md3.onSurface : md3.outlineVariant}`,
        bgcolor: filled ? md3.onSurface : '#fff',
        color: filled ? '#fff' : md3.onSurface,
        fontSize: 13,
        fontWeight: 700,
        whiteSpace: 'nowrap',
        ...sx,
      }}
    >
      {icon && <Icon name={icon} size={16} />}
      {children}
    </ButtonBase>
  );
}

/** The panel's header and tabs, as the live one draws them; `contact` is what sits under the name. */
export function MockPanelHeader({ b, contact, tab = 'players' }: { b: Booking; contact?: ReactNode; tab?: 'players' | 'financial' | 'notes' | 'activity' }) {
  return (
    <Box sx={{ p: '14px 16px 0', flexShrink: 0 }}>
      <Stack direction="row" alignItems="flex-start" gap={1}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" alignItems="center" gap={0.75}>
            <Typography sx={{ fontSize: 18, fontWeight: 800 }}>{b.name}</Typography>
            <Chip label={(payBadges[b.pay as keyof typeof payBadges] ?? payBadges.open).label} tone={b.pay === 'paid' ? 'ok' : 'muted'} />
          </Stack>
          <Typography sx={{ fontSize: 12.5, color: md3.onSurfaceVariant, mt: 0.375 }}>{when(b)}</Typography>
          <Box sx={{ fontSize: 11.5, color: md3.outline, mt: 0.25 }}>{contact ?? `${b.conf} · ${b.phone || 'No phone'}`}</Box>
        </Box>
        <Typography sx={{ fontSize: 12, color: md3.onSurfaceVariant, mt: 0.5 }}>‹ &nbsp; of 77 &nbsp; ›</Typography>
        <Icon name="close" size={20} color={md3.onSurfaceVariant} sx={{ mt: 0.5 }} />
      </Stack>
      <Stack direction="row" sx={{ mt: 1, borderBottom: `1px solid ${md3.outlineVariant}` }}>
        {(['players', 'financial', 'notes', 'activity'] as const).map((t) => (
          <Box
            key={t}
            sx={{
              flex: 1,
              textAlign: 'center',
              py: 1.125,
              fontSize: 13.5,
              fontWeight: 700,
              color: t === tab ? md3.primary : md3.onSurfaceVariant,
              borderBottom: `2.5px solid ${t === tab ? md3.primary : 'transparent'}`,
              textTransform: 'capitalize',
            }}
          >
            {t}
          </Box>
        ))}
      </Stack>
    </Box>
  );
}

/** The panel's footer: what Check in & pay would charge. */
export function MockPanelFooter({ b }: { b: Booking }) {
  const { total, tax } = dueOf(b);
  return (
    <Stack direction="row" alignItems="center" gap={1} sx={{ p: '12px 16px', borderTop: `1px solid ${md3.outlineVariant}`, flexShrink: 0 }}>
      <Typography sx={{ fontSize: 12, color: md3.onSurfaceVariant, flex: 1 }}>
        {b.players} playing · tax {money(tax)}
      </Typography>
      <PillButton>Close</PillButton>
      <PillButton filled>Check in & pay · {money(total)}</PillButton>
    </Stack>
  );
}

/** A labelled callout used inside a proposal to name what changed. */
export function WhatChanged({ children }: { children: ReactNode }) {
  return (
    <Stack direction="row" gap={1} alignItems="flex-start" sx={{ p: '8px 12px', borderRadius: `${radius.md}px`, bgcolor: '#f5f3ff', color: '#5b21b6', border: '1px solid #ddd6fe', fontSize: 12, fontWeight: 600, lineHeight: 1.45 }}>
      <Icon name="info" size={15} sx={{ mt: '2px' }} />
      <Box>{children}</Box>
    </Stack>
  );
}

// ─── Player rows ────────────────────────────────────────────────────────────

const STEPS = ROUND_STEPS;
const stepLabel = (step: number) => STEPS.find((s) => s.step === step)?.railLabel ?? 'Not Arrived';

/** Today's round rail — five stops, the current one labelled — drawn as the live row draws it. */
function RailMock({ step }: { step: number }) {
  return (
    <Box sx={{ position: 'relative', mt: 1.25, mb: 0.5, px: 4 }} data-round-rail>
      <Box sx={{ position: 'absolute', left: 48, right: 48, top: 13, height: 1.5, bgcolor: md3.outlineVariant }} />
      <Stack direction="row" justifyContent="space-between">
        {STEPS.map((s) => {
          const on = s.step === step;
          return (
            <Stack key={s.step} alignItems="center" gap={0.5} sx={{ position: 'relative', width: 70 }}>
              <Box sx={{ width: 26, height: 26, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: on ? md3.onSurface : '#fff', border: `1.5px solid ${on ? md3.onSurface : md3.outlineVariant}` }}>
                <Icon name={s.icon} size={14} color={on ? '#fff' : md3.onSurfaceVariant} />
              </Box>
              {on && <Typography sx={{ fontSize: 11, fontWeight: 700 }}>{s.railLabel}</Typography>}
            </Stack>
          );
        })}
      </Stack>
    </Box>
  );
}

/** One chip for where the player is in the round, that opens to change it — in place of the rail. */
export function StatusChip({ initial = -1 }: { initial?: number }) {
  const [step, setStep] = useState(initial);
  const [open, setOpen] = useState(false);
  return (
    <Box sx={{ position: 'relative' }}>
      <ButtonBase
        data-status-chip={step}
        onClick={() => setOpen((o) => !o)}
        sx={{ gap: 0.5, px: 1, py: 0.375, borderRadius: `${radius.xl}px`, border: `1.5px solid ${md3.outlineVariant}`, bgcolor: step >= 0 ? payBadges.paid.bg : '#fff', color: step >= 0 ? payBadges.paid.text : md3.onSurface, fontSize: 11.5, fontWeight: 800 }}
      >
        <Icon name={STEPS.find((s) => s.step === step)?.icon ?? 'person'} size={13} />
        {stepLabel(step)}
        <Icon name="expand_more" size={14} />
      </ButtonBase>
      {open && (
        <Box sx={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 5, bgcolor: '#fff', border: `1.5px solid ${md3.outlineVariant}`, borderRadius: `${radius.md}px`, boxShadow: '0 4px 12px rgba(0,0,0,.12)', py: 0.5, minWidth: 160 }}>
          {STEPS.map((s) => (
            <ButtonBase
              key={s.step}
              onClick={() => {
                setStep(s.step);
                setOpen(false);
              }}
              sx={{ width: '100%', justifyContent: 'flex-start', gap: 1, px: 1.5, py: 0.75, fontSize: 12.5, fontWeight: s.step === step ? 800 : 500, '&:hover': { bgcolor: md3.surfaceContainer } }}
            >
              <Icon name={s.icon} size={15} />
              {s.railLabel}
            </ButtonBase>
          ))}
        </Box>
      )}
    </Box>
  );
}

function HolesToggle({ holes, small }: { holes: 9 | 18; small?: boolean }) {
  return (
    <Stack direction="row" sx={{ border: `1.5px solid ${md3.outlineVariant}`, borderRadius: `${radius.sm}px`, overflow: 'hidden' }}>
      {[9, 18].map((h) => (
        <Box key={h} sx={{ px: small ? 0.875 : 1.5, py: small ? 0.25 : 0.75, fontSize: small ? 11.5 : 13, fontWeight: 800, bgcolor: h === holes ? md3.onSurface : '#fff', color: h === holes ? '#fff' : md3.onSurface }}>
          {h}
        </Box>
      ))}
    </Stack>
  );
}

function MemberChips({ s }: { s: SeatView }) {
  if (!s.record) return <Chip label={s.i === 0 ? 'Booker' : 'Not linked'} tone="muted" />;
  return (
    <Stack direction="row" gap={0.5} sx={{ flexWrap: 'wrap' }} data-member-chips>
      {s.chips.length ? s.chips.slice(0, 3).map((c) => <Chip key={c.label} label={c.label} tone={c.tone} />) : <Chip label="No membership" tone="muted" />}
    </Stack>
  );
}

/**
 * The full player row, as the live panel draws it — controls, the rate and transport lines, the
 * round rail. `stepper: 'chip'` swaps the rail for one status chip; `chips` puts membership and
 * customer type beside the name.
 */
export function FullRow({ s, stepper = 'rail', chips = false }: { s: SeatView; stepper?: 'rail' | 'chip'; chips?: boolean }) {
  return (
    <Box data-full-row={s.i} sx={{ borderRadius: `${radius.md}px`, bgcolor: md3.surfaceContainer, borderLeft: `4px solid ${s.accent}`, p: '12px 14px', mb: 1.25 }}>
      <Stack direction="row" alignItems="center" gap={1}>
        <Avatar name={s.name} color={s.accent} />
        <Typography sx={{ fontSize: 15, fontWeight: 800 }}>{s.name}</Typography>
        {s.i === 0 && <Typography sx={{ fontSize: 11, fontWeight: 800, color: md3.onSurfaceVariant }}>BOOKER</Typography>}
        {chips && <MemberChips s={s} />}
        <Box sx={{ flex: 1 }} />
        {stepper === 'chip' && <StatusChip initial={s.step} />}
        <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: md3.onSurfaceVariant }}>⇄ Change golfer</Typography>
        <Chip label={s.paid ? 'PAID' : 'UNPAID'} tone={s.paid ? 'ok' : 'muted'} />
      </Stack>
      <Stack direction="row" alignItems="center" gap={1} sx={{ mt: 1.25 }}>
        <HolesToggle holes={s.holes} />
        <Box sx={{ px: 1.25, py: 0.75, border: `1.5px solid ${md3.outlineVariant}`, borderRadius: `${radius.sm}px`, bgcolor: '#fff', fontSize: 13, fontWeight: 700, minWidth: 90 }}>{money(s.price.greenFee)}</Box>
        <Box sx={{ flex: 1 }} />
        <Chip label={s.cart ? 'Cart' : 'Walking'} icon={s.cart ? 'directions_car' : 'directions_walk'} tone="muted" />
      </Stack>
      <Stack sx={{ mt: 1, fontSize: 12.5, color: md3.onSurfaceVariant }} gap={0.25}>
        <Stack direction="row" justifyContent="space-between">
          <span>{s.price.rate?.name ?? 'Green fee'}</span>
          <b style={{ color: md3.onSurface }}>{money(s.price.greenFee)}</b>
        </Stack>
        <Stack direction="row" justifyContent="space-between">
          <span>{s.price.transport.name}</span>
          <b style={{ color: md3.onSurface }}>{money(s.price.transportFee)}</b>
        </Stack>
      </Stack>
      {stepper === 'rail' && <RailMock step={s.step} />}
    </Box>
  );
}

/**
 * The compact row: one line per player — who, what they are, where they are in the round, paid,
 * cart — and the rest a tap away. Four of them fit in the panel with room to spare.
 */
export function CompactRow({ s, open, onToggle }: { s: SeatView; open: boolean; onToggle: () => void }) {
  return (
    <Box data-compact-row={s.i} sx={{ borderRadius: `${radius.md}px`, bgcolor: md3.surfaceContainer, borderLeft: `4px solid ${s.accent}`, mb: 0.875, overflow: 'hidden' }}>
      <Stack direction="row" alignItems="center" gap={1} sx={{ p: '8px 12px' }}>
        <Avatar name={s.name} color={s.accent} size={28} />
        <Box sx={{ minWidth: 150 }}>
          <Typography sx={{ fontSize: 13.5, fontWeight: 800, lineHeight: 1.2 }}>{s.name}</Typography>
          <Box sx={{ mt: 0.25 }}>
            <MemberChips s={s} />
          </Box>
        </Box>
        <Box sx={{ flex: 1 }} />
        <StatusChip initial={s.step} />
        <Chip label={s.paid ? 'Paid' : 'Unpaid'} tone={s.paid ? 'ok' : 'warn'} />
        <Chip label={s.cartKey != null ? `Cart · key ${s.cartKey}` : s.cart ? 'Cart' : 'Walking'} icon={s.cart ? 'directions_car' : 'directions_walk'} tone="muted" />
        <HolesToggle holes={s.holes} small />
        <Typography sx={{ fontSize: 13.5, fontWeight: 800, width: 70, textAlign: 'right' }}>{money(s.price.total)}</Typography>
        <ButtonBase aria-label={open ? `Collapse ${s.name}` : `Expand ${s.name}`} onClick={onToggle} sx={{ p: 0.5, borderRadius: '50%' }}>
          <Icon name={open ? 'expand_less' : 'expand_more'} size={20} />
        </ButtonBase>
      </Stack>
      {open && (
        <Box sx={{ p: '4px 14px 12px 52px', borderTop: `1px solid ${md3.outlineVariant}`, fontSize: 12.5, color: md3.onSurfaceVariant }} data-compact-detail={s.i}>
          <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.75 }}>
            <span>{s.price.rate?.name ?? 'Green fee'}</span>
            <b style={{ color: md3.onSurface }}>{money(s.price.greenFee)}</b>
          </Stack>
          <Stack direction="row" justifyContent="space-between">
            <span>{s.price.transport.name}</span>
            <b style={{ color: md3.onSurface }}>{money(s.price.transportFee)}</b>
          </Stack>
          <Typography sx={{ fontSize: 11.5, color: md3.outline, mt: 0.5 }}>
            {[s.record && `ID ${s.record.id}`, s.record && s.record.teeTimes.length > 0 && `${s.record.teeTimes.length} rounds`].filter(Boolean).join(' · ') || 'Not linked to a customer'}
          </Typography>
          <Stack direction="row" gap={1} sx={{ mt: 1 }}>
            <PillButton icon="swap_horiz">Change golfer</PillButton>
            <PillButton icon="add_shopping_cart">Add</PillButton>
            <PillButton icon="person_off">No-show</PillButton>
          </Stack>
        </Box>
      )}
    </Box>
  );
}
