import { createTheme } from '@mui/material/styles';
import {
  elevation,
  fontFamily,
  md3,
  memberTypes,
  noteColors,
  payBadges,
  playerAccents,
  radius,
  shifts,
} from './tokens';

/**
 * Birdie POS design-system theme.
 *
 * Maps the prototype's Material Design 3 token set (`tokens.ts`) onto MUI so
 * every component inherits the POS look without per-component color literals.
 *
 * Two things to know before editing:
 *
 *  1. **Light only.** The POS runs on a lit pro-shop counter terminal; the
 *     prototype has no dark tone set, so neither does this theme. Tokens are
 *     semantic, so adding a dark scheme later means adding tones in
 *     `tokens.ts` — not rewriting components.
 *
 *  2. **Dense, not touch-first.** The prototype's controls sit at 12–14px with
 *     1.5px outlines and ~32–38px hit targets, because an operator works it with
 *     a mouse across a 1366×840 frame. Defaults below match that. (This is the
 *     opposite of the Goose KDS theme this repo was scaffolded from, where
 *     gloved kitchen use forced everything large.)
 *
 * Everything — app and Storybook — renders inside `<ThemeProvider theme={theme}>`,
 * so edits here flow everywhere.
 */

// --- Custom tokens on the palette ------------------------------------------
declare module '@mui/material/styles' {
  interface Palette {
    /** MD3 roles that have no MUI equivalent (containers, outline variants). */
    md3: typeof md3;
    /** Payment-state badge colors, keyed by `booking.pay`. */
    pay: typeof payBadges;
    /** Time-of-day bands (early / peak / twilight) with their row tints. */
    shifts: typeof shifts;
    /** Membership tier badge colors. */
    memberTypes: typeof memberTypes;
    /** Operator note colors for tee-sheet time rows. */
    noteColors: typeof noteColors;
    /** Per-player accent ramp — index by player position. */
    playerAccents: readonly string[];
  }
  interface PaletteOptions {
    md3?: typeof md3;
    pay?: typeof payBadges;
    shifts?: typeof shifts;
    memberTypes?: typeof memberTypes;
    noteColors?: typeof noteColors;
    playerAccents?: readonly string[];
  }
}

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: md3.primary,
      light: md3.primaryContainer,
      contrastText: md3.onPrimary,
      dark: '#0f7a36',
    },
    secondary: { main: md3.secondary, contrastText: '#ffffff' },
    error: { main: md3.error, light: '#ffdad6', contrastText: '#ffffff' },
    warning: { main: '#d97706', light: '#fef3c7' },
    info: { main: '#2563eb', light: '#dbeafe' },
    success: { main: '#16a34a', light: '#dcfce7' },
    background: {
      // The app frame sits on `surface`; cards and panels are pure white, which
      // is how the prototype separates elevation without shadows everywhere.
      default: md3.surface,
      paper: '#ffffff',
    },
    text: {
      primary: md3.onSurface,
      secondary: md3.onSurfaceVariant,
      disabled: md3.outline,
    },
    divider: md3.outlineVariant,
    // Pass-through token groups (see the module augmentation above).
    md3,
    pay: payBadges,
    shifts,
    memberTypes,
    noteColors,
    playerAccents,
  },

  shape: { borderRadius: radius.md },

  // MD3 elevation levels 1–3 from the prototype, then a smooth ramp above.
  // MUI requires exactly 25 entries (index 0 = 'none').
  shadows: [
    'none',
    elevation.e1,
    elevation.e2,
    elevation.e3,
    ...Array.from({ length: 21 }, () => elevation.e3),
  ] as never,

  typography: {
    fontFamily,
    // The prototype's base body size. Most POS chrome is 12–13px, so a 13px
    // base means `fontSize: '1rem'` in a component lands on the design's default.
    fontSize: 13,
    htmlFontSize: 16,
    h1: { fontSize: 22, fontWeight: 800, letterSpacing: 0 },
    h2: { fontSize: 18, fontWeight: 800, letterSpacing: 0 },
    h3: { fontSize: 17, fontWeight: 800, letterSpacing: 0 },
    h4: { fontSize: 15, fontWeight: 700 },
    h5: { fontSize: 14, fontWeight: 700 },
    h6: { fontSize: 13, fontWeight: 700 },
    subtitle1: { fontSize: 13, fontWeight: 600 },
    subtitle2: { fontSize: 12, fontWeight: 600 },
    body1: { fontSize: 13, lineHeight: 1.45 },
    body2: { fontSize: 12, lineHeight: 1.45 },
    caption: { fontSize: 11, color: md3.onSurfaceVariant },
    // The prototype's ubiquitous "section label": tiny, bold, wide-tracked caps.
    overline: {
      fontSize: 11,
      fontWeight: 800,
      letterSpacing: '.6px',
      textTransform: 'uppercase',
      lineHeight: 1.4,
    },
    button: { textTransform: 'none', fontWeight: 600, fontSize: 13 },
  },

  components: {
    // --- Actions -----------------------------------------------------------
    MuiButton: {
      defaultProps: { disableElevation: true, size: 'small' },
      styleOverrides: {
        // Pill buttons throughout — matches `.tb-btn`, `.switch-btn`, `.lv-chip`.
        root: { borderRadius: radius.xl, fontWeight: 600, minHeight: 34 },
        // The prototype draws 1.5px outlines, not MUI's default 1px, and its
        // default outlined button is neutral (outline-variant on grey) rather
        // than brand-tinted — brand color is reserved for the active state.
        outlined: {
          borderWidth: 1.5,
          borderColor: md3.outlineVariant,
          color: md3.onSurfaceVariant,
          '&:hover': { borderWidth: 1.5, backgroundColor: md3.surfaceContainer },
        },
        sizeSmall: { padding: '7px 14px', fontSize: 13 },
        sizeMedium: { padding: '9px 16px', fontSize: 13 },
        sizeLarge: { padding: '11px 20px', fontSize: 14 },
      },
    },
    MuiIconButton: {
      defaultProps: { size: 'small' },
      styleOverrides: {
        // `.icon-btn` is a 38px circle with a surface-high hover wash.
        root: {
          color: md3.onSurfaceVariant,
          '&:hover': { backgroundColor: md3.surfaceHigh },
        },
        sizeSmall: { width: 34, height: 34 },
        sizeMedium: { width: 38, height: 38 },
      },
    },
    MuiToggleButtonGroup: {
      defaultProps: { size: 'small' },
      styleOverrides: { root: { borderRadius: radius.md } },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          borderColor: md3.outlineVariant,
          borderWidth: 1.5,
          color: md3.onSurfaceVariant,
          fontWeight: 700,
          fontSize: 12,
          padding: '6px 12px',
          textTransform: 'none',
          '&.Mui-selected': {
            backgroundColor: md3.primaryContainer,
            color: md3.primary,
            borderColor: md3.primary,
            '&:hover': { backgroundColor: md3.primaryContainer },
          },
        },
      },
    },

    // --- Chips (the prototype's most-used control) -------------------------
    MuiChip: {
      defaultProps: { size: 'small' },
      styleOverrides: {
        // `.lv-chip` / `.guest-chip` / `.golfer-chip`: pill, 1.5px outline,
        // bold 12px label, filling with primary-container when active.
        root: { borderRadius: radius.xl, fontWeight: 700, fontSize: 12 },
        outlined: { borderWidth: 1.5, borderColor: md3.outlineVariant },
        sizeSmall: { height: 28 },
        sizeMedium: { height: 32 },
        label: { paddingLeft: 10, paddingRight: 10 },
      },
    },

    // --- Inputs ------------------------------------------------------------
    MuiTextField: { defaultProps: { size: 'small' } },
    MuiInputBase: { styleOverrides: { root: { fontSize: 13 } } },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: radius.md,
          backgroundColor: '#ffffff',
          '& .MuiOutlinedInput-notchedOutline': {
            borderWidth: 1.5,
            borderColor: md3.outlineVariant,
          },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: md3.outline },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderWidth: 1.5 },
        },
        input: { paddingTop: 9, paddingBottom: 9 },
      },
    },
    MuiInputLabel: { styleOverrides: { root: { fontSize: 13 } } },
    MuiFormControlLabel: { styleOverrides: { label: { fontSize: 13 } } },
    MuiFormHelperText: { styleOverrides: { root: { fontSize: 11 } } },
    MuiSelect: { defaultProps: { size: 'small' } },

    // --- Selection controls ------------------------------------------------
    MuiCheckbox: {
      defaultProps: { size: 'small' },
      styleOverrides: { root: { padding: 6 } },
    },
    MuiRadio: {
      defaultProps: { size: 'small' },
      styleOverrides: { root: { padding: 6 } },
    },
    MuiSwitch: { defaultProps: { size: 'small' } },

    // --- Lists, menus, tabs ------------------------------------------------
    MuiMenuItem: { styleOverrides: { root: { minHeight: 38, fontSize: 13 } } },
    MuiListItemButton: { styleOverrides: { root: { minHeight: 38 } } },
    MuiMenu: {
      styleOverrides: {
        // Menus are the `.ctx-menu` treatment: 16px radius, 1.5px hairline, e3.
        paper: {
          borderRadius: radius.lg,
          border: `1.5px solid ${md3.outlineVariant}`,
          boxShadow: elevation.e3,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          minHeight: 42,
          fontSize: 13,
          fontWeight: 700,
          textTransform: 'none',
          color: md3.onSurfaceVariant,
        },
      },
    },
    MuiTabs: { styleOverrides: { root: { minHeight: 42 } } },
    MuiDivider: { styleOverrides: { root: { borderColor: md3.outlineVariant } } },

    // --- Surfaces ----------------------------------------------------------
    MuiPaper: { styleOverrides: { rounded: { borderRadius: radius.md } } },
    MuiCard: {
      defaultProps: { variant: 'outlined' },
      styleOverrides: {
        // `.lv-card`: 16px radius with a 1.5px outline-variant hairline.
        root: { borderRadius: radius.lg, borderWidth: 1.5, borderColor: md3.outlineVariant },
      },
    },
    MuiDialog: {
      styleOverrides: { paper: { borderRadius: radius.lg, boxShadow: elevation.e3 } },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: { backgroundColor: md3.scrim, fontSize: 11, borderRadius: radius.sm },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { fontSize: 12, borderColor: md3.outlineVariant, padding: '8px 12px' },
        head: { fontWeight: 800, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.5px' },
      },
    },
  },
});

export default theme;
