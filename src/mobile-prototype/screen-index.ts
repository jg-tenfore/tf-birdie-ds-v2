import type { ReactNode } from 'react';
import { ARCHIVED_EDITION, buildEdition } from '../pos/edition';
import { parseStoryExports, storyId, storyNameFromExport } from './story-meta';

/**
 * Every Mobile Screens story, read straight from the story files.
 *
 * Nothing here is retyped: adding a story to `src/showcase/pos-mobile/` adds a screen to the
 * prototype on the next build. Modules give the render/play functions; the raw source gives
 * the authored order and each story's JSDoc, which a module namespace can't (its keys are
 * sorted, and comments don't survive compilation).
 *
 * The files are read by **folder**, not by sidebar title. Since the Nov 26 regroup the Mobile
 * Screens files sit in Storybook under *Archive › Original port › Mobile* and Weston's phone
 * files under *Prototypes › Mobile* (two of them under *Reviews*), but each pins its old story
 * id in its meta (`id:`), so every hash route here, and every "Open in Storybook" link, is the
 * id it was before the move.
 */

export interface StoryContextLike {
  canvasElement: HTMLElement;
}

interface StoryExport {
  render?: () => ReactNode;
  play?: (context: StoryContextLike) => Promise<void> | void;
}

interface StoryModule {
  /** `id` is the pinned component id; Storybook builds story ids from it rather than the title. */
  default?: { title?: string; id?: string };
  [exportName: string]: unknown;
}

export interface ScreenEntry {
  /** Storybook's story id — also this screen's hash route. */
  id: string;
  /** The section: the folder's number and the file's sidebar name (`2 · Tee Sheet`). */
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

const modules = import.meta.glob<StoryModule>('../showcase/pos-mobile/*/*.stories.tsx', { eager: true });
const sources = import.meta.glob<string>('../showcase/pos-mobile/*/*.stories.tsx', {
  query: '?raw',
  import: 'default',
  eager: true,
});

/**
 * Weston Edits' phone stories (`/weston-edits-mobile/` only). Globbed eagerly in every build
 * — Vite needs a static glob — but only indexed when the build's edition is `weston`, so the
 * base mobile prototypes list exactly what they did before.
 */
const westonModules = import.meta.glob<StoryModule>('../showcase/weston-edits/*/Mobile.stories.tsx', { eager: true });
const westonSources = import.meta.glob<string>('../showcase/weston-edits/*/Mobile.stories.tsx', {
  query: '?raw',
  import: 'default',
  eager: true,
});

/** `…/2-tee-sheet/TeeSheet.stories.tsx` → `2`: the folder's number, which orders the sections. */
const folderNumber = (path: string) => /\/(\d+)-[^/]+\/[^/]+$/.exec(path)?.[1] ?? '';

/** The file's own name in the sidebar: its title's last segment, ignoring a trailing `Mobile`. */
const sidebarName = (title: string) => {
  const parts = title.split('/');
  if (parts.length > 1 && parts[parts.length - 1] === 'Mobile') parts.pop();
  return parts[parts.length - 1];
};

/** `…/1-register/Register.stories.tsx` titled `…/Register & Order` → `1 · Register & Order`. */
const mobileSection = (title: string, path: string) => `${folderNumber(path)} · ${sidebarName(title)}`;

/** `…/1-reservation-panel/Mobile.stories.tsx` → `Weston Edits · 1 · Reservation panel`. */
const westonSection = (title: string, path: string) => `Weston Edits · ${mobileSection(title, path)}`;

function buildIndex(
  mods: Record<string, StoryModule>,
  srcs: Record<string, string>,
  sectionOf: (title: string, path: string) => string,
): ScreenEntry[] {
  // Paths start with the numbered section folder (`0-navigation`, `1-register` …), so a
  // path sort is Storybook's sidebar order too.
  const paths = Object.keys(mods).sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
  const entries: ScreenEntry[] = [];
  for (const path of paths) {
    const mod = mods[path];
    const title = mod.default?.title;
    if (!title) continue;
    const section = sectionOf(title, path);
    // Storybook builds a story's id from the meta's pinned `id` when there is one.
    const componentId = mod.default?.id ?? title;
    for (const { exportName, description } of parseStoryExports(srcs[path] ?? '')) {
      if (exportName === 'default' || exportName === '__namedExportsOrder') continue;
      const story = mod[exportName] as StoryExport | undefined;
      if (!story || typeof story !== 'object' || typeof story.render !== 'function') continue;
      entries.push({
        id: storyId(componentId, exportName),
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

/**
 * True when the phone prototype renders Weston's edits — the current phone (`v1v2` since Nov 26,
 * see `CURRENT_EDITION`), Weston Edits itself, or any edition built on them — and false only in the
 * archive (`base`).
 */
export const WESTON = buildEdition() !== ARCHIVED_EDITION;

const MOBILE_SCREENS = buildIndex(modules, sources, mobileSection);

/** The Weston Edits screens come first in their prototype, then every Mobile Screens story. */
export const SCREENS: ScreenEntry[] = WESTON
  ? [...buildIndex(westonModules, westonSources, westonSection), ...MOBILE_SCREENS]
  : MOBILE_SCREENS;

export const SECTIONS: ScreenSection[] = SCREENS.reduce<ScreenSection[]>((acc, entry) => {
  const last = acc[acc.length - 1];
  if (last?.section === entry.section) last.entries.push(entry);
  else acc.push({ section: entry.section, entries: [entry] });
  return acc;
}, []);

/**
 * `#/` — the live app from the Tee Sheet root: the 0 · Navigation / Interactive story, or in
 * the Weston Edits prototype its own free-running app (1 · Reservation Panel / From The Tee
 * Sheet), which renders the weston edition at the 18-hole club.
 */
export const HOME_ID = WESTON
  ? 'weston-edits-1-·-reservation-panel-mobile--from-the-tee-sheet'
  : 'mobile-screens-0-·-navigation--interactive';

export const HOME: ScreenEntry = SCREENS.find((s) => s.id === HOME_ID) ?? SCREENS[0];

const byId = new Map(SCREENS.map((s) => [s.id, s]));

export function findScreen(id: string): ScreenEntry | undefined {
  return byId.get(id);
}
