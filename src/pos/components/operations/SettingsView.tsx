import { Fragment, useState, type ReactNode } from 'react';
import { Box, ButtonBase, Switch, Typography } from '@mui/material';
import { md3, radius } from '../../../theme/tokens';
import { demoNow } from '../../data/bookings';
import { APP_IDENTITY } from '../../data/nav';
import { SPEND_CATEGORIES, type SpendCategory } from '../../data/spend';
import { staffById } from '../../data/staff';
import { usePos } from '../../state/PosProvider';
import {
  BIRDIE_DEFAULTS,
  BUCK_ONLY_PAYMENT_TYPES,
  CART_SIGN_OUT_DISCLAIMER,
  CREDIT_EXPIRATIONS,
  MAIN_INFO,
  PAYMENT_OPTIONS,
  PAYMENT_TYPES,
  POS_OPTIONS,
  PRINTERS,
  RESTAURANT_RECEIPT_TAG,
  SERVICE_CHARGES,
  TABLETS,
  TAX_RATE_FIELDS,
  THIS_TABLET,
  TRANSPORTATION_TYPES,
  buckPath,
  taxTypeLabel,
  type BuckSection,
} from '../../data/buck-club';
import { TRANSPORT_RATES } from '../../data/rate-catalog';
import { money } from '../../logic/cart';
import { taxRateOf } from '../../state/operations';
import {
  HARDWARE_OPTIONS,
  ROLE_NAMES,
  TENDER_NAMES,
  canManageStaff,
  checkoutProblem,
  isBuckSection,
  type CheckoutSettings,
  type SettingsSection,
  type TerminalHardware,
} from '../../state/settings';
import { Callout, Field, FilledButton, OutlineButton, PillGroup, SelectField } from '../../modals/ModalFrame';
import { TeeSheetSettingsBody } from '../TeeSheetSettingsPanel';
import { Icon } from '../primitives';
import { Stack } from '../Stack';
import { DataTable, PanelHeading, Td } from './OpsParts';
import { OpsScreen, OpsToolbar } from './OpsToolbar';

/**
 * Settings (V1 → V2; aligned with TF Buck on Nov 26).
 *
 * ## What v1 did
 *
 * Nothing: v1's Settings tile opened a stub — "Terminal and hardware configuration." — and never
 * became more. Weston Edits pointed the tile at the tee sheet's display settings, the one piece of
 * configuration the prototype had.
 *
 * ## What this does
 *
 * Splits the list by **who owns the setting**, because the question a counter asks of a setting is
 * "can I change this here, or do I call the office?".
 *
 * **Editable here** — led by Birdie's real sections, as Weston laid them out: *"We have device info.
 * We have connecting to a reader. Then we have Clover settings that I don't think we really use much
 * anymore… This is a good layout. We would just add those settings here."*
 *
 * - **Device info** — the facility, account, app version and device, the register's name, its Buck
 *   tablet number, its card reader and when it last synced; and a copy for support. Where Settings
 *   opens.
 * - **Card reader** — the reader this register is connected to, its battery and firmware, Disconnect,
 *   and the readers nearby. It is the same `hardware.cardReader` Register & printers edits.
 * - **Clover** — flagged *Rarely used*: kept, with a few switches, until we decide to drop it.
 * - **Tee sheet** — the tee sheet's own display settings, given a second home. These are live.
 * - **Register & printers** — the register's name, which of the **club's printers** (Buck's Printers,
 *   by Buck's uses: Pro Shop Printer, Service Printer) it prints to, its cash drawer, and whether a
 *   receipt prints after a sale.
 * - **Tips & gift cards** — the tip suggestions and what a new gift card is good for. Buck has no field
 *   for either yet, so they are marked *Not in Buck*.
 * - **Staff & PINs** — who can sign in, their role and PIN. **Managers only**: anyone else reads it.
 *
 * **Set in Buck** — read-only here, under Buck's own Course Settings section and group names, each
 * saying where in Buck it is changed (`data/buck-club.ts`):
 *
 * - **Birdie** — Defaults, Point of Sale Options, Receipt Text.
 * - **Taxes & Fees** — the tax rate each kind of line is charged, service charges.
 * - **Payments** — the payment types checkout offers as tenders, and payment options.
 * - **Transportation Types**, **Printers & Tablets**, **Main Info** (receipt header, credit expiries).
 *
 * **Still wired** (Justin's call): checkout charges the tax rate, offers the tenders that are on and
 * the tip suggestions, prints the receipt text on the reader's done step as "Receipts after a sale"
 * says, and starts new gift cards from the default; the register header shows the register's name;
 * and the PIN pad, Time Clock and server pickers read the staff list. What moved is *where they are
 * changed*: tax, tenders and receipt text are Buck's now, so the counter shows them rather than edits
 * them. A Buck option the prototype does not act on says "Shown only", so nobody reads it as a
 * promise. The hardware stays simulated — a test, a connect, a copy is a toast.
 *
 * Each editable section saves as a whole — Save and Discard under it, and who saved it last — rather
 * than on every keystroke, because a half-typed setting is not a setting anyone meant.
 */
const SECTIONS: { key: SettingsSection; label: string; icon: string; blurb: string; tag?: string }[] = [
  { key: 'device', label: 'Device info', icon: 'info', blurb: 'This tablet, the app, the account' },
  { key: 'reader', label: 'Card reader', icon: 'contactless', blurb: 'Connect and test the reader' },
  { key: 'clover', label: 'Clover', icon: 'point_of_sale', blurb: 'Rarely used' },
  { key: 'teesheet', label: 'Tee sheet', icon: 'golf_course', blurb: 'Density, grid, behaviour' },
  { key: 'hardware', label: 'Register & printers', icon: 'point_of_sale', blurb: 'Name, printers, cash drawer' },
  { key: 'checkout', label: 'Tips & gift cards', icon: 'redeem', blurb: 'Tip suggestions, new-card default', tag: 'Not in Buck' },
  { key: 'staff', label: 'Staff & PINs', icon: 'badge', blurb: 'Who signs in — managers edit' },
  { key: 'birdie', label: 'Birdie', icon: 'tune', blurb: 'Defaults, POS options, receipt text' },
  { key: 'taxes', label: 'Taxes & Fees', icon: 'paid', blurb: 'Tax rates, service charges' },
  { key: 'payments', label: 'Payments', icon: 'payments', blurb: 'What checkout can take' },
  { key: 'transport', label: 'Transportation Types', icon: 'directions_car', blurb: 'Cart, walk, push cart' },
  { key: 'printers', label: 'Printers & Tablets', icon: 'print', blurb: "The club's printers and tablets" },
  { key: 'maininfo', label: 'Main Info', icon: 'storefront', blurb: 'Receipt header, credit expiries' },
];
const FIRST_BUCK = SECTIONS.findIndex((s) => isBuckSection(s.key));

export function SettingsView() {
  const { state, dispatch } = usePos();
  const section = state.settingsSection;
  return (
    <OpsScreen data-settings>
      <OpsToolbar title="Settings" />
      <Stack direction="row" sx={{ flex: 1, minHeight: 0 }}>
        <Box component="nav" aria-label="Settings sections" sx={{ width: 250, flexShrink: 0, borderRight: `1px solid ${md3.outlineVariant}`, p: 1.25, bgcolor: '#fff', overflowY: 'auto' }}>
          <NavHeading data-settings-local-heading>Editable here</NavHeading>
          {SECTIONS.map((s, i) => {
            const on = s.key === section;
            const buck = isBuckSection(s.key);
            return (
              <Fragment key={s.key}>
                {i === FIRST_BUCK && (
                  <NavHeading data-settings-buck-heading icon="lock">
                    Set in Buck · read-only here
                  </NavHeading>
                )}
                <ButtonBase
                  data-settings-section={s.key}
                  data-set-in-buck={buck ? true : undefined}
                  aria-current={on ? 'page' : undefined}
                  onClick={() => dispatch({ type: 'setSettingsSection', section: s.key })}
                  sx={{
                    width: '100%',
                    justifyContent: 'flex-start',
                    gap: 1.25,
                    p: buck ? '7px 12px' : '10px 12px',
                    mb: 0.5,
                    borderRadius: `${radius.md}px`,
                    textAlign: 'left',
                    bgcolor: on ? md3.primaryContainer : 'transparent',
                    color: on ? md3.onPrimaryContainer : md3.onSurface,
                    '&:hover': { bgcolor: on ? md3.primaryContainer : md3.surfaceContainer },
                  }}
                >
                  <Icon name={s.icon} size={20} color={on ? md3.onPrimaryContainer : md3.onSurfaceVariant} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>{s.label}</Typography>
                    <Typography sx={{ fontSize: 11.5, color: on ? md3.onPrimaryContainer : md3.onSurfaceVariant }}>{s.blurb}</Typography>
                    {/* Under the blurb, not beside the label: beside it, a long label wraps. */}
                    {s.tag && (
                      <Box sx={{ mt: 0.5 }}>
                        <StatusChip label={s.tag} tone="muted" icon="hourglass_empty" />
                      </Box>
                    )}
                  </Box>
                </ButtonBase>
              </Fragment>
            );
          })}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0, overflowY: 'auto', p: '20px 28px' }}>
          {/* Keyed, so switching section starts a fresh draft of the one opened. */}
          {section === 'device' && <DeviceSection />}
          {section === 'reader' && <ReaderSection />}
          {section === 'clover' && <CloverSection />}
          {section === 'teesheet' && <TeeSheetSection />}
          {section === 'hardware' && <HardwareSection key="hardware" />}
          {section === 'checkout' && <CheckoutSection key="checkout" />}
          {section === 'staff' && <StaffSection />}
          {section === 'birdie' && <BuckBirdieSection />}
          {section === 'taxes' && <BuckTaxesSection />}
          {section === 'payments' && <BuckPaymentsSection />}
          {section === 'transport' && <BuckTransportSection />}
          {section === 'printers' && <BuckPrintersSection />}
          {section === 'maininfo' && <BuckMainInfoSection />}
        </Box>
      </Stack>
    </OpsScreen>
  );
}

function NavHeading({ children, icon, ...rest }: { children: ReactNode; icon?: string } & Record<`data-${string}`, boolean>) {
  return (
    <Stack direction="row" alignItems="center" gap={0.5} sx={{ m: '10px 12px 6px', color: md3.outline }} {...rest}>
      {icon && <Icon name={icon} size={12} />}
      <Typography sx={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.05em', textTransform: 'uppercase' }}>{children}</Typography>
    </Stack>
  );
}

// ─── Device info ────────────────────────────────────────────────────────────

/** "Thu, May 21 · 12:00 PM" — from the demo's one clock, so every screenshot reads the same. */
const syncedLabel = (d: Date): string =>
  `${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;

/**
 * Device info: what support asks for first. Nothing here is a setting — it describes this tablet —
 * so the one action is "Copy for support", which puts the same lines on the clipboard.
 */
function DeviceSection() {
  const { state, toast } = usePos();
  const hw = state.terminalSettings.hardware;
  const rows: [string, string][] = [
    ['Facility', APP_IDENTITY.facility],
    ['Account', APP_IDENTITY.account],
    ['App', `${APP_IDENTITY.product} · ${APP_IDENTITY.version}`],
    ['Device', APP_IDENTITY.device],
    ['Register', hw.name],
    // Buck › Course Settings › Tablets numbers every registered device; support asks for it.
    ['Buck tablet', `${THIS_TABLET.id} · ${THIS_TABLET.identifier}`],
    ['Card reader', hw.cardReader === 'None' ? 'Not connected' : hw.cardReader],
    ['Last synced', syncedLabel(demoNow())],
  ];
  const copy = () => {
    // Best effort: a browser that refuses the clipboard still gets the toast, which is the prototype's point.
    navigator.clipboard?.writeText(rows.map(([k, v]) => `${k}: ${v}`).join('\n')).catch(() => {});
    toast('Device info copied for support');
  };
  return (
    <Box data-settings-panel="device" sx={{ maxWidth: 640 }}>
      <Typography component="h2" sx={{ fontSize: 20, fontWeight: 800, mb: 1 }}>
        Device info
      </Typography>
      <Box sx={{ mb: 2 }}>
        {rows.map(([label, value]) => (
          <Stack key={label} direction="row" data-device-info={label} sx={{ py: 1, borderBottom: `1px solid ${md3.outlineVariant}` }}>
            <Typography sx={{ width: 200, flexShrink: 0, fontSize: 13, color: md3.onSurfaceVariant }}>{label}</Typography>
            <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{value}</Typography>
          </Stack>
        ))}
      </Box>
      <OutlineButton onClick={copy}>
        <Stack component="span" direction="row" alignItems="center" gap={0.75}>
          <Icon name="content_copy" size={16} />
          Copy for support
        </Stack>
      </OutlineButton>
    </Box>
  );
}

// ─── Card reader ────────────────────────────────────────────────────────────

/** What each simulated reader reports once connected. */
const READER_STATUS: Record<string, { battery: number; firmware: string }> = {
  'Stripe Reader S700 · 0184': { battery: 82, firmware: '2.14' },
  'BBPOS WisePOS E · 2231': { battery: 64, firmware: '1.9.3' },
};
const NEARBY_READERS = HARDWARE_OPTIONS.cardReader.filter((r) => r !== 'None');

/**
 * Card reader: Weston's *"connecting to a reader."* The connected reader is
 * `terminalSettings.hardware.cardReader`, the one Terminal & hardware lists, so Connect and
 * Disconnect save it there (through `saveHardware`, the rest of the hardware as it was) and the two
 * sections never disagree. Simulated, like every device here: connecting is a toast.
 */
function ReaderSection() {
  const { state, dispatch, toast } = usePos();
  const hw = state.terminalSettings.hardware;
  const connected = hw.cardReader === 'None' ? null : hw.cardReader;
  const status = connected ? READER_STATUS[connected] : undefined;
  const setReader = (cardReader: string) => dispatch({ type: 'saveHardware', hardware: { ...hw, cardReader } });
  return (
    <Box data-settings-panel="reader" sx={{ maxWidth: 640 }}>
      <Typography component="h2" sx={{ fontSize: 20, fontWeight: 800, mb: 1 }}>
        Card reader
      </Typography>
      <Stack
        direction="row"
        alignItems="center"
        gap={1.5}
        data-reader-status={connected ? 'connected' : 'none'}
        sx={{ p: '14px 16px', mb: 2.5, borderRadius: `${radius.md}px`, bgcolor: '#fff', border: `1.5px solid ${connected ? md3.primary : md3.outlineVariant}` }}
      >
        <Icon name="contactless" size={26} color={connected ? md3.primary : md3.outline} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 800 }}>{connected ?? 'No reader connected'}</Typography>
          <Typography sx={{ fontSize: 12, color: md3.onSurfaceVariant }}>
            {connected
              ? ['Connected', status && `battery ${status.battery}%`, status && `firmware ${status.firmware}`].filter(Boolean).join(' · ')
              : 'Connect a reader nearby to take cards'}
          </Typography>
        </Box>
        {connected ? (
          <Stack direction="row" gap={0.75}>
            <OutlineButton onClick={() => toast(TESTS.cardReader(connected))}>Test</OutlineButton>
            <OutlineButton
              onClick={() => {
                setReader('None');
                toast(`Disconnected ${connected}`);
              }}
            >
              Disconnect
            </OutlineButton>
          </Stack>
        ) : (
          <StatusChip label="Not connected" tone="warning" />
        )}
      </Stack>
      <Group title="Readers nearby" hint="Simulated in the prototype: these two are always in range.">
        {NEARBY_READERS.map((r) => (
          <Stack key={r} direction="row" alignItems="center" gap={1} data-nearby-reader={r} sx={{ py: 1, borderBottom: `1px solid ${md3.outlineVariant}` }}>
            <Typography sx={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{r}</Typography>
            {r === connected ? (
              <StatusChip label="Connected" tone="success" />
            ) : (
              <OutlineButton
                onClick={() => {
                  setReader(r);
                  toast(`Connected ${r}`);
                }}
              >
                Connect
              </OutlineButton>
            )}
          </Stack>
        ))}
      </Group>
    </Box>
  );
}

// ─── Clover ─────────────────────────────────────────────────────────────────

const CLOVER_SWITCHES = [
  { key: 'pair', label: 'Pair a Clover device' },
  { key: 'receipts', label: 'Print receipts through Clover' },
  { key: 'tips', label: 'Send tips to Clover' },
] as const;
type CloverKey = (typeof CLOVER_SWITCHES)[number]['key'];

/**
 * Clover: in Birdie, but *"I don't think we really use much anymore"* (Weston). Kept, and flagged,
 * until we decide to drop it. Its switches are this screen's own state: nothing in the prototype
 * reads them, so they reset when Settings closes.
 */
function CloverSection() {
  const { toast } = usePos();
  const [on, setOn] = useState<Record<CloverKey, boolean>>({ pair: false, receipts: false, tips: false });
  return (
    <Box data-settings-panel="clover" sx={{ maxWidth: 640 }}>
      <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1 }}>
        <Typography component="h2" sx={{ fontSize: 20, fontWeight: 800 }}>
          Clover
        </Typography>
        <StatusChip label="Rarely used" tone="warning" />
      </Stack>
      <Typography sx={{ fontSize: 12.5, color: md3.onSurfaceVariant, mb: 1.5 }}>
        For a course still running a Clover device alongside Birdie. These stay until we decide to drop them.
      </Typography>
      {CLOVER_SWITCHES.map((c) => (
        <Stack key={c.key} direction="row" alignItems="center" data-clover-setting={c.key} sx={{ py: 0.75, borderBottom: `1px solid ${md3.outlineVariant}` }}>
          <Typography sx={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{c.label}</Typography>
          <Switch
            checked={on[c.key]}
            onChange={(e) => {
              setOn((o) => ({ ...o, [c.key]: e.target.checked }));
              toast(`${c.label}: ${e.target.checked ? 'on' : 'off'}`);
            }}
            slotProps={{ input: { 'aria-label': c.label } }}
          />
        </Stack>
      ))}
    </Box>
  );
}

// ─── Terminal & hardware ────────────────────────────────────────────────────

const TESTS: Record<'receiptPrinter' | 'cardReader' | 'cashDrawer' | 'kitchenPrinter', (device: string) => string> = {
  receiptPrinter: (d) => `Test slip sent to ${d}`,
  cardReader: (d) => `${d} answered in 180 ms`,
  cashDrawer: (d) => (d.startsWith('Opened by') ? 'Drawer kicked through the receipt printer' : `Drawer opened · ${d}`),
  kitchenPrinter: (d) => `Test ticket sent to ${d}`,
};

function HardwareSection() {
  const { state, dispatch, toast } = usePos();
  const saved = state.terminalSettings.hardware;
  const [draft, setDraft] = useState<TerminalHardware>(saved);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const set = <K extends keyof TerminalHardware>(k: K, v: TerminalHardware[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const device = (k: keyof typeof TESTS, label: string, hint?: string) => (
    <Box data-device={k}>
      <Stack direction="row" alignItems="flex-end" gap={1}>
        <Box sx={{ flex: 1 }}>
          <SelectField label={label} value={draft[k]} options={HARDWARE_OPTIONS[k].map((o) => ({ label: o, value: o }))} onChange={(v) => set(k, v)} />
        </Box>
        <OutlineButton onClick={() => toast(draft[k] === 'None' ? `No ${label.toLowerCase()} set` : TESTS[k](draft[k]))}>Test</OutlineButton>
      </Stack>
      {hint && <Typography sx={{ fontSize: 11.5, color: md3.onSurfaceVariant, mt: 0.5 }}>{hint}</Typography>}
    </Box>
  );

  return (
    <SectionFrame
      title="Register & printers"
      section="hardware"
      dirty={dirty}
      problem={draft.name.trim() ? null : 'Give the register a name.'}
      onSave={() => dispatch({ type: 'saveHardware', hardware: draft })}
      onDiscard={() => setDraft(saved)}
    >
      <Group title="This register">
        <Field label="Register name" value={draft.name} onChange={(v) => set('name', v)} hint={`Printed on receipts and shift reports · Buck tablet ${THIS_TABLET.id}`} />
      </Group>
      <Group title="Devices" hint="Simulated in the prototype — a test shows what the device would answer.">
        <Stack gap={1.5}>
          {device('receiptPrinter', 'Pro Shop Printer', "Receipts. The club's printers that Buck lists for this use.")}
          {device('cardReader', 'Card reader')}
          {device('cashDrawer', 'Cash drawer')}
          {device('kitchenPrinter', 'Service Printer', "Kitchen tickets. The club's printers that Buck lists for this use.")}
        </Stack>
      </Group>
      <Group title="Receipts after a sale" hint="Buck's Auto Print Pro Shop Receipts is off, so each register decides.">
        <PillGroup
          value={draft.printReceipts}
          options={[
            { label: 'Always print', value: 'always' },
            { label: 'Ask each time', value: 'ask' },
            { label: 'Never print', value: 'never' },
          ]}
          onChange={(v) => set('printReceipts', v)}
        />
      </Group>
    </SectionFrame>
  );
}

// ─── Checkout & receipts ────────────────────────────────────────────────────

/**
 * Tips & gift cards — the two checkout settings Buck has no field for. Tax, the tenders and the
 * receipt text used to be edited here too; they are Buck's (Taxes & Fees, Payments, Birdie › Receipt
 * Text) and show read-only under Set in Buck. Saved through `saveCheckoutSettings`, the rest of the
 * checkout settings as they are.
 */
function CheckoutSection() {
  const { state, dispatch } = usePos();
  const saved = state.terminalSettings.checkout;
  const [draft, setDraft] = useState<CheckoutSettings>(saved);
  // Typed as text, so "1" on its way to "18" survives a keystroke; parsed into the draft as it goes.
  const [tipText, setTipText] = useState(saved.tipPresets.map(String));
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const problem = checkoutProblem(draft);

  const setTip = (i: number, v: string) => {
    const next = tipText.map((t, j) => (j === i ? v : t));
    setTipText(next);
    setDraft((d) => ({ ...d, tipPresets: next.map((t) => parseFloat(t) || 0) }));
  };
  const toggleCategory = (c: SpendCategory) =>
    setDraft((d) => ({ ...d, giftCategories: d.giftCategories.includes(c) ? d.giftCategories.filter((x) => x !== c) : [...d.giftCategories, c] }));

  return (
    <SectionFrame
      title="Tips & gift cards"
      section="checkout"
      tag="Not in Buck"
      dirty={dirty}
      problem={problem}
      note="Checkout reads these as soon as they are saved. Buck has no field for either yet — tax, tenders and receipt text are Buck's, under Set in Buck."
      onSave={() => dispatch({ type: 'saveCheckoutSettings', checkout: draft })}
      onDiscard={() => {
        setDraft(saved);
        setTipText(saved.tipPresets.map(String));
      }}
    >
      <Group title="Tip suggestions" hint="Buck › Birdie › Tip Suggestions on F&B Receipts is on.">
        <Stack direction="row" gap={1.5}>
          {tipText.map((t, i) => (
            <Box key={i} sx={{ width: 110 }} data-tip-preset={i}>
              <Field label={`Tip ${i + 1} %`} type="number" value={t} onChange={(v) => setTip(i, v)} />
            </Box>
          ))}
        </Stack>
      </Group>
      <Group title="New gift cards are good for" hint="The default a sale starts from; each sale can still change it.">
        <Stack direction="row" gap={0.75} sx={{ flexWrap: 'wrap' }}>
          {SPEND_CATEGORIES.map(({ id: c, label }) => {
            const on = draft.giftCategories.includes(c);
            return (
              <ButtonBase
                key={c}
                data-gift-default={c}
                aria-pressed={on}
                onClick={() => toggleCategory(c)}
                sx={{
                  px: 1.5,
                  py: 0.75,
                  borderRadius: `${radius.xl}px`,
                  border: `1.5px solid ${on ? md3.primary : md3.outlineVariant}`,
                  bgcolor: on ? md3.primaryContainer : '#fff',
                  color: on ? md3.onPrimaryContainer : md3.onSurfaceVariant,
                  fontSize: 12.5,
                  fontWeight: 700,
                }}
              >
                {label}
              </ButtonBase>
            );
          })}
        </Stack>
      </Group>
    </SectionFrame>
  );
}

// ─── Staff & PINs ───────────────────────────────────────────────────────────

function StaffSection() {
  const { state, dispatch, toast } = usePos();
  const manager = canManageStaff(state);
  const saved = state.settingsSaved.staff;
  return (
    <Box data-settings-panel="staff">
      <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1.5 }}>
        <Typography component="h2" sx={{ fontSize: 20, fontWeight: 800 }}>
          Staff & PINs
        </Typography>
        <Box sx={{ flex: 1 }} />
        {manager && (
          <FilledButton onClick={() => dispatch({ type: 'openModal', modal: { kind: 'staffForm' } })}>
            <Stack component="span" direction="row" alignItems="center" gap={0.75}>
              <Icon name="person_add" size={16} />
              Add staff
            </Stack>
          </FilledButton>
        )}
      </Stack>
      {!manager && (
        <Box sx={{ mb: 1.5 }} data-staff-read-only>
          <Callout tone="info" icon="lock">
            Only a manager can change staff and PINs. Sign in as a manager to add someone, change a PIN or deactivate a login.
          </Callout>
        </Box>
      )}
      <Box sx={{ mb: 1.5 }}>
        <Callout tone="info" icon="info">
          The PIN pad, Time Clock and the server pickers read this list: someone added here can sign in, and someone deactivated cannot. Buck › Employees keeps the same people and PINs.
        </Callout>
      </Box>
      <DataTable
        data-staff-table
        columns={[{ label: 'Name' }, { label: 'Role' }, { label: 'PIN' }, { label: 'Status' }, { label: '', align: 'right' }]}
      >
        {state.staffRoster.map((m) => (
          <Box component="tr" key={m.id} data-staff-row={m.id} sx={{ opacity: m.active ? 1 : 0.55 }}>
            <Td>
              <Box sx={{ fontWeight: 700 }}>{m.name}</Box>
              {m.id === state.operatorId && <Box sx={{ fontSize: 11.5, color: md3.onSurfaceVariant }}>Signed in now</Box>}
            </Td>
            <Td>{ROLE_NAMES[m.role]}</Td>
            {/* A PIN is shown to a manager only; everyone else sees that one is set. */}
            <Td sx={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '.15em' }} data-pin={manager ? m.pin : 'hidden'}>
              {manager ? m.pin : '••••'}
            </Td>
            <Td>{m.active ? 'Active' : 'Deactivated'}</Td>
            <Td align="right">
              {manager && (
                <Stack direction="row" gap={0.75} justifyContent="flex-end">
                  <OutlineButton onClick={() => dispatch({ type: 'openModal', modal: { kind: 'staffForm', id: m.id } })}>Edit</OutlineButton>
                  {m.id !== state.operatorId && (
                    <OutlineButton
                      onClick={() => {
                        dispatch({ type: 'setStaffActive', id: m.id, active: !m.active });
                        toast(m.active ? `${m.name} can no longer sign in` : `${m.name} can sign in again`);
                      }}
                    >
                      {m.active ? 'Deactivate' : 'Reactivate'}
                    </OutlineButton>
                  )}
                </Stack>
              )}
            </Td>
          </Box>
        ))}
      </DataTable>
      {saved && <SavedStamp at={saved.at} by={saved.by} />}
    </Box>
  );
}

// ─── Tee sheet ──────────────────────────────────────────────────────────────

function TeeSheetSection() {
  const { dispatch } = usePos();
  return (
    <Box data-settings-panel="teesheet" sx={{ maxWidth: 520 }}>
      <Stack direction="row" alignItems="center" sx={{ mb: 0.5 }}>
        <Typography component="h2" sx={{ fontSize: 20, fontWeight: 800, flex: 1 }}>
          Tee sheet
        </Typography>
        <OutlineButton onClick={() => dispatch({ type: 'setView', view: 'tee' })}>Open the tee sheet</OutlineButton>
      </Stack>
      <Typography sx={{ fontSize: 12.5, color: md3.onSurfaceVariant, mb: 1.5 }}>
        The same settings as the tee sheet's tune button, and live: each change applies to the sheet at once.
      </Typography>
      <Box sx={{ border: `1.5px solid ${md3.outlineVariant}`, borderRadius: `${radius.lg}px`, bgcolor: '#fff', overflow: 'hidden' }}>
        <TeeSheetSettingsBody />
      </Box>
    </Box>
  );
}

// ─── Set in Buck ────────────────────────────────────────────────────────────

/**
 * Buck › Birdie: the section of Buck's Course Settings written for this app. Defaults, the Point of
 * Sale Options switches, and the receipt text — the Pro Shop tag is the footer Checkout prints.
 */
function BuckBirdieSection() {
  const { state } = usePos();
  return (
    <BuckFrame title="Birdie" section="birdie" buck="Birdie" intro="Birdie kiosk and tablet configuration.">
      <BuckGroup title="Defaults" buck="Birdie" hint="What Birdie preselects when starting a new sale or event.">
        {BIRDIE_DEFAULTS.map((d) => (
          <ReadRow key={d.label} label={d.label} value={d.value} />
        ))}
      </BuckGroup>
      <BuckGroup title="Point of Sale Options" buck="Birdie">
        {POS_OPTIONS.map((o) => (
          <ReadRow key={o.label} label={o.label} value={<OnOff on={o.on} />} followed={o.followed} note={o.note} />
        ))}
      </BuckGroup>
      <BuckGroup title="Receipt Text" buck="Birdie">
        <ReadRow label="Pro Shop Receipt Tag" value={state.terminalSettings.checkout.receiptFooter} note="The footer Checkout prints" />
        <ReadRow label="Restaurant Receipt Tag" value={RESTAURANT_RECEIPT_TAG} followed={false} />
        <ReadRow label="Cart Sign Out Disclaimer" value={CART_SIGN_OUT_DISCLAIMER} followed={false} />
      </BuckGroup>
    </BuckFrame>
  );
}

/**
 * Buck › Taxes & Fees. Buck names a tax for each kind of line; Birdie charges one sales-tax rate on
 * all of them (a round's tax comes from its booking), so every row reads the rate Checkout charges.
 */
function BuckTaxesSection() {
  const { state } = usePos();
  const rate = taxRateOf(state);
  const sales = taxTypeLabel({ name: 'Sales Tax', rate });
  return (
    <BuckFrame title="Taxes & Fees" section="taxes" buck="Taxes & Fees" intro="Tax rates and the fees applied to bookings and orders.">
      <BuckGroup title="Tax Rates" buck="Taxes & Fees" hint="Which configured tax applies to each kind of line item.">
        {TAX_RATE_FIELDS.map((f) => (
          <ReadRow key={f.label} label={f.label} value={f.tax === 'sales' ? sales : f.tax === 'exempt' ? 'Tax Exempt (0.00%)' : 'No tax'} note={f.appliesTo} />
        ))}
      </BuckGroup>
      <BuckGroup title="Service Charges" buck="Taxes & Fees">
        {SERVICE_CHARGES.map((c) => (
          <ReadRow key={c.label} label={c.label} value={`${c.percent}%`} followed={false} />
        ))}
      </BuckGroup>
    </BuckFrame>
  );
}

/**
 * Buck › Payments. Each tender Checkout offers is one of Buck's Payment Types; whether it is on is the
 * switch Checkout reads (`terminalSettings.checkout.tenders`).
 */
function BuckPaymentsSection() {
  const { state } = usePos();
  const tenders = state.terminalSettings.checkout.tenders;
  return (
    <BuckFrame title="Payments" section="payments" buck="Payments" intro="Processors, terminals and how payments are captured.">
      <BuckGroup title="Payment Types" buck="Payments" hint="Each tender checkout offers, by the payment type Buck records it as.">
        <DataTable data-buck-payment-types columns={[{ label: 'Checkout tender' }, { label: 'Buck payment type' }, { label: 'At checkout', align: 'right' }]}>
          {PAYMENT_TYPES.map((p) => (
            <Box component="tr" key={p.tender} data-payment-type={p.tender}>
              <Td>
                <Box sx={{ fontWeight: 700 }}>{TENDER_NAMES[p.tender]}</Box>
              </Td>
              <Td>
                {p.buckName}
                {p.note && <Box sx={{ fontSize: 11.5, color: md3.onSurfaceVariant }}>{p.note}</Box>}
              </Td>
              <Td align="right">
                <OnOff on={tenders[p.tender] !== false} />
              </Td>
            </Box>
          ))}
        </DataTable>
        <Typography sx={{ fontSize: 11.5, color: md3.onSurfaceVariant, mt: 1 }}>
          Also on in Buck, not tenders at this counter: {BUCK_ONLY_PAYMENT_TYPES.join(', ')}.
        </Typography>
      </BuckGroup>
      <BuckGroup title="Other Settings" buck="Payments">
        {PAYMENT_OPTIONS.map((o) => (
          <ReadRow key={o.label} label={o.label} value={<OnOff on={o.on} />} followed={o.followed} />
        ))}
      </BuckGroup>
    </BuckFrame>
  );
}

/** Buck › Transportation Types, with the transport rows the register prices for each. */
function BuckTransportSection() {
  return (
    <BuckFrame title="Transportation Types" section="transport" buck="Transportation Types" intro="Carts and other transport offered at checkout.">
      <BuckGroup title="Types" buck="Transportation Types">
        <DataTable columns={[{ label: 'Type' }, { label: 'Booking' }, { label: 'Default' }, { label: 'Priced at the register as' }]}>
          {TRANSPORTATION_TYPES.map((t) => (
            <Box component="tr" key={t.type} data-transport-type={t.type}>
              <Td>
                <Box sx={{ fontWeight: 700 }}>{t.type}</Box>
              </Td>
              <Td>{t.booking ? 'Yes' : 'No'}</Td>
              <Td>{t.isDefault ? 'Yes' : 'No'}</Td>
              <Td>
                {TRANSPORT_RATES.filter((r) => r.mode === t.mode)
                  .map((r) => `${r.name} ${money(r.price)}`)
                  .join(' · ')}
              </Td>
            </Box>
          ))}
        </DataTable>
      </BuckGroup>
    </BuckFrame>
  );
}

/** Buck › Printers and Buck › Tablets: the club's printers by use, and this terminal's row. */
function BuckPrintersSection() {
  const { state } = usePos();
  const hw = state.terminalSettings.hardware;
  return (
    <BuckFrame title="Printers & Tablets" section="printers" buck="Printers" intro="Receipt and ticket printers for this course, and the tablets registered to it.">
      <BuckGroup title="Printers" buck="Printers">
        <DataTable data-buck-printers columns={[{ label: 'Printer' }, { label: 'Uses' }, { label: 'Pops drawer on cash' }, { label: 'This register', align: 'right' }]}>
          {PRINTERS.map((p) => {
            const mine = [p.name === hw.receiptPrinter && 'Receipts', p.name === hw.kitchenPrinter && 'Kitchen'].filter(Boolean).join(', ');
            return (
              <Box component="tr" key={p.name} data-printer={p.name}>
                <Td>
                  <Box sx={{ fontWeight: 700 }}>{p.name}</Box>
                  <Box sx={{ fontSize: 11, color: md3.onSurfaceVariant, fontFamily: 'monospace' }}>{p.mac}</Box>
                </Td>
                <Td>{p.uses.join(', ')}</Td>
                <Td>{p.popOnCash ? 'Yes' : 'No'}</Td>
                <Td align="right">{mine ? <StatusChip label={mine} tone="success" /> : '—'}</Td>
              </Box>
            );
          })}
        </DataTable>
      </BuckGroup>
      <BuckGroup title="Tablets" buck="Tablets">
        <DataTable data-buck-tablets columns={[{ label: '#' }, { label: 'Description' }, { label: 'Identifier' }, { label: 'Printer' }]}>
          {TABLETS.map((t) => (
            <Box component="tr" key={t.id} data-tablet={t.id} sx={{ bgcolor: t.id === THIS_TABLET.id ? md3.primaryContainer : undefined }}>
              <Td sx={{ fontFamily: 'monospace' }}>{t.id}</Td>
              <Td>
                <Box sx={{ fontWeight: 700 }}>{t.description}</Box>
                {t.id === THIS_TABLET.id && <Box sx={{ fontSize: 11.5, color: md3.onSurfaceVariant }}>This tablet</Box>}
              </Td>
              <Td sx={{ fontFamily: 'monospace' }}>{t.identifier}</Td>
              <Td>{t.printer || '—'}</Td>
            </Box>
          ))}
        </DataTable>
      </BuckGroup>
    </BuckFrame>
  );
}

/** Buck › Main Info: what a receipt's header and an issued credit read from the course record. */
function BuckMainInfoSection() {
  const { state } = usePos();
  return (
    <BuckFrame title="Main Info" section="maininfo" buck="Main Info" intro="Name, address, contact details and time zone.">
      <BuckGroup title="Identity" buck="Main Info">
        <ReadRow label="Course Name" value={MAIN_INFO.courseName} />
        <ReadRow label="Phone" value={MAIN_INFO.phone} />
        <ReadRow label="Time Zone" value={MAIN_INFO.timeZone} />
        <ReadRow label="Receipt header" value={state.terminalSettings.checkout.receiptHeader} note="Built from the name and phone" />
      </BuckGroup>
      <BuckGroup title="Credits and Expirations" buck="Main Info" hint="How long issued credits stay valid, in days.">
        {CREDIT_EXPIRATIONS.map((c) => (
          <ReadRow key={c.label} label={c.label} value={`${c.days} days`} />
        ))}
      </BuckGroup>
      <BuckGroup title="Reporting" buck="Main Info">
        <ReadRow label="Reporting End Time" value={MAIN_INFO.reportingEndTime} followed={false} note="When a business day closes for reports" />
      </BuckGroup>
    </BuckFrame>
  );
}

/** A Set in Buck section: its title and marker, and where in Buck it changes. Nothing here saves. */
function BuckFrame({ title, section, buck, intro, children }: { title: string; section: SettingsSection; buck: BuckSection; intro: string; children: ReactNode }) {
  return (
    <Box data-settings-panel={section} data-read-only sx={{ maxWidth: 760 }}>
      <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 0.5 }}>
        <Typography component="h2" sx={{ fontSize: 20, fontWeight: 800 }}>
          {title}
        </Typography>
        <SetInBuckChip />
      </Stack>
      <Typography sx={{ fontSize: 12.5, color: md3.onSurfaceVariant, mb: 1.5 }}>{intro}</Typography>
      <Box sx={{ mb: 2 }} data-buck-where>
        <Callout tone="info" icon="lock">
          Read-only here. Change it in {buckPath(buck)}; this terminal picks it up on its next sync.
        </Callout>
      </Box>
      {children}
    </Box>
  );
}

function BuckGroup({ title, buck, hint, children }: { title: string; buck: BuckSection; hint?: string; children: ReactNode }) {
  return (
    <Box sx={{ mb: 2.5 }} data-buck-group={title}>
      <PanelHeading aside={buckPath(buck, title)}>{title}</PanelHeading>
      {hint && <Typography sx={{ fontSize: 12, color: md3.onSurfaceVariant, mt: -0.5, mb: 0.75 }}>{hint}</Typography>}
      {children}
    </Box>
  );
}

/**
 * One read-only value. `followed: false` marks a Buck setting this prototype does not act on yet —
 * shown so the team sees it exists, labelled so nobody takes it for a working switch.
 */
function ReadRow({ label, value, note, followed = true }: { label: string; value: ReactNode; note?: string; followed?: boolean }) {
  return (
    <Stack direction="row" alignItems="flex-start" gap={1.5} data-read-row={label} sx={{ py: 0.875, borderBottom: `1px solid ${md3.outlineVariant}` }}>
      <Box sx={{ width: 260, flexShrink: 0 }}>
        <Typography sx={{ fontSize: 13, color: md3.onSurfaceVariant }}>{label}</Typography>
        {note && <Typography sx={{ fontSize: 11, color: md3.outline }}>{note}</Typography>}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, whiteSpace: 'pre-line' }}>{value}</Box>
      {!followed && <StatusChip label="Shown only" tone="muted" />}
    </Stack>
  );
}

function OnOff({ on }: { on: boolean }) {
  return <StatusChip label={on ? 'On' : 'Off'} tone={on ? 'success' : 'muted'} />;
}

/** The marker on everything Buck owns. */
function SetInBuckChip() {
  return <StatusChip label="Set in Buck" tone="buck" icon="lock" />;
}

// ─── Parts ──────────────────────────────────────────────────────────────────

/** A section that saves as a whole: its fields, then Save and Discard, and who saved it last. */
function SectionFrame({
  title,
  section,
  dirty,
  problem,
  note,
  tag,
  onSave,
  onDiscard,
  children,
}: {
  title: string;
  section: SettingsSection;
  dirty: boolean;
  problem: string | null;
  note?: string;
  /** A marker beside the title — "Not in Buck" for a setting Buck has no field for. */
  tag?: string;
  onSave: () => void;
  onDiscard: () => void;
  children: ReactNode;
}) {
  const { state, toast } = usePos();
  const saved = state.settingsSaved[section];
  return (
    <Box data-settings-panel={section} sx={{ maxWidth: 720 }}>
      <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1.5 }}>
        <Typography component="h2" sx={{ fontSize: 20, fontWeight: 800 }}>
          {title}
        </Typography>
        {tag && <StatusChip label={tag} tone="muted" icon="hourglass_empty" />}
      </Stack>
      {note && (
        <Box sx={{ mb: 1.5 }}>
          <Callout tone="info" icon="info">
            {note}
          </Callout>
        </Box>
      )}
      {children}
      {dirty && problem && (
        <Box sx={{ mb: 1.5 }} data-settings-problem>
          <Callout tone="warning">{problem}</Callout>
        </Box>
      )}
      <Stack direction="row" alignItems="center" gap={1} sx={{ pt: 1.5, borderTop: `1px solid ${md3.outlineVariant}` }}>
        <FilledButton
          disabled={!dirty || Boolean(problem)}
          onClick={() => {
            onSave();
            toast(`${title} saved`);
          }}
        >
          Save
        </FilledButton>
        <OutlineButton onClick={onDiscard}>Discard changes</OutlineButton>
        <Box sx={{ flex: 1 }} />
        {dirty ? (
          <Typography sx={{ fontSize: 12, color: md3.onSurfaceVariant }} data-settings-dirty>
            Unsaved changes
          </Typography>
        ) : (
          saved && <SavedStamp at={saved.at} by={saved.by} />
        )}
      </Stack>
    </Box>
  );
}

function SavedStamp({ at, by }: { at: string; by: string }) {
  const { state } = usePos();
  return (
    <Typography sx={{ fontSize: 12, color: md3.onSurfaceVariant, mt: 1 }} data-settings-saved>
      Saved {at} by {staffById(by, state.staffRoster)?.short ?? by}
    </Typography>
  );
}

function Group({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <Box sx={{ mb: 2.5 }}>
      <PanelHeading aside={hint}>{title}</PanelHeading>
      {children}
    </Box>
  );
}

/** The fills match `Callout`'s tones, so a chip and a callout of one tone read as one colour. */
const CHIP_TONES = {
  muted: { bg: md3.surfaceHigh, text: md3.onSurfaceVariant },
  // Set in Buck: a hue of its own, so "owned elsewhere" never reads as a status.
  buck: { bg: '#e0e7ff', text: '#3730a3' },
  warning: { bg: '#fef3c7', text: '#92400e' },
  success: { bg: '#f0fdf4', text: '#166534' },
} as const;

function StatusChip({ label, tone, icon }: { label: string; tone: keyof typeof CHIP_TONES; icon?: string }) {
  const c = CHIP_TONES[tone];
  return (
    <Box
      component="span"
      data-chip={label}
      sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.375, px: 0.875, py: '2px', borderRadius: `${radius.xl}px`, bgcolor: c.bg, color: c.text, fontSize: 10.5, fontWeight: 800, whiteSpace: 'nowrap' }}
    >
      {icon && <Icon name={icon} size={12} />}
      {label}
    </Box>
  );
}
