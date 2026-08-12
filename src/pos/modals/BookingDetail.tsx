import { useState } from 'react';
import { Box, ButtonBase, Tab, Tabs, Typography } from '@mui/material';
import { md3, playerAccents, radius } from '../../theme/tokens';
import { STATUS_STEPS, STATUS_STEP_ICONS, TRANSPORT_META } from '../data/config';
import { formatTimeLabel } from '../data/courses';
import { findMemberByPhone } from '../data/golfers';
import { usePos } from '../state/PosProvider';
import type { Booking } from '../types';
import { Icon, MemberDot, PayBadge, SectionLabel } from '../components/primitives';
import { Callout, Field, FilledButton, ModalFrame, ModalSection, OutlineButton, PillGroup } from './ModalFrame';
import { Stack } from '../components/Stack';

/**
 * Booking detail — the full record behind one tee time, in five tabs.
 *
 * The tab order follows how staff actually work a booking: confirm *what* it is,
 * move players through check-in, settle money, read notes, then audit. Player state
 * is per-person rather than per-booking throughout, because a foursome routinely
 * arrives in twos and pays separately.
 */
export function BookingDetail({ bookingId, initialTab = 0 }: { bookingId: string; initialTab?: number }) {
  const { state, dispatch } = usePos();
  const [tab, setTab] = useState(initialTab);
  const b = state.bookings.find((x) => x.id === bookingId);

  if (!b) return null;
  const course = state.courses.find((c) => c.id === b.course);
  const member = findMemberByPhone(b.phone);

  const TABS = ['Details', 'Players & Status', 'Financial', 'Group Notes', 'Activity'];

  return (
    <ModalFrame
      tall
      width={620}
      title={b.name}
      subtitle={`${formatTimeLabel(b.timeMin)} · ${course?.name ?? b.course} · ${b.conf}`}
      icon="golf_course"
      actions={
        <>
          <OutlineButton
            destructive
            onClick={() =>
              dispatch({
                type: 'openModal',
                modal: {
                  kind: 'confirm',
                  title: 'Delete this booking?',
                  body: `${b.name} · ${formatTimeLabel(b.timeMin)} · ${course?.name}. The slot is released and this cannot be undone.`,
                  confirmLabel: 'Delete booking',
                  onConfirm: `deleteBooking:${b.id}`,
                },
              })
            }
          >
            Delete
          </OutlineButton>
          <Box sx={{ flex: 1 }} />
          <OutlineButton onClick={() => dispatch({ type: 'closeModal' })}>Close</OutlineButton>
          <FilledButton onClick={() => dispatch({ type: 'loadBooking', bookingId: b.id })}>
            Load into register
          </FilledButton>
        </>
      }
    >
      <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1.5 }}>
        {member && <MemberDot memberType={member.memberType} />}
        <PayBadge pay={b.pay} />
        {b.holes && (
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: md3.onSurfaceVariant }}>
            {b.holes}
          </Typography>
        )}
        <Typography sx={{ fontSize: 11, color: md3.outline }}>{b.phone}</Typography>
      </Stack>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="scrollable"
        sx={{ borderBottom: `1px solid ${md3.outlineVariant}`, mb: 2, minHeight: 38 }}
      >
        {TABS.map((t) => (
          <Tab key={t} label={t} sx={{ minHeight: 38, py: 0 }} />
        ))}
      </Tabs>

      {tab === 0 && <DetailsTab booking={b} />}
      {tab === 1 && <PlayersTab booking={b} />}
      {tab === 2 && <FinancialTab booking={b} />}
      {tab === 3 && <NotesTab booking={b} />}
      {tab === 4 && <ActivityTab booking={b} />}
    </ModalFrame>
  );
}

// ─── Details ────────────────────────────────────────────────────────────────

function DetailsTab({ booking: b }: { booking: Booking }) {
  const { state, dispatch, toast } = usePos();
  const course = state.courses.find((c) => c.id === b.course);
  const member = findMemberByPhone(b.phone);
  const dateStr = state.currentDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const rows: Array<[string, React.ReactNode]> = [
    ['Confirmation', b.conf],
    ['Date', dateStr],
    ['Tee time', formatTimeLabel(b.timeMin)],
    ['Course', course?.name ?? b.course],
    ['Holes', b.holes || '—'],
    ['Players', `${b.players}`],
    ['Transport', TRANSPORT_META[b.cart]?.label ?? b.cart],
    ['Phone', b.phone || '—'],
    ['Rate', b.price ? `$${b.price}` : 'Member · $0'],
    [
      'Membership',
      member ? (
        // Keyed because this element sits inside the `rows` array literal, not a map.
        <Stack key="membership" direction="row" alignItems="center" gap={0.5}>
          <MemberDot memberType={member.memberType} size={7} />
          {member.name} · HCP {member.hcp}
        </Stack>
      ) : (
        'Guest'
      ),
    ],
  ];

  return (
    <>
      <ModalSection title="Reservation">
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'auto 1fr',
            columnGap: 2,
            rowGap: 0.875,
            fontSize: 12.5,
          }}
        >
          {rows.map(([k, v]) => (
            <Box key={k} sx={{ display: 'contents' }}>
              <Typography sx={{ fontSize: 12, color: md3.onSurfaceVariant }}>{k}</Typography>
              <Box sx={{ fontWeight: 600, fontSize: 12.5 }}>{v}</Box>
            </Box>
          ))}
        </Box>
      </ModalSection>

      <ModalSection title="Transport" hint="Applies to the whole group">
        <PillGroup
          value={b.cart}
          options={[
            { label: 'Walking', value: 'walking' as const },
            { label: 'Riding cart', value: 'cart' as const },
            { label: 'Push cart', value: 'push' as const },
          ]}
          onChange={(v) => {
            dispatch({ type: 'patchBooking', bookingId: b.id, patch: { cart: v } });
            toast(`Transport set to ${TRANSPORT_META[v]?.label}`);
          }}
        />
      </ModalSection>

      {b.note && (
        <ModalSection title="Reservation note">
          <Callout tone="warning" icon="sticky_note_2">
            {b.note}
          </Callout>
        </ModalSection>
      )}
    </>
  );
}

// ─── Players & status ───────────────────────────────────────────────────────

/**
 * Per-player check-in and payment.
 *
 * The progress rail is clickable at every step, not just the next one — staff
 * routinely correct a mis-tap or jump a group straight to Finished after the fact,
 * so forcing a linear walk would be worse than allowing the jump.
 */
function PlayersTab({ booking: b }: { booking: Booking }) {
  const { dispatch, toast } = usePos();
  const states = b.playerStates ?? [];

  const paid = states.filter((p) => p.paid && !p.noShow).length;
  const unpaid = states.filter((p) => !p.paid && !p.noShow).length;
  const noShow = states.filter((p) => p.noShow).length;
  const checkedIn = states.filter((p) => p.step >= 0 && !p.noShow).length;

  const patchPlayer = (idx: number, patch: Partial<(typeof states)[number]>) =>
    dispatch({
      type: 'patchBooking',
      bookingId: b.id,
      patch: { playerStates: states.map((p, i) => (i === idx ? { ...p, ...patch } : p)) },
    });

  const patchAll = (patch: Partial<(typeof states)[number]>, msg: string) => {
    dispatch({
      type: 'patchBooking',
      bookingId: b.id,
      patch: { playerStates: states.map((p) => ({ ...p, ...patch })) },
    });
    toast(msg);
  };

  return (
    <>
      <Stack direction="row" gap={0.75} sx={{ mb: 2, flexWrap: 'wrap' }}>
        <Summary label="Checked in" value={`${checkedIn}/${b.players}`} color={md3.primary} />
        <Summary label="Paid" value={`${paid}`} color="#16a34a" />
        {unpaid > 0 && <Summary label="Unpaid" value={`${unpaid}`} color={md3.error} />}
        {noShow > 0 && <Summary label="No-show" value={`${noShow}`} color={md3.outline} />}
      </Stack>

      <Stack direction="row" gap={0.75} sx={{ mb: 2.25, flexWrap: 'wrap' }}>
        <OutlineButton onClick={() => patchAll({ step: 0, noShow: false }, 'All checked in')}>
          Check in all
        </OutlineButton>
        <OutlineButton onClick={() => patchAll({ paid: true }, 'All marked paid')}>
          Mark all paid
        </OutlineButton>
        <OutlineButton onClick={() => patchAll({ step: 4 }, 'Round complete')}>
          Mark finished
        </OutlineButton>
      </Stack>

      <Stack gap={1.25}>
        {states.map((p, i) => {
          const name = i === 0 ? b.name : b.guests?.[i]?.name || `Guest ${i + 1}`;
          const accent = playerAccents[i % playerAccents.length];
          const initials = name
            .split(/[,\s]+/)
            .filter(Boolean)
            .map((w) => w[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();

          return (
            <Box
              key={i}
              sx={{
                bgcolor: md3.surfaceContainer,
                borderRadius: `${radius.md}px`,
                p: '13px 14px',
                borderLeft: `3px solid ${accent}`,
                opacity: p.noShow ? 0.6 : 1,
              }}
            >
              <Stack direction="row" alignItems="center" gap={1.25}>
                <Box
                  sx={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    bgcolor: accent,
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {initials}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" alignItems="center" gap={0.5}>
                    <MemberDot name={name} size={7} />
                    <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{name}</Typography>
                  </Stack>
                  <Typography sx={{ fontSize: 11, color: md3.onSurfaceVariant }}>
                    {p.noShow ? 'No-show' : STATUS_STEPS[Math.min(Math.max(p.step, 0), 4)] ?? 'Pending'}
                    {p.step < 0 && !p.noShow ? ' · not arrived' : ''}
                  </Typography>
                </Box>
                <ButtonBase
                  onClick={() => patchPlayer(i, { paid: !p.paid })}
                  sx={{
                    px: 1.25,
                    py: 0.5,
                    borderRadius: `${radius.xl}px`,
                    border: `1.5px solid ${p.paid ? '#16a34a' : md3.outlineVariant}`,
                    bgcolor: p.paid ? '#dcfce7' : '#fff',
                    color: p.paid ? '#16a34a' : md3.onSurfaceVariant,
                    fontSize: 10,
                    fontWeight: 800,
                  }}
                >
                  {p.paid ? 'PAID' : 'UNPAID'}
                </ButtonBase>
                <ButtonBase
                  onClick={() => patchPlayer(i, { noShow: !p.noShow, step: -1 })}
                  title={p.noShow ? 'Undo no-show' : 'Mark no-show'}
                  sx={{ p: 0.5, borderRadius: '50%', color: p.noShow ? md3.error : md3.outline }}
                >
                  <Icon name="person_off" size={16} />
                </ButtonBase>
              </Stack>

              {!p.noShow && (
                <Stack direction="row" sx={{ mt: 1.25 }}>
                  {STATUS_STEPS.map((label, si) => {
                    const done = p.step > si;
                    const active = p.step === si;
                    return (
                      <Stack
                        key={label}
                        alignItems="center"
                        gap={0.5}
                        sx={{ flex: 1, position: 'relative' }}
                      >
                        {si < STATUS_STEPS.length - 1 && (
                          <Box
                            sx={{
                              position: 'absolute',
                              top: 13,
                              left: '50%',
                              right: '-50%',
                              height: 2,
                              bgcolor: done ? md3.primary : md3.outlineVariant,
                            }}
                          />
                        )}
                        <ButtonBase
                          onClick={() => patchPlayer(i, { step: si })}
                          sx={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            zIndex: 1,
                            border: `2px solid ${done ? md3.primary : active ? md3.onSurface : md3.outlineVariant}`,
                            bgcolor: done ? md3.primary : active ? md3.onSurface : md3.surfaceContainer,
                            color: done || active ? '#fff' : md3.onSurfaceVariant,
                            '&:hover': { borderColor: md3.primary },
                          }}
                        >
                          <Icon name={STATUS_STEP_ICONS[si]} size={14} />
                        </ButtonBase>
                        <Typography
                          sx={{
                            fontSize: 9,
                            fontWeight: 700,
                            color: active ? md3.onSurface : md3.outline,
                            textAlign: 'center',
                          }}
                        >
                          {label}
                        </Typography>
                      </Stack>
                    );
                  })}
                </Stack>
              )}
            </Box>
          );
        })}
      </Stack>
    </>
  );
}

function Summary({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      gap={0.625}
      sx={{
        px: 1.25,
        py: 0.625,
        borderRadius: `${radius.xl}px`,
        bgcolor: `${color}1a`,
        color,
        fontSize: 11,
        fontWeight: 700,
      }}
    >
      <Box component="span" sx={{ fontSize: 13, fontWeight: 800 }}>
        {value}
      </Box>
      {label}
    </Stack>
  );
}

// ─── Financial ──────────────────────────────────────────────────────────────

/** Per-player money: what each owes, and the refund / rain-check trail. */
function FinancialTab({ booking: b }: { booking: Booking }) {
  const { dispatch, toast } = usePos();
  const states = b.playerStates ?? [];
  const actions = b.financialActions ?? [];

  const log = (playerIdx: number, type: 'refund' | 'raincheck' | 'raincheck_all') => {
    const name =
      playerIdx === -1 ? 'Entire group' : playerIdx === 0 ? b.name : b.guests?.[playerIdx]?.name || `Player ${playerIdx + 1}`;
    const label = type === 'refund' ? 'Refund' : type === 'raincheck' ? 'Rain check' : 'Rain check (all)';
    dispatch({
      type: 'patchBooking',
      bookingId: b.id,
      patch: {
        financialActions: [
          ...actions,
          {
            time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
            label,
            player: name,
            type,
          },
        ],
        ...(type !== 'refund' ? { pay: 'rain_chk' as const } : { pay: 'refund' as const }),
      },
    });
    toast(`${label} · ${name}`);
  };

  const owed = states.filter((p) => !p.paid && !p.noShow).length * b.price;

  return (
    <>
      <ModalSection title="Balance">
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ p: '12px 14px', bgcolor: md3.surfaceContainer, borderRadius: `${radius.md}px` }}
        >
          <Box>
            <Typography sx={{ fontSize: 11, color: md3.onSurfaceVariant }}>Outstanding</Typography>
            <Typography sx={{ fontSize: 22, fontWeight: 800, color: owed > 0 ? md3.error : '#16a34a' }}>
              ${owed.toFixed(2)}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography sx={{ fontSize: 11, color: md3.onSurfaceVariant }}>Rate per player</Typography>
            <Typography sx={{ fontSize: 15, fontWeight: 700 }}>${b.price.toFixed(2)}</Typography>
          </Box>
        </Stack>
      </ModalSection>

      <ModalSection title="Per player">
        <Stack gap={0.75}>
          {states.map((p, i) => {
            const name = i === 0 ? b.name : b.guests?.[i]?.name || `Guest ${i + 1}`;
            const accent = playerAccents[i % playerAccents.length];
            return (
              <Stack
                key={i}
                direction="row"
                alignItems="center"
                gap={1}
                sx={{ p: '9px 12px', bgcolor: md3.surfaceContainer, borderRadius: `${radius.md}px` }}
              >
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: accent, flexShrink: 0 }} />
                <Typography sx={{ flex: 1, fontSize: 12.5, fontWeight: 600 }}>{name}</Typography>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: p.paid ? '#16a34a' : md3.error }}>
                  {p.noShow ? '—' : p.paid ? 'Paid' : `$${b.price.toFixed(2)}`}
                </Typography>
                <ButtonBase
                  onClick={() => log(i, 'refund')}
                  title="Refund this player"
                  sx={{ p: 0.5, borderRadius: '50%', color: md3.outline, '&:hover': { color: '#d97706' } }}
                >
                  <Icon name="reply" size={15} />
                </ButtonBase>
                <ButtonBase
                  onClick={() => log(i, 'raincheck')}
                  title="Rain check this player"
                  sx={{ p: 0.5, borderRadius: '50%', color: md3.outline, '&:hover': { color: '#2563eb' } }}
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
function NotesTab({ booking: b }: { booking: Booking }) {
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
            dispatch({ type: 'patchBooking', bookingId: b.id, patch: { tags: next } });
          }}
        />
      </ModalSection>

      <ModalSection title="Group note" hint="Shown on the tee sheet chip and the cart card">
        <Field multiline value={groupNote} onChange={setGroupNote} placeholder="Anything the starter or counter should know…" />
      </ModalSection>

      <ModalSection title="Player notes" hint="Surface at point of sale on that player's line">
        <Stack gap={1}>
          {Array.from({ length: b.players }, (_, i) => {
            const name = i === 0 ? b.name : b.guests?.[i]?.name || `Guest ${i + 1}`;
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
function ActivityTab({ booking: b }: { booking: Booking }) {
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
                  detail: `$${b.price.toFixed(2)} per player`,
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
