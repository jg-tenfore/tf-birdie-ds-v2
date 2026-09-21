import type { StorybookConfig } from '@storybook/react-vite';
import remarkGfm from 'remark-gfm';

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
    // GitHub-flavoured Markdown, so the docs pages' tables render as tables. MDX 3 leaves
    // GFM out, and without it every `| a | b |` block prints as literal pipes.
    {
      name: '@storybook/addon-docs',
      options: { mdxPluginOptions: { mdxCompileOptions: { remarkPlugins: [remarkGfm] } } },
    },
    '@storybook/addon-mcp',
  ],
  framework: '@storybook/react-vite',
  docs: { defaultName: 'Overview' },
};

export default config;
