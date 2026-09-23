import { useState } from 'react';
import { Box, ButtonBase, Typography } from '@mui/material';
import { md3, playerAccents, radius } from '../../theme/tokens';
import { ROUND_STEPS, roundStepOf } from '../data/config';
import { formatTimeLabel } from '../data/courses';
import { money } from '../logic/cart';
import { playerFee, playerName, reservationDue } from '../logic/reservation';
import { seatNetGreenFee } from '../logic/seat-pricing';
import { rateContext } from '../state/pos-store';
import { usePos } from '../state/PosProvider';
import type { Booking, PlayerState } from '../types';
import { Field, FilledButton, ModalSection, OutlineButton, PillGroup } from '../modals/ModalFrame';
import { Icon, SectionLabel } from './primitives';
import { Stack } from './Stack';
import { demoNow } from '../data/bookings';

/**
 * Booking content shared by the Booking Detail dialog and the reservation panel (Weston
 * Edits): the round-progress rail, and the Financial, Notes and Activity tabs. One copy, so
 * the dialog and the slide-over can't drift into two ideas of what a booking owes.
 */

// ─── Round progress rail ────────────────────────────────────────────────────

/**
 * A player's five round steps (`ROUND_STEPS`), each clickable — staff correct a mis-tap or
 * jump a group straight to Finished after the fact, so a linear walk would be worse.
 * `dense` is the reservation panel's one-line version: dots only, the label under the
 * current step.
 */
export function RoundRail({
  state: p,
  onStep,
  dense,
}: {
  state: PlayerState;
  onStep: (step: number) => void;
  dense?: boolean;
}) {
  const size = dense ? 22 : 28;
  return (
    <Stack direction="row" sx={{ mt: dense ? 0.75 : 1.25 }}>
      {ROUND_STEPS.map((r, si) => {
        const at = ROUND_STEPS.indexOf(roundStepOf(p));
        const done = at > si;
        const active = at === si;
        return (
          <Stack key={r.step} alignItems="center" gap={0.5} sx={{ flex: 1, position: 'relative' }}>
            {si < ROUND_STEPS.length - 1 && (
              <Box
                sx={{
                  position: 'absolute',
                  top: size / 2 - 1,
                  left: '50%',
                  right: '-50%',
                  height: 2,
                  bgcolor: done ? md3.primary : md3.outlineVariant,
                }}
              />
            )}
            <ButtonBase
              onClick={() => onStep(r.step)}
              sx={{
                width: size,
                height: size,
                borderRadius: '50%',
                zIndex: 1,
                border: `2px solid ${done ? md3.primary : active ? md3.onSurface : md3.outlineVariant}`,
                bgcolor: done ? md3.primary : active ? md3.onSurface : md3.surfaceContainer,
                color: done || active ? '#fff' : md3.onSurfaceVariant,
                '&:hover': { borderColor: md3.primary },
              }}
            >
              <Icon name={r.icon} size={dense ? 12 : 14} />
            </ButtonBase>
            {(!dense || active) && (
              <Typography
                sx={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: active ? md3.onSurface : md3.outline,
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                }}
              >
                {r.railLabel}
              </Typography>
            )}
          </Stack>
        );
      })}
    </Stack>
  );
}

// ─── Financial ──────────────────────────────────────────────────────────────

/** Per-player money: what each owes, and the refund / rain-check trail. */
export function BookingFinancial({ booking: b }: { booking: Booking }) {
  const { state, dispatch, toast } = usePos();
  const rates = rateContext(state);
  const states = b.playerStates ?? [];
  const actions = b.financialActions ?? [];

  const log = (playerIdx: number, type: 'refund' | 'raincheck' | 'raincheck_all') => {
    const name =
      playerIdx === -1
        ? 'Entire group'
        : playerIdx === 0
          ? b.name
          : b.guests?.[playerIdx]?.name || `Player ${playerIdx + 1}`;
    const label = type === 'refund' ? 'Refund' : type === 'raincheck' ? 'Rain check' : 'Rain check (all)';
    dispatch({
      type: 'patchBooking',
      bookingId: b.id,
      patch: {
        financialActions: [
          ...actions,
          {
            time: demoNow().toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            }),
            label,
            player: name,
            type,
          },
        ],
        ...(type !== 'refund' ? { pay: 'rain_chk' as const } : { pay: 'refund' as const }),
        // Give the money back on the seats too, not just on the booking's badge.
        //
        // Only the badge moved before, so a refunded booking reopened in the panel still read
        // "Paid in full · nothing due" and offered "Open in register" — the reservation
        // insisting it had been paid for a round the course had just refunded. A whole-group
        // action clears every seat; a single refund clears that one.
        playerStates: b.playerStates.map((p, i) =>
          playerIdx == null || i === playerIdx ? { ...p, paid: false } : p,
        ),
      },
    });
    toast(`${label} · ${name}`);
  };

  // Per player: a seat switched to 18, or with an adjusted fee, owes its own amount.
  const owed = reservationDue(b, rates);
  const adjusted = states.some((_, i) => seatNetGreenFee(b, i, playerFee(b, i, rates)) !== b.price);

  return (
    <>
      <ModalSection title="Balance">
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{
            p: '12px 14px',
            bgcolor: md3.surfaceContainer,
            borderRadius: `${radius.md}px`,
          }}
        >
          <Box>
            <Typography sx={{ fontSize: 11, color: md3.onSurfaceVariant }}>Outstanding</Typography>
            <Typography
              sx={{
                fontSize: 22,
                fontWeight: 800,
                color: owed > 0 ? md3.error : '#16a34a',
              }}
            >
              {money(owed)}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography sx={{ fontSize: 11, color: md3.onSurfaceVariant }}>Rate per player</Typography>
            <Typography sx={{ fontSize: 15, fontWeight: 700 }}>
              {money(b.price)}
              {adjusted && (
                <Box
                  component="span"
                  sx={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: md3.onSurfaceVariant,
                  }}
                >
                  {' '}
                  · adjusted per player
                </Box>
              )}
            </Typography>
          </Box>
        </Stack>
      </ModalSection>

      <ModalSection title="Per player">
        <Stack gap={0.75}>
          {states.map((p, i) => {
            const name = playerName(b, i);
            const accent = playerAccents[i % playerAccents.length];
            return (
              <Stack
                key={i}
                direction="row"
                alignItems="center"
                gap={1}
                sx={{
                  p: '9px 12px',
                  bgcolor: md3.surfaceContainer,
                  borderRadius: `${radius.md}px`,
                }}
              >
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: accent,
                    flexShrink: 0,
                  }}
                />
                <Typography sx={{ flex: 1, fontSize: 12.5, fontWeight: 600 }}>{name}</Typography>
                <Typography
                  sx={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: p.paid ? '#16a34a' : md3.error,
                  }}
                >
                  {p.noShow ? '—' : p.paid ? 'Paid' : money(seatNetGreenFee(b, i, playerFee(b, i, rates)))}
                </Typography>
                <ButtonBase
                  onClick={() => log(i, 'refund')}
                  title="Refund this player"
                  sx={{
                    p: 0.5,
                    borderRadius: '50%',
                    color: md3.outline,
                    '&:hover': { color: '#d97706' },
                  }}
                >
                  <Icon name="reply" size={15} />
                </ButtonBase>
                <ButtonBase
                  onClick={() => log(i, 'raincheck')}
                  title="Rain check this player"
                  sx={{
                    p: 0.5,
                    borderRadius: '50%',
                    color: md3.outline,
                    '&:hover': { color: '#2563eb' },
                  }}
                >
                  <Icon name="wb_cloudy" size={15} />
                </ButtonBase>
              </Stack>
            );
          })}
        </Stack>
      </ModalSection>

      <ModalSection title="Group actions">
        <Stack direction="row" gap={0.75}>
          <OutlineButton onClick={() => log(-1, 'raincheck_all')}>Rain check all</OutlineButton>
          <OutlineButton destructive onClick={() => log(-1, 'refund')}>
            Refund group
          </OutlineButton>
        </Stack>
      </ModalSection>

      {actions.length > 0 && (
        <ModalSection title="Financial trail">
          <Stack gap={0.5}>
            {actions.map((a, i) => (
              <Stack key={i} direction="row" alignItems="center" gap={1} sx={{ fontSize: 11.5 }}>
                <Icon
                  name={a.type === 'refund' ? 'reply' : 'wb_cloudy'}
                  size={14}
                  color={a.type === 'refund' ? '#d97706' : '#2563eb'}
                />
                <Box component="span" sx={{ fontWeight: 700 }}>
                  {a.label}
                </Box>
                <Box component="span" sx={{ color: md3.onSurfaceVariant, flex: 1 }}>
                  {a.player}
                </Box>
                <Box component="span" sx={{ color: md3.outline }}>
                  {a.time}
                </Box>
              </Stack>
            ))}
          </Stack>
        </ModalSection>
      )}
    </>
  );
}

// ─── Group notes ────────────────────────────────────────────────────────────

/**
 * Notes and tags. Player notes matter operationally: they surface on the cart line
 * at point of sale, so a "needs accessible cart" note reaches whoever checks them in.
 */
export function BookingNotes({ booking: b }: { booking: Booking }) {
  const { dispatch, toast } = usePos();
  const [groupNote, setGroupNote] = useState(b.groupNote ?? b.note ?? '');
  const [playerNotes, setPlayerNotes] = useState<Record<number, string>>(b.playerNotes ?? {});
  const tags = b.tags ?? [];

  const ALL_TAGS = ['VIP', 'Rain check', 'Accessibility', 'Birthday', 'Corporate'];

  const save = () => {
    dispatch({
      type: 'patchBooking',
      bookingId: b.id,
      patch: { groupNote, note: groupNote, playerNotes },
    });
    toast('Notes saved');
  };

  return (
    <>
      <ModalSection title="Tags">
        <PillGroup
          multi
          value={tags}
          options={ALL_TAGS.map((t) => ({ label: t, value: t }))}
          onChange={(t) => {
            const next = tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t];
            dispatch({
              type: 'patchBooking',
              bookingId: b.id,
              patch: { tags: next },
            });
          }}
        />
      </ModalSection>

      <ModalSection title="Group note" hint="Shown on the tee sheet chip and the cart card">
        <Field
          multiline
          value={groupNote}
          onChange={setGroupNote}
          placeholder="Anything the starter or counter should know…"
        />
      </ModalSection>

      <ModalSection title="Player notes" hint="Surface at point of sale on that player's line">
        <Stack gap={1}>
          {Array.from({ length: b.players }, (_, i) => {
            const name = playerName(b, i);
            return (
              <Field
                key={i}
                label={name}
                value={playerNotes[i] ?? ''}
                onChange={(v) => setPlayerNotes({ ...playerNotes, [i]: v })}
                placeholder="No note"
              />
            );
          })}
        </Stack>
      </ModalSection>

      <FilledButton onClick={save}>Save notes</FilledButton>
    </>
  );
}

// ─── Activity ───────────────────────────────────────────────────────────────

/**
 * The audit trail. Seeded from the booking's current state when there's no explicit
 * log, so the tab is never empty — a booking always has at least a creation event.
 */
export function BookingActivity({ booking: b }: { booking: Booking }) {
  const entries = [
    ...(b.activityLog ?? []),
    ...(b.financialActions ?? []).map((a) => ({
      time: a.time,
      label: a.label,
      detail: a.player,
      icon: a.type === 'refund' ? 'reply' : 'wb_cloudy',
      color: a.type === 'refund' ? '#d97706' : '#2563eb',
    })),
  ];

  const seeded =
    entries.length > 0
      ? entries
      : [
          {
            time: formatTimeLabel(Math.max(0, b.timeMin - 240)),
            label: 'Booking created',
            detail: `${b.conf} · ${b.players} player${b.players === 1 ? '' : 's'}`,
            icon: 'event_available',
            color: md3.primary,
          },
          ...((b.playerStates ?? []).some((p) => p.paid)
            ? [
                {
                  time: formatTimeLabel(Math.max(0, b.timeMin - 30)),
                  label: 'Payment taken',
                  detail: `${money(b.price)} per player`,
                  icon: 'paid',
                  color: '#16a34a',
                },
              ]
            : []),
          ...((b.playerStates ?? []).some((p) => p.step >= 0)
            ? [
                {
                  time: formatTimeLabel(Math.max(0, b.timeMin - 15)),
                  label: 'Checked in',
                  detail: `${(b.playerStates ?? []).filter((p) => p.step >= 0).length} of ${b.players}`,
                  icon: 'how_to_reg',
                  color: '#2563eb',
                },
              ]
            : []),
        ];

  return (
    <>
      <SectionLabel color={md3.outline} sx={{ mb: 1.5 }}>
        {seeded.length} event{seeded.length === 1 ? '' : 's'}
      </SectionLabel>
      <Stack gap={2}>
        {seeded.map((e, i) => (
          <Stack key={i} direction="row" gap={1.5}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                bgcolor: `${e.color ?? md3.primary}1f`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Icon name={e.icon ?? 'circle'} size={16} color={e.color ?? md3.primary} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Stack direction="row" alignItems="baseline" justifyContent="space-between">
                <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{e.label}</Typography>
                <Typography sx={{ fontSize: 11, color: md3.outline }}>{e.time}</Typography>
              </Stack>
              {e.detail && (
                <Typography sx={{ fontSize: 11.5, color: md3.onSurfaceVariant }}>{e.detail}</Typography>
              )}
            </Box>
          </Stack>
        ))}
      </Stack>
    </>
  );
}
