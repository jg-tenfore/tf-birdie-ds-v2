import { addons } from 'storybook/manager-api';
import { create } from 'storybook/theming';

/**
 * Storybook chrome.
 *
 * The sidebar brand is the TenFore wordmark over "Birdie / Design System" — the same two-line
 * lockup as TF Crane's, so the TenFore design-system Storybooks read as one family and still
 * say which one this is. It links to Start Here › Overview; the prototypes are one click
 * from there.
 *
 * The logo is `static/tenfore-logo.svg` (served by `staticDirs` in `main.ts`), addressed
 * relatively so it resolves both locally and under GitHub Pages' `/tf-birdie-ds-v2/`.
 *
 * The palette is the POS brand green from `src/theme/tokens.ts`, duplicated as literals
 * because the manager bundle is built separately from the preview and can't import from
 * `src/`.
 */
addons.setConfig({
  theme: create({
    base: 'light',
    brandTitle: `<span style="display:flex;flex-direction:column;gap:8px;font-family:'Google Sans','Google Sans Text',Roboto,'Helvetica Neue',Arial,sans-serif">
        <img src="tenfore-logo.svg" width="112" height="30" alt="TenFore" style="display:block" />
        <span style="display:flex;flex-direction:column;line-height:1.15;padding-left:2px">
            <span style="font-size:16px;font-weight:700;color:#191d19">Birdie</span>
            <span style="font-size:10.5px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;color:#707973">Design System</span>
        </span>
    </span>`,
    brandUrl: './?path=/docs/start-here-overview--overview',
    brandTarget: '_self',

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
    // Roots as headings (Start Here, Prototypes, Design System, Reviews, Archive), and the
    // archive kept rather than featured: it starts closed.
    showRoots: true,
    collapsedRoots: ['archive'],
  },
});
