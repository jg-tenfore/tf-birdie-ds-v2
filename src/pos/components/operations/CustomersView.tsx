import { useMemo, useState } from 'react';
import { Box, ButtonBase, InputBase, Typography } from '@mui/material';
import { md3, radius } from '../../../theme/tokens';
import { DEMO_TODAY } from '../../data/bookings';
import { formatPhone, type Customer } from '../../data/customers';
import { rainCheckBalance } from '../../data/rain-checks';
import { liveCustomer, liveRoster } from '../../data/roster';
import { staffById } from '../../data/staff';
import { money } from '../../logic/cart';
import { accountHistory, cardExpired, customersOwing, findCustomers, isSpent, plainName, hasHouseAccount } from '../../logic/customer-search';
import { registerBusy } from '../../state/operations';
import { usePos } from '../../state/PosProvider';
import { Field, FilledButton, OutlineButton } from '../../modals/ModalFrame';
import { ToolbarButton } from '../TeeSheetView';
import { EmptyState, Icon, SectionLabel } from '../primitives';
import { Stack } from '../Stack';
import { CustomerChipRow, GoodForChips, SpentBadge } from './CustomerChips';
import { OpsScreen, OpsToolbar } from './OpsToolbar';

/**
 * Customer Search (V1 → V2, Wave 3) — find someone, see what they owe and hold, and send a balance
 * to the register.
 *
 * ## What v1 did
 *
 * `tf-birdie-ds-v1/app/src/screens/customer-search.tsx`, from `references/072926/11-customerSearch/`:
 * a centred heading over one underlined field and nothing else. Two characters dropped a results
 * sheet under the field; a result opened the record on a second route, whose bottom bar held Swipe
 * CC, Key CC, Pay on balance and Save.
 *
 * ## What was wrong with it
 *
 * - **The membership was part of the name.** "Weston Farnsworth - Couple Premium Membership" and
 *   "Weston Senior - Senior" read as two unrelated people; with households sharing phones, picking
 *   the wrong one was easy.
 * - **An empty screen until you typed.** Nothing to scan, not even who owes the course.
 * - **Look-up and take-money were one screen.** Swipe CC and Key CC sat on the record, so charging
 *   someone happened wherever you happened to find them, not at checkout with an order in front of
 *   you.
 *
 * ## What this does
 *
 * - **Search and record side by side**, so the query stays while you compare two Brennevins.
 * - **The name is the name.** Memberships and customer types are chips (`CustomerChipRow`).
 * - **Before you type**, the people created this session and the accounts with a balance.
 * - **The house account** — balance, this session's charges and payments — and **Pay balance**,
 *   which loads an untaxed account payment onto the register and goes there to check out.
 * - **Card on file is shown, not charged.** Charging it is a tender at checkout, like the house
 *   account: Justin's decision, so money is only ever taken against an order.
 * - **Gift cards as a list**, a spent one badged.
 */
export function CustomersView() {
  const { state, dispatch } = usePos();
  const [query, setQuery] = useState('');
  const roster = useMemo(() => liveRoster(state.customerEdits), [state.customerEdits]);
  const searching = query.trim().length >= 2;
  const results = useMemo(() => (searching ? findCustomers(query, roster) : []), [query, roster, searching]);
  const created = useMemo(() => roster.filter((c) => (c as Customer & { created?: boolean }).created).reverse(), [roster]);
  const owing = useMemo(() => customersOwing(roster), [roster]);
  const selected = liveCustomer(state.selectedCustomerId ?? undefined, state.customerEdits);

  const open = (id: string) => dispatch({ type: 'selectCustomer', customerId: id });

  return (
    <OpsScreen data-customers>
      <OpsToolbar
        title="Customer Search"
        actions={
          <ToolbarButton icon="person_add" label="New customer" onClick={() => dispatch({ type: 'openModal', modal: { kind: 'customerForm' } })} />
        }
      />
      <Box sx={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '400px 1fr' }}>
        {/* ── Search ── */}
        <Stack sx={{ minHeight: 0, borderRight: `1px solid ${md3.outlineVariant}`, bgcolor: '#fff' }}>
          <Box sx={{ p: '14px 16px 10px', flexShrink: 0 }}>
            <Stack
              direction="row"
              alignItems="center"
              gap={1}
              sx={{
                height: 48,
                px: 1.5,
                borderRadius: `${radius.xl}px`,
                border: `1.5px solid ${md3.outlineVariant}`,
                bgcolor: md3.surface,
                '&:focus-within': { borderColor: md3.primary },
              }}
            >
              <Icon name="search" size={18} color={md3.outline} />
              <InputBase
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Name, email, phone or customer ID"
                inputProps={{ 'aria-label': 'Search customers', 'data-customer-search': true }}
                sx={{ flex: 1, fontSize: 14 }}
              />
              {query && (
                <ButtonBase aria-label="Clear search" onClick={() => setQuery('')} sx={{ p: 0.5, borderRadius: '50%' }}>
                  <Icon name="close" size={16} color={md3.outline} />
                </ButtonBase>
              )}
            </Stack>
          </Box>

          <Box sx={{ flex: 1, overflowY: 'auto', pb: 2 }}>
            {searching ? (
              <>
                <ListHeading>{results.length === 0 ? 'No matches' : `${results.length}${results.length === 30 ? '+' : ''} matching “${query.trim()}”`}</ListHeading>
                {results.length === 0 ? (
                  <Stack gap={1.25} sx={{ px: 2, pt: 1 }} data-no-customers>
                    <Typography sx={{ fontSize: 13, color: md3.onSurfaceVariant }}>
                      Nobody on the roster matches. Check the spelling, try a phone number — or add them.
                    </Typography>
                    <Box>
                      <OutlineButton onClick={() => dispatch({ type: 'openModal', modal: { kind: 'customerForm', name: query.trim() } })}>
                        Add “{query.trim()}”
                      </OutlineButton>
                    </Box>
                  </Stack>
                ) : (
                  results.map((c) => <CustomerRow key={c.id} c={c} selected={c.id === selected?.id} onClick={() => open(c.id)} />)
                )}
              </>
            ) : (
              <>
                {created.length > 0 && (
                  <>
                    <ListHeading>Added this session</ListHeading>
                    {created.map((c) => (
                      <CustomerRow key={c.id} c={c} selected={c.id === selected?.id} onClick={() => open(c.id)} />
                    ))}
                  </>
                )}
                <ListHeading>Owe the course · {owing.length}</ListHeading>
                {owing.map((c) => (
                  <CustomerRow key={c.id} c={c} selected={c.id === selected?.id} onClick={() => open(c.id)} />
                ))}
              </>
            )}
          </Box>
        </Stack>

        {/* ── The open customer ── */}
        <Box sx={{ minHeight: 0, overflowY: 'auto' }}>
          {selected ? (
            <CustomerDetail key={selected.id} c={selected} />
          ) : (
            <EmptyState icon="person_search" label="Search for someone, or pick an account on the left" />
          )}
        </Box>
      </Box>
    </OpsScreen>
  );
}

function ListHeading({ children }: { children: React.ReactNode }) {
  return (
    <SectionLabel color={md3.outline} sx={{ px: 2, pt: 1.25, pb: 0.5 }}>
      {children}
    </SectionLabel>
  );
}

function CustomerRow({ c, selected, onClick }: { c: Customer; selected: boolean; onClick: () => void }) {
  return (
    <ButtonBase
      data-customer-row={c.id}
      aria-pressed={selected}
      onClick={onClick}
      sx={{
        display: 'flex',
        width: '100%',
        minHeight: 64,
        px: 2,
        py: 1,
        gap: 1.25,
        textAlign: 'left',
        justifyContent: 'flex-start',
        alignItems: 'center',
        borderBottom: `1px solid ${md3.surfaceContainer}`,
        bgcolor: selected ? md3.primaryContainer : '#fff',
        '&:hover': { bgcolor: selected ? md3.primaryContainer : md3.surface },
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" alignItems="center" gap={0.75} sx={{ minWidth: 0 }}>
          <Typography noWrap data-customer-name sx={{ fontSize: 14, fontWeight: 700, flexShrink: 1, minWidth: 0 }}>
            {plainName(c)}
          </Typography>
          <CustomerChipRow customer={c} max={2} />
        </Stack>
        <Typography noWrap sx={{ fontSize: 12, color: md3.onSurfaceVariant, mt: '2px' }}>
          {[c.email, formatPhone(c.phone)].filter(Boolean).join(' · ') || 'No contact details'}
        </Typography>
      </Box>
      {c.balance > 0 && (
        <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
          <Typography sx={{ fontSize: 10.5, color: md3.onSurfaceVariant, fontWeight: 700 }}>OWES</Typography>
          <Typography sx={{ fontSize: 13, fontWeight: 800, color: md3.error }}>{money(c.balance)}</Typography>
        </Box>
      )}
    </ButtonBase>
  );
}

// ─── The open customer ──────────────────────────────────────────────────────

function CustomerDetail({ c }: { c: Customer }) {
  const { state, dispatch, toast } = usePos();
  const giftBalance = c.giftCards.reduce((s, g) => s + Math.max(0, g.balance), 0);
  const history = accountHistory(state.accountEntries, c.id);

  return (
    <Stack data-customer-detail={c.id} gap={2} sx={{ p: '18px 22px 28px' }}>
      {/* Header: the name, what they are entitled to, and how to change the record. */}
      <Stack direction="row" alignItems="flex-start" gap={1.5}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" alignItems="center" gap={1} sx={{ flexWrap: 'wrap' }}>
            <Typography component="h2" sx={{ fontSize: 22, fontWeight: 800 }}>
              {plainName(c)}
            </Typography>
            <CustomerChipRow customer={c} max={6} />
          </Stack>
          <Typography sx={{ fontSize: 12, color: md3.onSurfaceVariant, mt: 0.25 }}>
            Customer ID {c.id} · Course ID {c.courseId}
          </Typography>
        </Box>
        <OutlineButton onClick={() => dispatch({ type: 'openModal', modal: { kind: 'customerForm', id: c.id } })}>Edit details</OutlineButton>
        {/* The whole record — rain checks, rounds, ID — is the customer modal the rest of the POS opens. */}
        <OutlineButton onClick={() => dispatch({ type: 'openCustomerModal', customerId: c.id })}>Full record</OutlineButton>
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
        <Stat label="House account" value={money(c.balance)} alert={c.balance > 0} sub={c.balance > 0 ? 'owed to the course' : 'nothing owed'} />
        <Stat label="Gift cards" value={money(giftBalance)} sub={`${c.giftCards.length} card${c.giftCards.length === 1 ? '' : 's'}`} />
        <Stat label="Rain checks" value={money(rainCheckBalance(c.id))} />
        <Stat label="Rounds" value={String(c.teeTimes.length)} />
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, alignItems: 'start' }}>
        <Stack gap={2}>
          <HouseAccount c={c} history={history} cartBusy={registerBusy(state)} onPay={(amount) => {
            dispatch({ type: 'payAccount', customerId: c.id, amount });
            // `payAccount` loads the line and opens the register with its rail out; checkout is one tap.
            dispatch({ type: 'setView', view: 'pos' });
            toast(`Account payment · ${money(amount)} on the register`);
          }} />
          <CardOnFile c={c} />
        </Stack>
        <Stack gap={2}>
          <Panel title="Gift cards" icon="card_giftcard">
            {c.giftCards.length === 0 ? (
              <Muted>No gift cards.</Muted>
            ) : (
              c.giftCards.map((g) => (
                <Stack key={g.id} data-customer-gift-card={g.id} direction="row" alignItems="center" gap={1} sx={{ py: 1, borderBottom: `1px solid ${md3.surfaceContainer}`, '&:last-of-type': { borderBottom: 'none' } }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" alignItems="center" gap={0.75}>
                      <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                        {g.type} · #{g.id}
                      </Typography>
                      {isSpent(g) && <SpentBadge />}
                    </Stack>
                    <Box sx={{ mt: 0.5 }}>
                      <GoodForChips card={g} />
                    </Box>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 800, color: isSpent(g) ? md3.outline : md3.onSurface }}>{money(g.balance)}</Typography>
                    <Typography sx={{ fontSize: 11, color: md3.onSurfaceVariant }}>of {money(g.awarded)}</Typography>
                  </Box>
                </Stack>
              ))
            )}
          </Panel>
          <Panel title="Contact" icon="person">
            <Line icon="mail">{c.email || <Muted inline>No email</Muted>}</Line>
            <Line icon="phone">{c.phone ? formatPhone(c.phone) : <Muted inline>No phone</Muted>}</Line>
            {c.birthday && <Line icon="cake">{c.birthday}</Line>}
            {c.notes && <Line icon="notes">{c.notes}</Line>}
          </Panel>
        </Stack>
      </Box>
    </Stack>
  );
}

/**
 * The house account: what is owed, how it moved this session, and paying it off.
 *
 * Paying loads the balance (or part of it) onto the register as an account-payment line — no tax, a
 * gift card can't pay it — and takes you there. It is refused while the register holds another
 * order, because the two would be checked out as one.
 */
function HouseAccount({
  c,
  history,
  cartBusy,
  onPay,
}: {
  c: Customer;
  history: ReturnType<typeof accountHistory>;
  cartBusy: boolean;
  onPay: (amount: number) => void;
}) {
  const { state } = usePos();
  const [amount, setAmount] = useState(c.balance > 0 ? c.balance.toFixed(2) : '');
  // Members only (Justin's call): the account follows the membership.
  const member = hasHouseAccount(c, DEMO_TODAY());
  const value = Math.round((Number(amount) || 0) * 100) / 100;
  const problem =
    c.balance <= 0
      ? 'Nothing is owed on this account.'
      : cartBusy
        ? 'The register has an order on it. Finish or clear it first, then pay the balance.'
        : !(value > 0)
          ? 'Enter how much they are paying.'
          : value > c.balance
            ? `The most they can pay is the balance, ${money(c.balance)}.`
            : null;

  return (
    <Panel title="House account" icon="account_balance" data-house-account={c.id}>
      <Stack direction="row" alignItems="baseline" justifyContent="space-between">
        <Typography sx={{ fontSize: 12, color: md3.onSurfaceVariant }}>Balance</Typography>
        <Typography data-account-balance sx={{ fontSize: 22, fontWeight: 800, color: c.balance > 0 ? md3.error : md3.onSurface }}>
          {money(c.balance)}
        </Typography>
      </Stack>
      <Typography sx={{ fontSize: 11.5, color: md3.onSurfaceVariant, mb: 1.25 }} data-house-account-status={member ? 'open' : 'none'}>
        {member
          ? 'Charges come from checkout, where House account is a tender. A positive balance is money owed to the course.'
          : c.balance > 0
            ? 'No current membership, so nothing new can be charged — the balance can still be paid off.'
            : 'House accounts come with a membership. Without one there is nothing to charge to.'}
      </Typography>

      {c.balance > 0 && (
        <Stack direction="row" alignItems="flex-end" gap={1} sx={{ mb: 1 }}>
          <Box sx={{ width: 140 }}>
            <Field label="Paying" prefix="$" type="number" value={amount} onChange={setAmount} />
          </Box>
          <Box data-pay-balance sx={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
            <FilledButton disabled={Boolean(problem)} onClick={() => onPay(value)}>
              {value >= c.balance ? 'Pay balance' : `Pay ${money(value)}`}
            </FilledButton>
          </Box>
        </Stack>
      )}
      {problem && c.balance > 0 && (
        <Typography data-pay-balance-problem sx={{ fontSize: 12, color: cartBusy ? md3.error : md3.onSurfaceVariant, fontWeight: 600, mb: 1 }}>
          {problem}
        </Typography>
      )}

      <SectionLabel color={md3.outline} sx={{ mt: 0.5 }}>
        This session
      </SectionLabel>
      {history.length === 0 ? (
        <Muted>No charges or payments yet.</Muted>
      ) : (
        history.map((e) => (
          <Stack key={e.id} data-account-entry={e.kind} direction="row" alignItems="baseline" gap={1} sx={{ py: 0.5, fontSize: 12.5 }}>
            <Typography sx={{ fontSize: 12, color: md3.onSurfaceVariant, width: 64, flexShrink: 0 }}>{e.time}</Typography>
            <Typography sx={{ fontSize: 12.5, flex: 1, minWidth: 0 }} noWrap>
              {e.kind === 'charge' ? 'Charged' : e.kind === 'payment' ? 'Paid' : 'Refunded'}
              {e.orderNumber ? ` · ${e.orderNumber}` : ''}
              {` · ${staffById(e.staffId, state.staffRoster)?.short ?? e.staffId}`}
            </Typography>
            <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: e.kind === 'charge' ? md3.error : '#16a34a' }}>
              {e.kind === 'charge' ? '+' : '−'}
              {money(e.amount)}
            </Typography>
          </Stack>
        ))
      )}
    </Panel>
  );
}

function CardOnFile({ c }: { c: Customer }) {
  const expired = cardExpired(c.cardExpires, DEMO_TODAY());
  return (
    <Panel title="Card on file" icon="credit_score" data-card-on-file={c.cardOnFile ?? 'none'}>
      {c.cardOnFile ? (
        <>
          <Stack direction="row" alignItems="center" gap={1}>
            <Icon name="credit_card" size={20} color={md3.onSurfaceVariant} />
            <Typography sx={{ fontSize: 15, fontWeight: 700 }}>•••• {c.cardOnFile}</Typography>
            {c.cardExpires && (
              <Typography sx={{ fontSize: 12, color: expired ? md3.error : md3.onSurfaceVariant, fontWeight: expired ? 700 : 400 }}>
                {expired ? `Expired ${c.cardExpires}` : `Expires ${c.cardExpires}`}
              </Typography>
            )}
          </Stack>
          <Typography sx={{ fontSize: 11.5, color: md3.onSurfaceVariant, mt: 0.75 }}>
            Charged at checkout — pick Card on file as the tender.
          </Typography>
        </>
      ) : (
        <Muted>No card on file.</Muted>
      )}
    </Panel>
  );
}

// ─── Pieces ─────────────────────────────────────────────────────────────────

function Panel({ title, icon, children, ...rest }: { title: string; icon: string; children: React.ReactNode } & Record<`data-${string}`, string>) {
  return (
    <Box {...rest} sx={{ border: `1px solid ${md3.outlineVariant}`, borderRadius: `${radius.md}px`, bgcolor: '#fff', p: '12px 14px' }}>
      <Stack direction="row" alignItems="center" gap={0.75} sx={{ mb: 1 }}>
        <Icon name={icon} size={16} color={md3.onSurfaceVariant} />
        <Typography sx={{ fontSize: 13, fontWeight: 800 }}>{title}</Typography>
      </Stack>
      {children}
    </Box>
  );
}

function Stat({ label, value, sub, alert }: { label: string; value: string; sub?: string; alert?: boolean }) {
  return (
    <Box data-stat={label} sx={{ p: '10px 12px', borderRadius: `${radius.md}px`, bgcolor: md3.surfaceContainer }}>
      <Typography sx={{ fontSize: 11, fontWeight: 700, color: md3.onSurfaceVariant }}>{label}</Typography>
      <Typography sx={{ fontSize: 18, fontWeight: 800, color: alert ? md3.error : md3.onSurface }}>{value}</Typography>
      {sub && <Typography sx={{ fontSize: 10.5, color: md3.onSurfaceVariant }}>{sub}</Typography>}
    </Box>
  );
}

function Line({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <Stack direction="row" alignItems="flex-start" gap={1} sx={{ py: 0.5 }}>
      <Icon name={icon} size={15} color={md3.outline} sx={{ mt: '2px' }} />
      <Typography component="div" sx={{ fontSize: 13, minWidth: 0, overflowWrap: 'anywhere' }}>
        {children}
      </Typography>
    </Stack>
  );
}

function Muted({ children, inline }: { children: React.ReactNode; inline?: boolean }) {
  return (
    <Typography component={inline ? 'span' : 'p'} sx={{ fontSize: 12.5, color: md3.onSurfaceVariant, py: inline ? 0 : 0.5 }}>
      {children}
    </Typography>
  );
}
