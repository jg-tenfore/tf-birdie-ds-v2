/// <reference types="vitest/config" />
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';

const dirname =
  typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

/**
 * Vite config for the prototype app and the Storybook story-smoke test project.
 *
 * The story tests render every story in a real Chromium and fail on any runtime error, so
 * they're the check that catches a crash in a screen that nobody clicked through by hand.
 *
 * See https://storybook.js.org/docs/writing-tests/integrations/vitest-addon
 */
export default defineConfig({
  plugins: [react()],

  optimizeDeps: {
    // `aria-query` ships CJS with no named ESM exports. The a11y addon's setup file does
    // `import { elementRoles } from 'aria-query'`, which Vite can't satisfy from the raw
    // source — every test file then fails to import before a single story renders.
    // Forcing it through esbuild's pre-bundle synthesizes the named exports.
    // (This scaffold inherited the breakage from goose-kds, where the suite is dead for the
    // same reason.)
    include: ['aria-query', 'lz-string', 'dom-accessibility-api', 'css.escape', 'pretty-format'],
  },

  test: {
    projects: [
      // Plain unit tests for the pure modules — pricing, scheduling, the URL codec.
      // Node environment, no browser, so they run in a second rather than a minute.
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          include: ['src/**/*.test.ts'],
        },
      },
      // Mounts every story in a real Chromium and fails on any runtime error.
      {
        extends: true,
        plugins: [storybookTest({ configDir: path.join(dirname, '.storybook') })],
        test: {
          name: 'storybook',
          // No `include`: the Storybook plugin indexes from `.storybook/main.ts`'s
          // `stories` field, and setting it here is ignored with a warning.
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({}),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
});
