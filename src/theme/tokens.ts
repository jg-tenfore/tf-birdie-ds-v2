/**
 * Birdie POS design tokens.
 *
 * Ported verbatim from the Golf Course POS prototype's `:root` custom-property
 * block (see `references/prototoype/GolfCoursePOS_Package/Golf_Course_POS.html`).
 * The prototype follows Material Design 3 naming — primary / primary-container /
 * on-surface / outline / surface-container — so these map cleanly onto an MUI
 * theme without inventing a parallel vocabulary.
 *
 * This file is the single source of truth. `theme.ts` consumes it; nothing here
 * imports from MUI, so stories and plain CSS can read the same values.
 */

/** MD3 core roles. Names match the prototype's CSS variables 1:1. */
export const md3 = {
  primary: '#17a34a',
  primaryContainer: '#b7f0cf',
  onPrimary: '#ffffff',
  onPrimaryContainer: '#002112',
  secondary: '#4d6356',
  surface: '#f8faf8',
  surfaceContainer: '#eef1ee',
  surfaceHigh: '#e8ece8',
  surfaceHighest: '#e2e6e2',
  onSurface: '#191d19',
  /** `--on-surface-v` in the prototype (MD3 "on-surface-variant"). */
  onSurfaceVariant: '#404943',
  outline: '#707973',
  /** `--outline-v` in the prototype (MD3 "outline-variant"). */
  outlineVariant: '#c0c9c1',
  error: '#ba1a1a',
  /** The page behind the device shell, and the "dark chip" fill for switch buttons. */
  scrim: '#1a1c1a',
} as const;

/** `--r-sm` … `--r-xl`. `xl` is the MD3 full-round pill used on chips and filters. */
export const radius = { sm: 8, md: 12, lg: 16, xl: 28 } as const;

/** `--e1` … `--e3`. MD3 elevation levels 1–3, kept as raw box-shadow strings. */
export const elevation = {
  e1: '0 1px 2px rgba(0,0,0,.08),0 1px 3px 1px rgba(0,0,0,.06)',
  e2: '0 1px 2px rgba(0,0,0,.1),0 2px 6px 2px rgba(0,0,0,.08)',
  e3: '0 4px 8px 3px rgba(0,0,0,.1),0 1px 3px rgba(0,0,0,.12)',
} as const;

/**
 * The prototype's font stack. Google Sans is not redistributable, so Roboto —
 * bundled via `@fontsource-variable/roboto` — is what actually renders. The
 * Google Sans entries stay first so the design matches on machines that have it.
 */
export const fontFamily =
  "'Google Sans', 'Google Sans Text', Roboto, 'Helvetica Neue', Arial, sans-serif";

/**
 * Fixed device frame. The POS is a landscape counter terminal: the prototype's
 * `.shell` is hard-coded to this size and never reflows, so layouts assume it.
 */
export const shell = { width: 1366, height: 840 } as const;

/**
 * Per-player accent ramp. Player 1 is brand green, then blue / amber / violet /
 * red. Used for avatar initials, progress dots, and financial rows — the
 * prototype repeats this literal array in six places.
 */
export const playerAccents = ['#17a34a', '#2563eb', '#d97706', '#7c3aed', '#dc2626'] as const;

/** Payment state → badge fill / text / label. Keys are `booking.pay` values. */
export const payBadges = {
  paid: { bg: '#dcfce7', text: '#16a34a', label: 'PAID' },
  open: { bg: '#f3f4f6', text: '#707973', label: 'OPEN' },
  rain_chk: { bg: '#e0e7ff', text: '#4f46e5', label: 'RAIN CHK' },
  no_show: { bg: '#ffdad6', text: '#ba1a1a', label: 'NO SHOW' },
  refund: { bg: '#ffedd5', text: '#ea580c', label: 'REFUNDED' },
  block: { bg: '#e5e7eb', text: '#4b5563', label: 'BLOCKED' },
  event: { bg: '#ede9fe', text: '#6d28d9', label: 'EVENT' },
} as const;

export type PayState = keyof typeof payBadges;

/**
 * Time-of-day bands. Drive the tee-sheet row tinting, the Day selector, and the
 * shift-based rate table. `bg` tints list cards; `bandBg` tints grid rows.
 */
export const shifts = {
  full: {
    label: 'Day',
    startH: 6,
    startM: 0,
    endH: 18,
    endM: 0,
    bg: null,
    bandBg: null,
    icon: 'calendar_view_day',
    iconColor: md3.outline,
  },
  early: {
    label: 'Early Morning',
    startH: 6,
    startM: 0,
    endH: 10,
    endM: 0,
    bg: '#fffbeb',
    bandBg: 'rgba(245,158,11,.07)',
    icon: 'wb_twilight',
    iconColor: '#f59e0b',
  },
  peak: {
    label: 'Peak Hours',
    startH: 10,
    startM: 0,
    endH: 14,
    endM: 0,
    bg: '#f0fdf4',
    bandBg: 'rgba(22,163,74,.07)',
    icon: 'wb_sunny',
    iconColor: '#16a34a',
  },
  twilight: {
    label: 'Twilight',
    startH: 14,
    startM: 0,
    endH: 18,
    endM: 0,
    bg: '#f5f3ff',
    bandBg: 'rgba(124,58,237,.07)',
    icon: 'nightlight',
    iconColor: '#7c3aed',
  },
  week: {
    label: 'Week',
    startH: 6,
    startM: 0,
    endH: 18,
    endM: 0,
    bg: null,
    bandBg: null,
    icon: 'calendar_view_week',
    iconColor: md3.outline,
  },
} as const;

export type ShiftKey = keyof typeof shifts;

/** Membership tier → label and badge colors. */
export const memberTypes = {
  annual: { label: 'Annual Member', color: '#F4BA15', bg: '#fef3c7' },
  seasonal: { label: 'Seasonal Member', color: '#2563eb', bg: '#dbeafe' },
  monthly: { label: 'Monthly Member', color: '#7c3aed', bg: '#f3e8ff' },
  senior: { label: 'Senior Member', color: '#d97706', bg: '#fef3c7' },
  student: { label: 'Student Member', color: '#0891b2', bg: '#cffafe' },
} as const;

export type MemberTypeKey = keyof typeof memberTypes;

/** Operator note colors for time-row annotations (lightning holds, frost delays). */
export const noteColors = {
  yellow: { bg: '#fffbeb', border: '#fde68a', text: '#92400e', dot: '#f59e0b' },
  blue: { bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af', dot: '#2563eb' },
  green: { bg: '#f0fdf4', border: '#bbf7d0', text: '#166534', dot: '#16a34a' },
  purple: { bg: '#f5f3ff', border: '#ddd6fe', text: '#5b21b6', dot: '#7c3aed' },
  red: { bg: '#fef2f2', border: '#fecaca', text: '#991b1b', dot: '#dc2626' },
} as const;

export type NoteColorKey = keyof typeof noteColors;

/** Tee-sheet grid geometry. `rowH` differs between comfortable and compact modes. */
export const grid = {
  rowH: 46,
  rowHCompact: 30,
  timeGutterW: 60,
  timeGutterWIndependent: 54,
  slotHeaderH: 18,
  topbarH: 56,
  leftPanelW: 320,
} as const;
