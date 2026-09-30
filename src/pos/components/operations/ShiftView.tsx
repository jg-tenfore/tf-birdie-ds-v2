import type { ReactNode } from 'react';
import { Box, Typography } from '@mui/material';
import { md3, radius } from '../../../theme/tokens';
import { staffById } from '../../data/staff';
import type { Shift } from '../../data/staff-seed';
import { money } from '../../logic/cart';
import { shiftEvents } from '../../logic/drawer';
import { drawerWorkings, variance } from '../../logic/shift';
import { shortDate } from '../../logic/staff-hours';
import { payoutReasonLabel } from '../../logic/register-extras';
import { usePos } from '../../state/PosProvider';
import { EmptyState, Icon } from '../primitives';
import { Stack } from '../Stack';
import { OpsScreen, OpsToolbar } from './OpsToolbar';
import { DataTable, PanelHeading, Td, ToolbarPrimary, ToolbarSecondary, VarianceText } from './OpsParts';

/**
 * Shift (V1 → V2, Wave 3) — the cash drawer: open it, drop cash to the safe, close it, and look back.
 *
 * ## What v1 did
 *
 * `tf-birdie-ds-v1/app/src/screens/shift.tsx`, from `references/072926/17-shift/`: the operator's
 * name and the shift's start time, two fields — Ending Cash Total, Ending Check Total — and a history
 * table beside them. A bottom bar of BACK and END SHIFT. The cash drop lived somewhere else entirely,
 * in Orders & Tips' bottom bar.
 *
 * ## What was wrong with it
 *
 * - **Nothing said what the drawer should hold.** The operator keyed a count and trusted that
 *   somebody, somewhere, would compare it with something.
 * - **The history table was wider than its pane**, with nothing to scroll it: the last column was
 *   cut off mid-word ("End Checl"). The check total you were reconciling against was the one column
 *   you could not read. And it had no variance column at all, so a short drawer looked like any other.
 * - **The app bar had no nav, no account, no LOG OUT** — the only way off the screen was BACK.
 * - Closing was the only drawer action. Opening a drawer with a float, or dropping cash mid-shift,
 *   was not on the screen that owns the drawer.
 *
 * ## What this does
 *
 * - **The expected cash, with its workings**: start cash + cash in (tips included) − cash refunds −
 *   payouts − drops = expected. Each line is its own figure, derived from the payments and the drawer
 *   events, never stored — so the number at close cannot disagree with what happened.
 * - **The drawer's events**: every payout (Wave 1's Cash payout) and every drop, with who and why.
 * - **Cash drop, Close shift, Open shift** in the toolbar, where every screen's actions are. The
 *   standard toolbar keeps the main nav, so this screen is left the way every other is.
 * - **History that fits**: expected, counted and the **variance**, coloured over or short, with the
 *   check count and the note — no column cut off at the tablet's width.
 */
export function ShiftView() {
  const { state, dispatch } = usePos();
  const shift = state.drawerShift;
  const open = (kind: 'shiftOpen' | 'shiftClose' | 'cashDrop') => dispatch({ type: 'openModal', modal: { kind } });

  return (
    <OpsScreen data-shift>
      <OpsToolbar
        title="Shift"
        actions={
          shift ? (
            <>
              <ToolbarSecondary icon="savings" label="Cash drop" onClick={() => open('cashDrop')} />
              <ToolbarPrimary icon="point_of_sale" label="Close shift" onClick={() => open('shiftClose')} />
            </>
          ) : (
            <ToolbarPrimary icon="lock_open" label="Open shift" onClick={() => open('shiftOpen')} />
          )
        }
      >
        <Typography sx={{ fontSize: 13, color: md3.onSurfaceVariant, whiteSpace: 'nowrap' }} data-drawer-status={shift ? 'open' : 'closed'}>
          {shift ? (
            <>
              Drawer <b>{shift.id}</b> open since {shift.openedAt} · {staffById(shift.staffId, state.staffRoster)?.name}
            </>
          ) : (
            'No drawer open'
          )}
        </Typography>
      </OpsToolbar>

      <Box sx={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '400px 1fr' }}>
        <Box sx={{ overflowY: 'auto', p: '14px 16px', bgcolor: '#fff', borderRight: `1px solid ${md3.outlineVariant}` }}>
          {shift ? <OpenDrawer shift={shift} /> : <NoDrawer onOpen={() => open('shiftOpen')} last={state.drawerHistory[0]} />}
        </Box>

        <Box sx={{ overflowY: 'auto', p: '14px 18px 24px', minWidth: 0 }} data-shift-history>
          <PanelHeading aside={`${state.drawerHistory.length} closed`}>History</PanelHeading>
          <History shifts={state.drawerHistory} />
        </Box>
      </Box>
    </OpsScreen>
  );
}

function OpenDrawer({ shift }: { shift: Shift }) {
  const { state } = usePos();
  const w = drawerWorkings(shift, state.payments, state.drawerEvents);
  const events = shiftEvents(shift, state.drawerEvents);
  const payouts = events.filter((e) => e.kind === 'payout').length;
  const drops = events.filter((e) => e.kind === 'drop').length;

  return (
    <>
      <PanelHeading aside={`${shortDate(shift.date)}, from ${shift.openedAt}`}>Expected in the drawer</PanelHeading>
      <Box data-drawer-workings sx={{ borderRadius: `${radius.md}px`, border: `1px solid ${md3.outlineVariant}`, overflow: 'hidden' }}>
        <Working k="startCash" label="Start cash" note="The float counted in at open" value={w.startCash} />
        <Working k="cashIn" label="Cash in" note="Cash sales, cash tips included" value={w.cashIn} sign="+" />
        <Working k="cashRefunds" label="Cash refunds" note="Handed back over the counter" value={w.cashRefunds} sign="−" />
        <Working k="payouts" label="Payouts" note={`${payouts} paid out of the drawer`} value={w.payouts} sign="−" />
        <Working k="drops" label="Drops" note={`${drops} sent to the safe`} value={w.drops} sign="−" />
        <Stack direction="row" alignItems="center" data-working="expected" sx={{ px: 1.5, py: 1.5, bgcolor: md3.primaryContainer }}>
          <Typography sx={{ fontSize: 14, fontWeight: 800, color: md3.onPrimaryContainer, flex: 1 }}>Expected cash</Typography>
          <Typography sx={{ fontSize: 22, fontWeight: 800, color: md3.onPrimaryContainer, fontVariantNumeric: 'tabular-nums' }} data-expected>
            {money(w.expected)}
          </Typography>
        </Stack>
        {/* Checks are counted apart from cash, against the checks taken this shift. */}
        <Stack direction="row" alignItems="center" data-working="checks" sx={{ px: 1.5, py: 1.125, borderTop: `1px solid ${md3.surfaceHigh}` }}>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700 }}>Expected checks</Typography>
            <Typography sx={{ fontSize: 11.5, color: md3.onSurfaceVariant }}>Checks taken, counted apart from the cash</Typography>
          </Box>
          <Typography sx={{ fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }} data-expected-checks>
            {money(w.checks)}
          </Typography>
        </Stack>
      </Box>
      <Typography sx={{ fontSize: 11.5, color: md3.onSurfaceVariant, mt: 1, lineHeight: 1.5 }}>
        Worked out from this shift's payments and drawer events — nothing to key in until you count at close.
      </Typography>

      <PanelHeading sx={{ mt: 3 }} aside={events.length ? `${events.length}` : undefined}>
        Drawer events
      </PanelHeading>
      {events.length === 0 ? (
        <Typography sx={{ fontSize: 13, color: md3.onSurfaceVariant }} data-no-drawer-events>
          No payouts or drops on this shift yet.
        </Typography>
      ) : (
        events
          .slice()
          .reverse()
          .map((e) => (
            <Stack key={e.id} direction="row" gap={1.25} alignItems="flex-start" data-drawer-event={e.id} sx={{ py: 1, borderTop: `1px solid ${md3.surfaceHigh}` }}>
              <Icon name={e.kind === 'drop' ? 'savings' : 'local_atm'} size={18} color={md3.onSurfaceVariant} sx={{ mt: '2px' }} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                  {e.kind === 'drop' ? 'Cash drop' : `Payout · ${e.reason ? payoutReasonLabel(e.reason) : 'Other'}`}
                </Typography>
                <Typography sx={{ fontSize: 11.5, color: md3.onSurfaceVariant }}>
                  {e.time} · {staffById(e.operator, state.staffRoster)?.short ?? 'Unknown'}
                  {e.recipient ? ` · to ${e.recipient}` : ''}
                  {e.note ? ` · ${e.note}` : ''}
                </Typography>
              </Box>
              <Typography sx={{ fontSize: 13.5, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{money(-e.amount)}</Typography>
            </Stack>
          ))
      )}
    </>
  );
}

function Working({ k, label, note, value, sign }: { k: string; label: string; note: string; value: number; sign?: '+' | '−' }) {
  return (
    <Stack direction="row" alignItems="center" data-working={k} sx={{ px: 1.5, py: 1.125, borderBottom: `1px solid ${md3.surfaceHigh}` }}>
      <Typography sx={{ width: 16, fontSize: 15, fontWeight: 800, color: md3.onSurfaceVariant }}>{sign}</Typography>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>{label}</Typography>
        <Typography sx={{ fontSize: 11, color: md3.onSurfaceVariant }}>{note}</Typography>
      </Box>
      <Typography sx={{ fontSize: 14.5, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }} data-amount>
        {money(value)}
      </Typography>
    </Stack>
  );
}

function NoDrawer({ onOpen, last }: { onOpen: () => void; last?: Shift }) {
  return (
    <Stack gap={2} data-no-drawer sx={{ pt: 4 }}>
      <EmptyState icon="point_of_sale" label="No drawer is open" sx={{ height: 'auto' }} />
      <Typography sx={{ fontSize: 13, color: md3.onSurfaceVariant, textAlign: 'center', lineHeight: 1.5 }}>
        Count the float into the drawer and open a shift to take cash.
        {last && ` The last shift, ${last.id}, closed at ${last.closedAt}.`}
      </Typography>
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <ToolbarPrimary icon="lock_open" label="Open shift" onClick={onOpen} />
      </Box>
    </Stack>
  );
}

function History({ shifts }: { shifts: Shift[] }) {
  if (shifts.length === 0) return <Typography sx={{ fontSize: 13, color: md3.onSurfaceVariant }}>No closed shifts yet.</Typography>;
  return (
    <DataTable
      data-history-table
      columns={[
        { label: 'Shift' },
        { label: 'Hours' },
        { label: 'By' },
        { label: 'Start', align: 'right' },
        { label: 'Expected', align: 'right' },
        { label: 'Counted', align: 'right' },
        { label: 'Variance', align: 'right' },
        { label: 'Checks', align: 'right' },
      ]}
    >
      {shifts.map((s) => {
        const v = variance(s.countedCash ?? 0, s.expectedCash ?? 0);
        return <HistoryRow key={s.id} s={s} v={v} />;
      })}
    </DataTable>
  );
}

function HistoryRow({ s, v }: { s: Shift; v: number }) {
  const { state } = usePos();
  const num = { fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' } as const;
  const noteless = { borderBottom: s.note ? 'none' : undefined };
  const cell = (children: ReactNode, align?: 'right', extra?: object) => (
    <Td align={align} sx={{ ...noteless, ...extra }}>
      {children}
    </Td>
  );
  return (
    <>
      <Box component="tr" data-shift-row={s.id}>
        {cell(
          <>
            <Box sx={{ fontWeight: 800 }}>{s.id}</Box>
            <Box sx={{ fontSize: 11.5, color: md3.onSurfaceVariant, whiteSpace: 'nowrap' }}>{shortDate(s.date)}</Box>
          </>,
        )}
        {cell(
          <Box sx={{ whiteSpace: 'nowrap' }}>
            {s.openedAt} – {s.closedAt}
          </Box>,
        )}
        {cell(staffById(s.staffId, state.staffRoster)?.short ?? s.staffId, undefined, { whiteSpace: 'nowrap' })}
        {cell(money(s.startCash), 'right', num)}
        {cell(money(s.expectedCash ?? 0), 'right', num)}
        {cell(money(s.countedCash ?? 0), 'right', { ...num, fontWeight: 700 })}
        {cell(<VarianceText value={v} pill />, 'right')}
        {cell(
          <>
            <Box>{money(s.countedChecks ?? 0)}</Box>
            {/* Shifts before checks were a tender have nothing to hold the count against. */}
            {s.expectedChecks != null && s.countedChecks !== s.expectedChecks && (
              <Box sx={{ fontSize: 11.5 }} data-check-variance>
                <VarianceText value={variance(s.countedChecks ?? 0, s.expectedChecks)} />
              </Box>
            )}
          </>,
          'right',
          num,
        )}
      </Box>
      {s.note && (
        <Box component="tr" data-shift-note={s.id}>
          <Td colSpan={8} sx={{ pt: 0, fontSize: 12, color: md3.onSurfaceVariant }}>
            <Icon name="notes" size={14} sx={{ verticalAlign: 'text-bottom', mr: 0.5 }} />
            {s.note}
          </Td>
        </Box>
      )}
    </>
  );
}
