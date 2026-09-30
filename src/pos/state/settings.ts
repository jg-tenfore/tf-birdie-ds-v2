import { DEFAULT_GIFT_CATEGORIES, type SpendCategory } from '../data/spend';
import { STAFF, type StaffMember, type StaffRole } from '../data/staff';
import { TAX_RATE } from '../data/config';
import type { PosState } from './pos-store';

/**
 * Settings (V1 → V2) — the terminal, checkout and receipts, staff and PINs.
 *
 * v1 never had a Settings screen: its nav tile opened a stub reading "Terminal and hardware
 * configuration." So this is new. The first cut only recorded changes; they are now **wired**
 * (Justin's call): the register reads the tax rate (`taxRateOf`), the tip presets, the tenders, the
 * receipt text and "Receipts after a sale", the gift-card default and the register's name, and
 * sign-in reads `staffRoster`. Every edition without Settings keeps these defaults, which are exactly
 * the prototype's old fixed behaviour — so nothing outside V1 → V2 moves. An order already paid keeps
 * the tax it was rung with; only the order being rung reads the rate.
 *
 * Who may change what: **anyone signed in** may change the terminal and checkout settings; **only a
 * manager** may change staff and PINs (Justin's call). The reducer refuses a staff change from anyone
 * else, so the rule does not depend on the screen hiding a button.
 */

// ─── State ──────────────────────────────────────────────────────────────────

/** The hardware a counter terminal talks to. Simulated: a test is a toast, not a device. */
export interface TerminalHardware {
  /** What this register is called on receipts and in reports. */
  name: string;
  receiptPrinter: string;
  cardReader: string;
  cashDrawer: string;
  kitchenPrinter: string;
  /** Whether a receipt prints after a sale, or the operator is asked. */
  printReceipts: 'always' | 'ask' | 'never';
}

/** The tenders Checkout can offer — a switch each. */
export const TENDER_KEYS = ['card', 'cash', 'cashpay', 'giftcard', 'house', 'cardonfile', 'event', 'check'] as const;
export type TenderKey = (typeof TENDER_KEYS)[number];

export const TENDER_NAMES: Record<TenderKey, string> = {
  card: 'Card',
  cash: 'Cash',
  cashpay: 'Other',
  giftcard: 'Gift card',
  house: 'House account',
  cardonfile: 'Card on file',
  event: 'Charge to event',
  check: 'Check',
};

export interface CheckoutSettings {
  /** Sales tax, as a fraction: 0.08 is 8%. */
  taxRate: number;
  /** The tip percentages Checkout offers, in order. */
  tipPresets: number[];
  tenders: Record<TenderKey, boolean>;
  receiptHeader: string;
  receiptFooter: string;
  /** What a newly sold gift card is good for, unless the sale says otherwise. */
  giftCategories: SpendCategory[];
}

export interface TerminalSettings {
  hardware: TerminalHardware;
  checkout: CheckoutSettings;
}

/** A person on the staff list, as Settings keeps it. `active: false` is deactivated, not deleted. */
export interface StaffRecord extends StaffMember {
  active: boolean;
}

export type SettingsSection = 'hardware' | 'checkout' | 'staff' | 'teesheet';
export const SETTINGS_SECTIONS: SettingsSection[] = ['hardware', 'checkout', 'staff', 'teesheet'];

export interface SettingsState {
  terminalSettings: TerminalSettings;
  staffRoster: StaffRecord[];
  settingsSection: SettingsSection;
  /** When each section was last saved, and by whom — shown under its Save button. */
  settingsSaved: Partial<Record<SettingsSection, { at: string; by: string }>>;
  settingsSeq: number;
}

/** The devices the simulated hardware lists offer. The first of each is what the terminal ships with. */
export const HARDWARE_OPTIONS = {
  receiptPrinter: ['Epson TM-m30III · Front counter', 'Star TSP143IV · Pro shop', 'None'],
  cardReader: ['Stripe Reader S700 · 0184', 'BBPOS WisePOS E · 2231', 'None'],
  cashDrawer: ['Opened by the receipt printer', 'USB cash drawer', 'None'],
  kitchenPrinter: ['Epson TM-U220 · Kitchen', 'Star SP742 · 19th Hole bar', 'None'],
} as const;

export const settingsDefaults = (): SettingsState => ({
  terminalSettings: {
    hardware: {
      name: 'Register 1',
      receiptPrinter: HARDWARE_OPTIONS.receiptPrinter[0],
      cardReader: HARDWARE_OPTIONS.cardReader[0],
      cashDrawer: HARDWARE_OPTIONS.cashDrawer[0],
      kitchenPrinter: HARDWARE_OPTIONS.kitchenPrinter[0],
      printReceipts: 'ask',
    },
    checkout: {
      taxRate: TAX_RATE,
      tipPresets: [15, 18, 20],
      tenders: Object.fromEntries(TENDER_KEYS.map((k) => [k, true])) as Record<TenderKey, boolean>,
      receiptHeader: 'The Dunes of Delgado\nPro Shop · (555) 010-4400',
      receiptFooter: 'Thank you for playing. Rain checks are good for 30 days.',
      giftCategories: [...DEFAULT_GIFT_CATEGORIES],
    },
  },
  staffRoster: STAFF.map((s) => ({ ...s, active: true })),
  settingsSection: 'hardware',
  settingsSaved: {},
  settingsSeq: 0,
});

// ─── Rules ──────────────────────────────────────────────────────────────────

export const STAFF_ROLES: StaffRole[] = ['manager', 'server', 'bartender', 'host', 'pro-shop'];
export const ROLE_NAMES: Record<StaffRole, string> = { manager: 'Manager', server: 'Server', bartender: 'Bartender', host: 'Host', 'pro-shop': 'Pro shop' };

/** Whether the person signed in may change staff and PINs. */
export const canManageStaff = (s: Pick<SettingsState, 'staffRoster'> & { operatorId: string }): boolean =>
  s.staffRoster.find((m) => m.id === s.operatorId)?.role === 'manager';

/** What is wrong with a staff draft, or `null`. A PIN is four digits, and no two active people share one. */
export function staffProblem(roster: StaffRecord[], draft: Pick<StaffRecord, 'name' | 'pin'> & { id?: string }): string | null {
  if (!draft.name.trim()) return 'Enter their name.';
  if (!/^\d{4}$/.test(draft.pin)) return 'A PIN is four digits.';
  const clash = roster.find((m) => m.active && m.id !== draft.id && m.pin === draft.pin);
  if (clash) return `${clash.name} already signs in with ${draft.pin}.`;
  return null;
}

/** Whether a checkout draft can be saved: a tax rate a counter could charge, and three sensible tips. */
export function checkoutProblem(c: CheckoutSettings): string | null {
  if (!(c.taxRate >= 0 && c.taxRate < 0.25)) return 'Tax is a percentage between 0 and 25.';
  if (c.tipPresets.length !== 3 || c.tipPresets.some((t) => !(t > 0 && t <= 50))) return 'Each tip preset is between 1% and 50%.';
  if (!c.tenders.card && !c.tenders.cash) return 'Keep Card or Cash on — checkout needs a way to take money.';
  return null;
}

/** "Avery R." from a name. */
const shortName = (name: string): string => {
  const [first, ...rest] = name.trim().split(/\s+/);
  const last = rest.at(-1);
  return last ? `${first} ${last[0]}.` : first;
};

// ─── Actions ────────────────────────────────────────────────────────────────

export type SettingsModal = { kind: 'staffForm'; id?: string };
export const isSettingsModal = (m: { kind: string }): m is SettingsModal => m.kind === 'staffForm';

export type SettingsAction =
  | { type: 'setSettingsSection'; section: SettingsSection }
  | { type: 'saveHardware'; hardware: TerminalHardware }
  | { type: 'saveCheckoutSettings'; checkout: CheckoutSettings }
  /** Add (no `id`) or edit someone. Managers only; refused on a bad PIN or a clash. */
  | { type: 'saveStaff'; member: Omit<StaffRecord, 'id' | 'short' | 'active'> & { id?: string } }
  /** Deactivate or reactivate. Managers only; nobody deactivates themselves. */
  | { type: 'setStaffActive'; id: string; active: boolean };

const ACTION_TYPES = new Set<string>(['setSettingsSection', 'saveHardware', 'saveCheckoutSettings', 'saveStaff', 'setStaffActive']);
export const isSettingsAction = (a: { type: string }): a is SettingsAction => ACTION_TYPES.has(a.type);

export function settingsReducer(state: PosState, action: SettingsAction, now: string): PosState {
  const saved = (section: SettingsSection) => ({ ...state.settingsSaved, [section]: { at: now, by: state.operatorId } });
  switch (action.type) {
    case 'setSettingsSection':
      return { ...state, settingsSection: action.section };
    case 'saveHardware':
      if (!action.hardware.name.trim()) return state;
      return {
        ...state,
        terminalSettings: { ...state.terminalSettings, hardware: { ...action.hardware, name: action.hardware.name.trim() } },
        settingsSaved: saved('hardware'),
      };
    case 'saveCheckoutSettings':
      if (checkoutProblem(action.checkout)) return state;
      return { ...state, terminalSettings: { ...state.terminalSettings, checkout: action.checkout }, settingsSaved: saved('checkout') };
    case 'saveStaff': {
      if (!canManageStaff(state)) return state;
      const m = action.member;
      if (staffProblem(state.staffRoster, m)) return state;
      const name = m.name.trim();
      if (m.id) {
        if (!state.staffRoster.some((x) => x.id === m.id)) return state;
        return {
          ...state,
          staffRoster: state.staffRoster.map((x) => (x.id === m.id ? { ...x, name, short: shortName(name), role: m.role, pin: m.pin } : x)),
          settingsSaved: saved('staff'),
        };
      }
      const seq = state.settingsSeq + 1;
      const id = `s-${STAFF.length + seq}`;
      return {
        ...state,
        staffRoster: [...state.staffRoster, { id, name, short: shortName(name), role: m.role, pin: m.pin, active: true }],
        settingsSeq: seq,
        settingsSaved: saved('staff'),
      };
    }
    case 'setStaffActive': {
      if (!canManageStaff(state) || action.id === state.operatorId) return state;
      const target = state.staffRoster.find((x) => x.id === action.id);
      if (!target || target.active === action.active) return state;
      // Reactivating someone whose PIN another active person now uses would give two people one PIN.
      if (action.active && staffProblem(state.staffRoster, target)) return state;
      return {
        ...state,
        staffRoster: state.staffRoster.map((x) => (x.id === action.id ? { ...x, active: action.active } : x)),
        settingsSaved: saved('staff'),
      };
    }
  }
}
