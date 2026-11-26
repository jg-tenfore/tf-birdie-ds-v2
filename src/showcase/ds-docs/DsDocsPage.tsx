import type { ReactNode } from 'react';
import { Controls, Primary, Source, Stories, useOf } from '@storybook/addon-docs/blocks';
import {
  Banner,
  Bullets,
  Callout,
  Code,
  DOC,
  DocLink,
  DocPage,
  DocTable,
  Grid,
  Pill,
  ScreenCard,
  Section,
  StatusPill,
  art as artUrl,
  mobilePrototype,
  screen,
  tabletPrototype,
} from '../../stories/docs-kit/docs-kit';
import { MUI_USAGE } from './ds-usage-data';
import type { DsDoc, DsStatus } from './types';

/**
 * The page every Design System entry renders: a style or a component, presented the way a senior
 * product designer would walk stakeholders and engineers through it in one sitting.
 *
 * Order is fixed, top to bottom, from "what and why" to "how to build it":
 *
 *  1. **Banner** — name, one-paragraph summary, status, where it's used (computed), sources.
 *  2. **At a glance** — use it for / don't use it for / what Birdie builds on it.
 *  3. **In Birdie** — the real product: screenshots with what to notice, and links into the prototype.
 *  4. **Live** — the primary story and, for components, its controls.
 *  5. **Anatomy · Variants · States · Sizing** — the parts and the choices.
 *  6. **Behavior · Content · Do and don't · Accessibility** — the rules.
 *  7. **Decisions** — what was chosen and why.
 *  8. **For engineers** — import, Birdie components, theme override, tokens, snippet, files using it.
 *  9. **All examples** — every story on the page.
 * 10. **Related**.
 *
 * Content comes from `content/<meta id>.tsx` (see `types.ts`). A page without content still renders
 * its stories, under a note that says the write-up is missing — never a blank page.
 */

const CONTENT = import.meta.glob<DsDoc>('./content/*.tsx', { eager: true, import: 'default' });
const byId: Record<string, DsDoc> = Object.fromEntries(
  Object.entries(CONTENT).map(([file, doc]) => [file.split('/').pop()!.replace(/\.tsx$/, ''), doc]),
);

/** The content for a page, by its meta id — exported for the Design System overview's index. */
export const dsDocFor = (id: string): DsDoc | undefined => byId[id];

export const STATUS: Record<DsStatus, { label: string; tone: 'done' | 'now' | 'next' | 'parked'; meaning: string }> = {
  core: { label: 'Core', tone: 'now', meaning: 'Used on both the tablet and the handheld — the default choice.' },
  'in-use': { label: 'In use', tone: 'done', meaning: 'Used in the product today.' },
  available: { label: 'Available', tone: 'next', meaning: 'Themed and documented, not used by a Birdie screen yet. Fine to adopt.' },
  avoid: { label: 'Avoid', tone: 'parked', meaning: 'Documented so nobody reaches for it: Birdie does this another way.' },
};

/** Distinct files using any of `names`, per surface, from the generated scan. */
export function usageOf(names: string[] = []) {
  const tablet = new Set<string>();
  const handheld = new Set<string>();
  for (const n of names) {
    MUI_USAGE[n]?.tablet.forEach((f) => tablet.add(f));
    MUI_USAGE[n]?.handheld.forEach((f) => handheld.add(f));
  }
  return { tablet: [...tablet].sort(), handheld: [...handheld].sort() };
}

export function statusOf(doc: DsDoc | undefined): DsStatus {
  if (doc?.status) return doc.status;
  const u = usageOf(doc?.mui);
  if (u.tablet.length && u.handheld.length) return 'core';
  if (u.tablet.length || u.handheld.length) return 'in-use';
  return 'available';
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Two columns: green "Do", red "Don't". */
function DoDont({ dos = [], donts = [] }: { dos?: ReactNode[]; donts?: ReactNode[] }) {
  const col = (title: string, items: ReactNode[], ok: boolean) => (
    <div style={{ borderRadius: 18, background: '#fff', boxShadow: `inset 0 0 0 1px ${DOC.line}`, overflow: 'hidden' }}>
      <div style={{ height: 6, background: ok ? DOC.brand : '#c2410c' }} />
      <div style={{ padding: '16px 20px 20px' }}>
        <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1.2, textTransform: 'uppercase', color: ok ? DOC.brandDeep : '#9a3412', marginBottom: 10 }}>
          {ok ? '✓ ' : '✕ '}
          {title}
        </div>
        <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14, lineHeight: '22px', color: DOC.body }}>
          {items.map((it, i) => (
            <li key={i}>{it}</li>
          ))}
        </ul>
      </div>
    </div>
  );
  return (
    <Grid cols={2}>
      {dos.length > 0 && col('Do', dos, true)}
      {donts.length > 0 && col("Don't", donts, false)}
    </Grid>
  );
}

/** A plain list card for the "At a glance" row. */
function GlanceCard({ title, items, tone = 'plain' }: { title: ReactNode; items: ReactNode[]; tone?: 'plain' | 'mint' | 'amber' }) {
  const bg = tone === 'mint' ? DOC.mintSoft : tone === 'amber' ? DOC.amber : '#fff';
  return (
    <div style={{ borderRadius: 18, background: bg, padding: 20, boxShadow: `inset 0 0 0 1px ${DOC.line}`, height: '100%' }}>
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1.3, textTransform: 'uppercase', color: DOC.muted, marginBottom: 10 }}>{title}</div>
      <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, lineHeight: '21px', color: DOC.body }}>
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </div>
  );
}

function FileList({ files }: { files: string[] }) {
  return (
    <ul style={{ margin: '8px 0 0', paddingLeft: 18, columns: files.length > 8 ? 2 : 1, fontSize: 12.5, lineHeight: '20px', color: DOC.body }}>
      {files.map((f) => (
        <li key={f} style={{ breakInside: 'avoid' }}>
          <Code>{f.replace(/^src\/pos\//, '')}</Code>
        </li>
      ))}
    </ul>
  );
}

export function DsDocsPage() {
  const of = useOf('meta');
  if (of.type !== 'meta') return null;
  const { preparedMeta } = of;
  const id = preparedMeta.id;
  const title = preparedMeta.title;
  const parts = title.split('/');
  const name = parts[parts.length - 1];
  const group = parts.slice(1, -1).join(' · ');
  const isComponent = parts[1] === 'Components';
  const doc = byId[id];
  const status = statusOf(doc);
  const usage = usageOf(doc?.mui);

  const pills = (
    <>
      <StatusPill tone={STATUS[status].tone}>{STATUS[status].label}</StatusPill>
      {doc?.mui && doc.mui.length > 0 && (
        <>
          <Pill>{usage.tablet.length ? `Tablet · ${plural(usage.tablet.length, 'file')}` : 'Not on the tablet'}</Pill>
          <Pill>{usage.handheld.length ? `Handheld · ${plural(usage.handheld.length, 'file')}` : 'Not on the handheld'}</Pill>
        </>
      )}
      {doc?.mui?.map((m) => (
        <Pill key={m} tone="mint">
          MUI {m}
        </Pill>
      ))}
      {doc?.birdie?.map((b) => (
        <Pill key={b.name} tone="brand">
          {b.name}
        </Pill>
      ))}
    </>
  );

  return (
    <DocPage>
      <Banner eyebrow={`Design System · ${group}`} title={name} pills={pills} art={doc?.art ? artUrl(doc.art) : undefined}>
        {doc?.summary ?? (
          <>
            This page has its live examples but no write-up yet. Its content goes in{' '}
            <Code>{`src/showcase/ds-docs/content/${id}.tsx`}</Code>.
          </>
        )}
        {doc && (
          <div style={{ marginTop: 10, fontSize: 13.5, color: DOC.muted }}>
            <strong style={{ color: DOC.ink }}>{STATUS[status].label}:</strong> {doc.statusNote ?? STATUS[status].meaning}
          </div>
        )}
      </Banner>

      {doc && (doc.useFor || doc.dontUseFor || doc.birdie) && (
        <Section title="At a glance">
          <Grid cols={3}>
            {doc.useFor && <GlanceCard title="Use it for" items={doc.useFor} tone="mint" />}
            {doc.dontUseFor && <GlanceCard title="Not for" items={doc.dontUseFor} tone="amber" />}
            {doc.birdie && (
              <GlanceCard
                title="Birdie builds on it"
                items={doc.birdie.map((b) => (
                  <>
                    <strong>{b.name}</strong>
                    {b.surface && b.surface !== 'both' ? ` (${b.surface})` : ''} — {b.use}
                  </>
                ))}
              />
            )}
          </Grid>
        </Section>
      )}

      {doc?.inBirdie && doc.inBirdie.length > 0 && (
        <Section title="In Birdie" intro="Where it shows up in the product today. Each card opens the prototype at that screen, or the story that holds it still.">
          <Grid cols={doc.inBirdie.length >= 3 ? 3 : 2}>
            {doc.inBirdie.map((ex, i) => {
              const links: { label: ReactNode; to?: string; href?: string }[] = [];
              if (ex.tabletHash) links.push({ label: 'Open on the tablet', href: tabletPrototype(ex.tabletHash) });
              if (ex.handheldRoute) links.push({ label: 'Open on the handheld', href: mobilePrototype(ex.handheldRoute) });
              if (ex.storyId) links.push({ label: 'Story', to: ex.storyId });
              return ex.shot ? (
                <ScreenCard key={i} src={screen(ex.shot)} frame={ex.frame ?? (ex.handheldRoute ? 'handheld' : 'terminal')} title={ex.label} links={links}>
                  {ex.caption}
                </ScreenCard>
              ) : (
                <div key={i} style={{ borderRadius: 18, background: '#fff', padding: 20, boxShadow: `inset 0 0 0 1px ${DOC.line}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: 16, fontWeight: 600, color: DOC.ink }}>{ex.label}</div>
                  <div style={{ fontSize: 14, lineHeight: '22px', color: DOC.body, flex: 1 }}>{ex.caption}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px' }}>
                    {links.map((l, j) => (
                      <DocLink key={j} to={l.to} href={l.href}>
                        {l.label}
                      </DocLink>
                    ))}
                  </div>
                </div>
              );
            })}
          </Grid>
        </Section>
      )}

      <Section
        title={isComponent ? 'Live' : 'Reference'}
        intro={isComponent ? 'The primary example, themed exactly as the product themes it. Change its props below.' : undefined}
      >
        <Primary />
        {isComponent && preparedMeta.component && <Controls />}
      </Section>

      {doc?.anatomy && (
        <Section title="Anatomy">
          <DocTable columns={['#', 'Part', 'What it does']} widths={[44, '28%', 'auto']} rows={doc.anatomy.map((a, i) => [i + 1, <strong key="p">{a.part}</strong>, a.description])} />
        </Section>
      )}

      {doc?.variants && (
        <Section title="Variants" intro="Pick the variant by the job, not the look.">
          <DocTable
            columns={['Variant', 'Use it for', 'Avoid']}
            widths={['22%', 'auto', '32%']}
            rows={doc.variants.map((v) => [<strong key="n">{v.name}</strong>, v.use, v.avoid ?? '—'])}
          />
        </Section>
      )}

      {doc?.states && (
        <Section title="States">
          <DocTable
            columns={['State', 'Tablet (counter terminal)', 'Handheld']}
            widths={['18%', 'auto', 'auto']}
            rows={doc.states.map((s) => [<strong key="s">{s.state}</strong>, s.tablet, s.handheld ?? 'Same as the tablet.'])}
          />
        </Section>
      )}

      {doc?.sizing && (
        <Section title="Size and density" intro="The counter terminal is mouse-first and dense; the handheld is a thumb. The same component is sized for each.">
          <DocTable columns={['Surface', 'Size', 'Why']} widths={['18%', '26%', 'auto']} rows={doc.sizing.map((s) => [<strong key="s">{s.surface}</strong>, s.size, s.why])} />
        </Section>
      )}

      {doc?.behavior && (
        <Section title="Behavior">
          <Bullets items={doc.behavior.map((b) => ['', b])} />
        </Section>
      )}

      {doc?.content && (
        <Section title="Content" intro="Words on the component: labels, tone, numbers and money.">
          <Bullets items={doc.content.map((b) => ['', b])} />
        </Section>
      )}

      {(doc?.dos || doc?.donts) && (
        <Section title="Do and don't">
          <DoDont dos={doc.dos} donts={doc.donts} />
        </Section>
      )}

      {doc?.a11y && (
        <Section title="Accessibility">
          <Bullets items={doc.a11y.map((b) => ['', b])} />
        </Section>
      )}

      {doc?.decisions && (
        <Section title="Decisions" intro="What was chosen, and why — the questions this page gets asked.">
          <DocTable columns={['Decision', 'Why']} widths={['38%', 'auto']} rows={doc.decisions.map((d) => [<strong key="d">{d.decision}</strong>, d.why])} />
        </Section>
      )}

      {doc && (doc.engineering || doc.tokens || doc.birdie || (doc.mui && doc.mui.length > 0)) && (
        <Section title="For engineers">
          {doc.engineering?.import && <Source code={doc.engineering.import} language="tsx" dark={false} />}
          {doc.birdie && (
            <>
              <h3 style={{ margin: '24px 0 10px', fontSize: 16, fontWeight: 600, color: DOC.ink }}>Birdie components</h3>
              <DocTable
                columns={['Component', 'File', 'Use it when']}
                widths={['20%', '34%', 'auto']}
                rows={doc.birdie.map((b) => [<strong key="n">{b.name}</strong>, <Code key="f">{b.file}</Code>, b.use])}
              />
            </>
          )}
          {doc.engineering?.themeOverride && (
            <Callout title="Theme override">{doc.engineering.themeOverride}</Callout>
          )}
          {doc.tokens && (
            <>
              <h3 style={{ margin: '24px 0 10px', fontSize: 16, fontWeight: 600, color: DOC.ink }}>Tokens</h3>
              <DocTable columns={['Token', 'Value', 'Role']} widths={['28%', '20%', 'auto']} rows={doc.tokens.map((t) => [t.token, t.value, t.role])} />
            </>
          )}
          {doc.engineering?.notes && (
            <>
              <h3 style={{ margin: '24px 0 10px', fontSize: 16, fontWeight: 600, color: DOC.ink }}>Notes</h3>
              <Bullets items={doc.engineering.notes.map((n) => ['', n])} />
            </>
          )}
          {doc.engineering?.snippet && (
            <>
              <h3 style={{ margin: '24px 0 10px', fontSize: 16, fontWeight: 600, color: DOC.ink }}>Example</h3>
              <Source code={doc.engineering.snippet} language="tsx" dark={false} />
            </>
          )}
          {doc.mui && doc.mui.length > 0 && (
            <>
              <h3 style={{ margin: '24px 0 4px', fontSize: 16, fontWeight: 600, color: DOC.ink }}>Where the product uses it</h3>
              <div style={{ fontSize: 13, color: DOC.muted }}>
                Generated from the imports in <Code>src/pos</Code> by <Code>scripts/gen-ds-usage.mjs</Code>.
              </div>
              {usage.tablet.length + usage.handheld.length === 0 ? (
                <p style={{ fontSize: 14, color: DOC.body }}>No Birdie screen imports it yet.</p>
              ) : (
                <Grid cols={2} style={{ marginTop: 8 }}>
                  <div>
                    <strong style={{ fontSize: 14 }}>Tablet · {usage.tablet.length}</strong>
                    {usage.tablet.length > 0 && <FileList files={usage.tablet} />}
                  </div>
                  <div>
                    <strong style={{ fontSize: 14 }}>Handheld · {usage.handheld.length}</strong>
                    {usage.handheld.length > 0 && <FileList files={usage.handheld} />}
                  </div>
                </Grid>
              )}
            </>
          )}
        </Section>
      )}

      <Section title="All examples">
        <Stories includePrimary={false} title="" />
      </Section>

      {doc?.related && doc.related.length > 0 && (
        <Section title="Related">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 20px' }}>
            {doc.related.map((r) => (
              <DocLink key={r.id} to={`${r.id}--overview`}>
                {r.name}
              </DocLink>
            ))}
          </div>
        </Section>
      )}
    </DocPage>
  );
}
