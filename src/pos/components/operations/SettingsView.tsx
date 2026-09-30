import { useState, type ReactNode } from 'react';
import { Box, ButtonBase, Switch, Typography } from '@mui/material';
import { md3, radius } from '../../../theme/tokens';
import { SPEND_CATEGORIES, type SpendCategory } from '../../data/spend';
import { staffById } from '../../data/staff';
import { usePos } from '../../state/PosProvider';
import {
  HARDWARE_OPTIONS,
  ROLE_NAMES,
  TENDER_KEYS,
  TENDER_NAMES,
  canManageStaff,
  checkoutProblem,
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
 * Settings (V1 → V2).
 *
 * ## What v1 did
 *
 * Nothing: v1's Settings tile opened a stub — "Terminal and hardware configuration." — and never
 * became more. Weston Edits pointed the tile at the tee sheet's display settings, the one piece of
 * configuration the prototype had.
 *
 * ## What this does
 *
 * Four sections down the left, the one open on the right:
 *
 * - **Terminal & hardware** — the register's name, its receipt printer, card reader, cash drawer and
 *   kitchen printer, each with a test; and whether a receipt prints after a sale.
 * - **Checkout & receipts** — tax, the tip presets, which tenders checkout offers, the receipt's
 *   header and footer, and what a new gift card is good for.
 * - **Staff & PINs** — who can sign in, their role and PIN. **Managers only**: anyone else reads it.
 * - **Tee sheet** — the tee sheet's own display settings, given a second home. These are live.
 *
 * Each editable section saves as a whole — Save and Discard under it, and who saved it last — rather
 * than on every keystroke, because a half-typed tax rate is not a setting anyone meant.
 *
 * **Wired** (Justin's call, after a first cut that only recorded them): once saved, checkout charges
 * the tax rate, offers the tenders switched on and the tip presets, prints the receipt text on the
 * reader's done step as "Receipts after a sale" says, and starts new gift cards from the default;
 * the register header shows the register's name; and the PIN pad, Time Clock and server pickers read
 * the staff list. The hardware stays simulated — a test is a toast.
 */
const SECTIONS: { key: SettingsSection; label: string; icon: string; blurb: string }[] = [
  { key: 'hardware', label: 'Terminal & hardware', icon: 'point_of_sale', blurb: 'Printers, card reader, cash drawer' },
  { key: 'checkout', label: 'Checkout & receipts', icon: 'receipt_long', blurb: 'Tax, tips, tenders, receipt text' },
  { key: 'staff', label: 'Staff & PINs', icon: 'badge', blurb: 'Who signs in, and how' },
  { key: 'teesheet', label: 'Tee sheet', icon: 'golf_course', blurb: 'Density, grid, behaviour' },
];

export function SettingsView() {
  const { state, dispatch } = usePos();
  const section = state.settingsSection;
  return (
    <OpsScreen data-settings>
      <OpsToolbar title="Settings" />
      <Stack direction="row" sx={{ flex: 1, minHeight: 0 }}>
        <Box component="nav" aria-label="Settings sections" sx={{ width: 250, flexShrink: 0, borderRight: `1px solid ${md3.outlineVariant}`, p: 1.25, bgcolor: '#fff' }}>
          {SECTIONS.map((s) => {
            const on = s.key === section;
            return (
              <ButtonBase
                key={s.key}
                data-settings-section={s.key}
                aria-current={on ? 'page' : undefined}
                onClick={() => dispatch({ type: 'setSettingsSection', section: s.key })}
                sx={{
                  width: '100%',
                  justifyContent: 'flex-start',
                  gap: 1.25,
                  p: '10px 12px',
                  mb: 0.5,
                  borderRadius: `${radius.md}px`,
                  textAlign: 'left',
                  bgcolor: on ? md3.primaryContainer : 'transparent',
                  color: on ? md3.onPrimaryContainer : md3.onSurface,
                  '&:hover': { bgcolor: on ? md3.primaryContainer : md3.surfaceContainer },
                }}
              >
                <Icon name={s.icon} size={20} color={on ? md3.onPrimaryContainer : md3.onSurfaceVariant} />
                <Box>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>{s.label}</Typography>
                  <Typography sx={{ fontSize: 11.5, color: on ? md3.onPrimaryContainer : md3.onSurfaceVariant }}>{s.blurb}</Typography>
                </Box>
              </ButtonBase>
            );
          })}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0, overflowY: 'auto', p: '20px 28px' }}>
          {/* Keyed, so switching section starts a fresh draft of the one opened. */}
          {section === 'hardware' && <HardwareSection key="hardware" />}
          {section === 'checkout' && <CheckoutSection key="checkout" />}
          {section === 'staff' && <StaffSection />}
          {section === 'teesheet' && <TeeSheetSection />}
        </Box>
      </Stack>
    </OpsScreen>
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

  const device = (k: keyof typeof TESTS, label: string) => (
    <Stack direction="row" alignItems="flex-end" gap={1} data-device={k}>
      <Box sx={{ flex: 1 }}>
        <SelectField label={label} value={draft[k]} options={HARDWARE_OPTIONS[k].map((o) => ({ label: o, value: o }))} onChange={(v) => set(k, v)} />
      </Box>
      <OutlineButton onClick={() => toast(draft[k] === 'None' ? `No ${label.toLowerCase()} set` : TESTS[k](draft[k]))}>Test</OutlineButton>
    </Stack>
  );

  return (
    <SectionFrame
      title="Terminal & hardware"
      section="hardware"
      dirty={dirty}
      problem={draft.name.trim() ? null : 'Give the register a name.'}
      onSave={() => dispatch({ type: 'saveHardware', hardware: draft })}
      onDiscard={() => setDraft(saved)}
    >
      <Group title="This register">
        <Field label="Register name" value={draft.name} onChange={(v) => set('name', v)} hint="Printed on receipts and shift reports" />
      </Group>
      <Group title="Devices" hint="Simulated in the prototype — a test shows what the device would answer.">
        <Stack gap={1.5}>
          {device('receiptPrinter', 'Receipt printer')}
          {device('cardReader', 'Card reader')}
          {device('cashDrawer', 'Cash drawer')}
          {device('kitchenPrinter', 'Kitchen printer')}
        </Stack>
      </Group>
      <Group title="Receipts after a sale">
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

function CheckoutSection() {
  const { state, dispatch } = usePos();
  const saved = state.terminalSettings.checkout;
  const [draft, setDraft] = useState<CheckoutSettings>(saved);
  // Typed as text, so "8." survives a keystroke; parsed into the draft as it goes.
  const [taxText, setTaxText] = useState(String(Math.round(saved.taxRate * 10000) / 100));
  const [tipText, setTipText] = useState(saved.tipPresets.map(String));
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const problem = checkoutProblem(draft);

  const setTax = (v: string) => {
    setTaxText(v);
    setDraft((d) => ({ ...d, taxRate: Math.round((parseFloat(v) || 0) * 100) / 10000 }));
  };
  const setTip = (i: number, v: string) => {
    const next = tipText.map((t, j) => (j === i ? v : t));
    setTipText(next);
    setDraft((d) => ({ ...d, tipPresets: next.map((t) => parseFloat(t) || 0) }));
  };
  const toggleCategory = (c: SpendCategory) =>
    setDraft((d) => ({ ...d, giftCategories: d.giftCategories.includes(c) ? d.giftCategories.filter((x) => x !== c) : [...d.giftCategories, c] }));

  return (
    <SectionFrame
      title="Checkout & receipts"
      section="checkout"
      dirty={dirty}
      problem={problem}
      note="Checkout reads these as soon as they are saved. Tax here is sales tax on retail and food; a round's tax comes from its course's rates. An order already paid keeps the tax it was rung with."
      onSave={() => dispatch({ type: 'saveCheckoutSettings', checkout: draft })}
      onDiscard={() => {
        setDraft(saved);
        setTaxText(String(Math.round(saved.taxRate * 10000) / 100));
        setTipText(saved.tipPresets.map(String));
      }}
    >
      <Group title="Tax and tips">
        <Stack direction="row" gap={1.5}>
          <Box sx={{ width: 160 }}>
            <Field label="Sales tax %" type="number" value={taxText} onChange={setTax} />
          </Box>
          {tipText.map((t, i) => (
            <Box key={i} sx={{ width: 110 }} data-tip-preset={i}>
              <Field label={`Tip ${i + 1} %`} type="number" value={t} onChange={(v) => setTip(i, v)} />
            </Box>
          ))}
        </Stack>
      </Group>
      <Group title="Tenders at checkout">
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', columnGap: 3 }}>
          {TENDER_KEYS.map((k) => (
            <Stack key={k} direction="row" alignItems="center" justifyContent="space-between" data-tender-setting={k} sx={{ py: 0.5 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{TENDER_NAMES[k]}</Typography>
              <Switch
                checked={draft.tenders[k]}
                onChange={(e) => setDraft((d) => ({ ...d, tenders: { ...d.tenders, [k]: e.target.checked } }))}
                slotProps={{ input: { 'aria-label': TENDER_NAMES[k] } }}
              />
            </Stack>
          ))}
        </Box>
      </Group>
      <Group title="Receipt">
        <Stack gap={1.25}>
          <Field label="Header" value={draft.receiptHeader} onChange={(v) => setDraft((d) => ({ ...d, receiptHeader: v }))} multiline />
          <Field label="Footer" value={draft.receiptFooter} onChange={(v) => setDraft((d) => ({ ...d, receiptFooter: v }))} multiline />
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
      <Stack direction="row" alignItems="center" sx={{ mb: 1.5 }}>
        <Typography component="h2" sx={{ fontSize: 20, fontWeight: 800, flex: 1 }}>
          Staff & PINs
        </Typography>
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
          The PIN pad, Time Clock and the server pickers read this list: someone added here can sign in, and someone deactivated cannot.
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

// ─── Parts ──────────────────────────────────────────────────────────────────

/** A section that saves as a whole: its fields, then Save and Discard, and who saved it last. */
function SectionFrame({
  title,
  section,
  dirty,
  problem,
  note,
  onSave,
  onDiscard,
  children,
}: {
  title: string;
  section: SettingsSection;
  dirty: boolean;
  problem: string | null;
  note?: string;
  onSave: () => void;
  onDiscard: () => void;
  children: ReactNode;
}) {
  const { state, toast } = usePos();
  const saved = state.settingsSaved[section];
  return (
    <Box data-settings-panel={section} sx={{ maxWidth: 720 }}>
      <Typography component="h2" sx={{ fontSize: 20, fontWeight: 800, mb: 1.5 }}>
        {title}
      </Typography>
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
