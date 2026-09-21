import { createTheme } from '@mui/material/styles';
import { theme } from './theme';
import { md3, mobile, radius } from './tokens';

/**
 * The Mobile Screens theme.
 *
 * The same palette and tokens as the terminal theme, so a booking badge or a member
 * dot reads identically on both — but with the density inverted. The terminal is
 * mouse-driven at 1366×840; this is a thumb on a 402dp-wide phone, so it follows MD3's
 * touch-first type scale and component sizes instead.
 *
 * Only `MobileApp` wraps itself in this. Nothing outside `src/pos/mobile` is affected.
 *
 * Typography variants are MUI's names mapped onto MD3 roles:
 *   h4 → headline small · h5 → title large · h6 → title medium
 *   subtitle1 → title medium · subtitle2 → title small
 *   body1 → body large · body2 → body medium · caption → body small
 *   overline → label medium (not the terminal's tiny tracked caps)
 */
export const mobileTheme = createTheme(theme, {
  typography: {
    fontSize: 14,
    h1: { fontSize: 36, fontWeight: 400, lineHeight: 1.22 },
    h2: { fontSize: 32, fontWeight: 400, lineHeight: 1.25 },
    h3: { fontSize: 28, fontWeight: 400, lineHeight: 1.29 },
    h4: { fontSize: 24, fontWeight: 400, lineHeight: 1.33 },
    h5: { fontSize: 22, fontWeight: 400, lineHeight: 1.27 },
    h6: { fontSize: 16, fontWeight: 500, lineHeight: 1.5, letterSpacing: 0.15 },
    subtitle1: { fontSize: 16, fontWeight: 500, lineHeight: 1.5, letterSpacing: 0.15 },
    subtitle2: { fontSize: 14, fontWeight: 500, lineHeight: 1.43, letterSpacing: 0.1 },
    body1: { fontSize: 16, lineHeight: 1.5, letterSpacing: 0.5 },
    body2: { fontSize: 14, lineHeight: 1.43, letterSpacing: 0.25 },
    caption: { fontSize: 12, lineHeight: 1.33, letterSpacing: 0.4, color: md3.onSurfaceVariant },
    overline: {
      fontSize: 12,
      fontWeight: 500,
      lineHeight: 1.33,
      letterSpacing: 0.5,
      textTransform: 'none',
    },
    button: { fontSize: 14, fontWeight: 500, letterSpacing: 0.1, textTransform: 'none' },
  },
  components: {
    MuiButton: {
      defaultProps: { size: 'medium' },
      styleOverrides: {
        // MD3 common buttons: 40dp tall, full pill, 24dp side padding.
        root: { minHeight: 40, borderRadius: 999, fontWeight: 500 },
        sizeSmall: { padding: '6px 16px', fontSize: 14 },
        sizeMedium: { padding: '10px 24px', fontSize: 14 },
        sizeLarge: { padding: '14px 24px', fontSize: 16, minHeight: 56 },
        outlined: { borderWidth: 1, borderColor: md3.outline, color: md3.primary },
      },
    },
    MuiIconButton: {
      defaultProps: { size: 'medium' },
      styleOverrides: {
        // 40dp visual, 48dp target — the margin makes up the difference.
        root: { color: md3.onSurfaceVariant },
        sizeSmall: { width: 40, height: 40 },
        sizeMedium: { width: 48, height: 48 },
      },
    },
    MuiChip: {
      defaultProps: { size: 'medium' },
      styleOverrides: {
        // MD3 filter/assist chips: 32dp tall, 8dp corners (not pills).
        root: { height: 32, borderRadius: radius.sm, fontSize: 14, fontWeight: 500 },
      },
    },
    MuiTextField: { defaultProps: { size: 'medium', variant: 'outlined', fullWidth: true } },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { borderRadius: 4, fontSize: 16 },
        input: { padding: '16px' },
      },
    },
    MuiInputLabel: { styleOverrides: { root: { fontSize: 16 } } },
    MuiInputBase: { styleOverrides: { root: { fontSize: 16 } } },
    MuiSelect: { defaultProps: { size: 'medium' } },
    MuiFormControlLabel: { styleOverrides: { label: { fontSize: 16 } } },
    MuiFormHelperText: { styleOverrides: { root: { fontSize: 12 } } },
    MuiMenuItem: { styleOverrides: { root: { minHeight: 48, fontSize: 16 } } },
    MuiTabs: { styleOverrides: { root: { minHeight: 48 } } },
    MuiListItemButton: {
      styleOverrides: { root: { minHeight: mobile.listItem.one, paddingLeft: 16, paddingRight: 24 } },
    },
    MuiListItemIcon: { styleOverrides: { root: { minWidth: 40, color: md3.onSurfaceVariant } } },
    MuiListItemText: {
      defaultProps: {
        slotProps: {
          primary: { variant: 'body1' },
          secondary: { variant: 'body2', color: md3.onSurfaceVariant },
        },
      },
    },
    MuiListSubheader: {
      styleOverrides: {
        root: {
          fontSize: 14,
          fontWeight: 500,
          color: md3.primary,
          lineHeight: '48px',
          backgroundColor: 'inherit',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: { minHeight: 48, fontSize: 14, fontWeight: 500, textTransform: 'none' },
      },
    },
    MuiSwitch: { defaultProps: { size: 'medium' } },
    MuiCheckbox: { defaultProps: { size: 'medium' } },
    MuiRadio: { defaultProps: { size: 'medium' } },
    MuiToggleButton: {
      styleOverrides: { root: { minHeight: 40, fontSize: 14, fontWeight: 500 } },
    },
    MuiFab: {
      styleOverrides: {
        // MD3 FABs are rounded squares, not circles.
        root: { borderRadius: radius.lg, boxShadow: '0 4px 8px 3px rgba(0,0,0,.15),0 1px 3px rgba(0,0,0,.3)' },
      },
    },
  },
});
