import type { StorybookConfig } from '@storybook/react-vite';

/**
 * Storybook configuration.
 *
 * `docs.defaultName: 'Overview'` because `tags: ['autodocs']` in `preview.tsx` gives every
 * story a docs page, and "Docs" reads as boilerplate next to sixty screen stories.
 */
const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    '@chromatic-com/storybook',
    '@storybook/addon-vitest',
    '@storybook/addon-a11y',
    '@storybook/addon-docs',
    '@storybook/addon-mcp',
  ],
  framework: '@storybook/react-vite',
  docs: { defaultName: 'Overview' },
};

export default config;
