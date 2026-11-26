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
  // `static/` holds the sidebar's TenFore logo and `legacy-redirects.js`, which sends links to
  // pages moved in the Nov 26 regroup to their new ids (loaded by manager-head.html and
  // preview-head.html).
  //
  // `static/docs` is the docs pages' art and screenshots (`scripts/capture-screens.mjs`), served
  // at `/docs` so MDX can use relative URLs (`docs/hero-overview.webp`) that hold locally and
  // under the Pages base. It lives here rather than in `public/` because Vite copies all of
  // `public/` into every prototype build, and the prototypes have no use for 2.6 MB of docs art.
  staticDirs: ['./static'],
  docs: { defaultName: 'Overview' },
  // Storybook's own onboarding (the "Become an expert" checklist, its menu guide) and "what's
  // new" toasts sit at the top of the sidebar and push the docs down; this Storybook is for
  // reviewing Birdie, not learning Storybook.
  core: { disableWhatsNewNotifications: true },
  features: { sidebarOnboardingChecklist: false, menuOnboardingChecklist: false },
};

export default config;
