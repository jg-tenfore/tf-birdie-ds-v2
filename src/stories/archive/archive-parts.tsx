/**
 * Archive › About the archive: a folder card with its counts, read from `ARCHIVE_FOLDERS` (generated
 * from the Storybook index by `scripts/gen-screen-index.mjs`), so no count on the page is typed.
 */
import type { ReactNode } from 'react';
import { ARCHIVE_FOLDERS } from '../prototypes/screen-index-data';
import { DOC, NavCard } from '../docs-kit/docs-kit';

const folder = (name: string) => {
  const f = ARCHIVE_FOLDERS.find((x) => x.name === name);
  if (!f) throw new Error(`About the archive: no Archive folder "${name}". Regenerate screen-index-data.ts.`);
  return f;
};

/** Every story in the Archive. */
export const archiveStoryCount = () => ARCHIVE_FOLDERS.reduce((n, f) => n + f.stories, 0);

/** An Archive folder: when, how many stories, what it was, what replaced it. */
export const ArchiveFolderCard = ({ folder: name, eyebrow, title, replaced, children }: { folder: string; eyebrow: string; title: ReactNode; replaced: ReactNode; children: ReactNode }) => {
  const f = folder(name);
  return (
    <NavCard eyebrow={`${eyebrow} · ${f.stories} ${f.stories === 1 ? 'story' : 'stories'}`} title={title} to={f.firstId} cta="Open it">
      {children}
      <div style={{ marginTop: 8, color: DOC.muted }}>Replaced by {replaced}.</div>
    </NavCard>
  );
};
