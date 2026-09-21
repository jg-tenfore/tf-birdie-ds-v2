import type { ReactNode } from 'react';
import { parseStoryExports, storyId, storyNameFromExport } from './story-meta';

/**
 * Every Mobile Screens story, read straight from the story files.
 *
 * Nothing here is retyped: adding a story to `src/showcase/pos-mobile/` adds a screen to the
 * prototype on the next build. Modules give the render/play functions; the raw source gives
 * the authored order and each story's JSDoc, which a module namespace can't (its keys are
 * sorted, and comments don't survive compilation).
 */

export interface StoryContextLike {
  canvasElement: HTMLElement;
}

interface StoryExport {
  render?: () => ReactNode;
  play?: (context: StoryContextLike) => Promise<void> | void;
}

interface StoryModule {
  default?: { title?: string };
  [exportName: string]: unknown;
}

export interface ScreenEntry {
  /** Storybook's story id — also this screen's hash route. */
  id: string;
  /** The section, i.e. meta.title after `Mobile Screens/` (`2 · Tee Sheet`). */
  section: string;
  /** Storybook's display name for the export (`Detail Players`). */
  name: string;
  exportName: string;
  description: string;
  render: () => ReactNode;
  play?: StoryExport['play'];
}

export interface ScreenSection {
  section: string;
  entries: ScreenEntry[];
}

const PREFIX = 'Mobile Screens/';

const modules = import.meta.glob<StoryModule>('../showcase/pos-mobile/*/*.stories.tsx', { eager: true });
const sources = import.meta.glob<string>('../showcase/pos-mobile/*/*.stories.tsx', {
  query: '?raw',
  import: 'default',
  eager: true,
});

function buildIndex(): ScreenEntry[] {
  // Paths start with the numbered section folder (`0-navigation`, `1-register` …), so a
  // path sort is Storybook's sidebar order too.
  const paths = Object.keys(modules).sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
  const entries: ScreenEntry[] = [];
  for (const path of paths) {
    const mod = modules[path];
    const title = mod.default?.title;
    if (!title) continue;
    const section = title.startsWith(PREFIX) ? title.slice(PREFIX.length) : title;
    for (const { exportName, description } of parseStoryExports(sources[path] ?? '')) {
      if (exportName === 'default' || exportName === '__namedExportsOrder') continue;
      const story = mod[exportName] as StoryExport | undefined;
      if (!story || typeof story !== 'object' || typeof story.render !== 'function') continue;
      entries.push({
        id: storyId(title, exportName),
        section,
        name: storyNameFromExport(exportName),
        exportName,
        description,
        render: story.render,
        play: story.play,
      });
    }
  }
  return entries;
}

export const SCREENS: ScreenEntry[] = buildIndex();

export const SECTIONS: ScreenSection[] = SCREENS.reduce<ScreenSection[]>((acc, entry) => {
  const last = acc[acc.length - 1];
  if (last?.section === entry.section) last.entries.push(entry);
  else acc.push({ section: entry.section, entries: [entry] });
  return acc;
}, []);

/** `#/` — the live app from the Tee Sheet root: the 0 · Navigation / Interactive story. */
export const HOME_ID = 'mobile-screens-0-·-navigation--interactive';

export const HOME: ScreenEntry = SCREENS.find((s) => s.id === HOME_ID) ?? SCREENS[0];

const byId = new Map(SCREENS.map((s) => [s.id, s]));

export function findScreen(id: string): ScreenEntry | undefined {
  return byId.get(id);
}
