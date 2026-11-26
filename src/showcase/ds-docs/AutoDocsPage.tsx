import { DocsPage, useOf } from '@storybook/addon-docs/blocks';
import { DsDocsPage } from './DsDocsPage';

/**
 * Storybook's autodocs page for every story file (`parameters.docs.page` in .storybook/preview.tsx).
 *
 * Design System entries get the Design System template — summary, In Birdie, anatomy, variants,
 * states, rules, decisions, engineering — so every style and component reads the same way and a new
 * one gets the template by being filed there. Everything else keeps Storybook's own page.
 */
export function AutoDocsPage() {
  const of = useOf('meta');
  return of.type === 'meta' && of.preparedMeta.title.startsWith('Design System/') ? <DsDocsPage /> : <DocsPage />;
}
