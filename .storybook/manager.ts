import { addons } from 'storybook/manager-api';
import { create } from 'storybook/theming';

/**
 * Storybook chrome.
 *
 * Two reasons this file exists beyond vanity: the sidebar brand names the system (three
 * TenFore design-system Storybooks look identical otherwise), and `brandUrl` points at
 * the prototype — the sibling deliverable people arriving here usually want next.
 *
 * The palette is the POS brand green from `src/theme/tokens.ts`, duplicated as literals
 * because the manager bundle is built separately from the preview and can't import from
 * `src/`.
 */
addons.setConfig({
  theme: create({
    base: 'light',
    brandTitle: '⛳ Birdie POS — Design System',
    brandUrl: './prototype/',
    brandTarget: '_blank',

    colorPrimary: '#17a34a',
    colorSecondary: '#17a34a',

    appBg: '#f8faf8',
    appContentBg: '#ffffff',
    appBorderColor: '#c0c9c1',
    appBorderRadius: 8,

    textColor: '#191d19',
    textInverseColor: '#ffffff',
    textMutedColor: '#707973',

    barTextColor: '#404943',
    barSelectedColor: '#17a34a',
    barBg: '#ffffff',

    inputBg: '#ffffff',
    inputBorder: '#c0c9c1',
    inputTextColor: '#191d19',
    inputBorderRadius: 8,

    fontBase: "'Google Sans', 'Google Sans Text', Roboto, 'Helvetica Neue', Arial, sans-serif",
  }),
  sidebar: {
    // POS Screens has seven numbered sections; leaving them expanded buries everything else.
    showRoots: true,
  },
});
