import { md3 } from '../../../theme/tokens';
import { Contrast } from '../Contrast';
import type { DsDoc } from '../types';

/**
 * Card Headers — MUI's CardHeader (avatar, title, subheader, action). Birdie has no MUI cards to put
 * it on; its headers belong to dialogs, the reservation panel, the tee sheet's courses and panel
 * sections, each a Birdie component.
 */
const doc: DsDoc = {
  summary: (
    <>
      The top of a container: what it is, the one or two facts that identify it, and its actions. MUI's <code>CardHeader</code>{' '}
      lays that out as avatar, title, subheader and an action. Birdie <strong>does not use it</strong>: it has no MUI cards to put it
      on. Its headers belong to <strong>dialogs</strong> (<code>ModalFrame</code>), the <strong>reservation panel</strong>, the tee
      sheet's <strong>course columns</strong>, and <strong>panel sections</strong> (<code>PanelHeading</code>,{' '}
      <code>SectionLabel</code>). On the handheld the screen's top app bar is the header.
    </>
  ),
  status: 'avoid',
  statusNote: (
    <>
      Not used and not themed. Use the header that belongs to the container: <code>ModalFrame</code>’s for a dialog,{' '}
      <code>PanelHeading</code> or <code>SectionLabel</code> for a section, <code>TopAppBar</code> on the handheld. Revisit only if
      MUI Card is adopted for a static card.
    </>
  ),
  mui: ['CardHeader'],
  useFor: [
    'Nothing directly. For the job it does, use the Birdie header for the container (below).',
  ],
  dontUseFor: [
    'Dialog headers: ModalFrame draws them (icon tile, title, subtitle, status aside, ✕).',
    'Section titles in a panel: PanelHeading (11px caps) or SectionLabel (overline, with an optional trailing rule).',
    'Tappable cards: a header with its own action inside a button card makes two targets.',
    'Handheld screens: the TopAppBar is the header.',
  ],
  inBirdie: [
    {
      label: 'The reservation’s header',
      caption: (
        <>
          Member dot, the booker’s name at 18px and a payment badge; then time, course and holes; then the group contact’s phone and
          email, once, in green. ✕ on the right. Tabs sit directly under it.
        </>
      ),
      shot: 'tablet-reservation',
      tabletHash: '#/tee-sheet?res=p04_m6',
      storyId: 'weston-edits-1-·-reservation-panel-tablet--over-the-tee-sheet',
    },
    {
      label: 'A dialog header: ModalFrame',
      caption: (
        <>
          The customer record: an icon tile, the name with membership chips beside it, IDs as the subtitle, ✕. Every Birdie dialog
          gets the same header from ModalFrame.
        </>
      ),
      shot: 'tablet-customer-record',
      tabletHash: '#/tee-sheet?res=p04_m6&cust=607469&cust-seat=0',
      storyId: 'weston-edits-4-·-customer-profile-tablet--booker-record',
    },
    {
      label: 'A course column’s header',
      caption: (
        <>
          On the tee sheet: the course and its holes, the day’s golfers, carts and walkers, ⓘ for rates and ⋮ for the course menu,
          then the slot labels. Sticky while the rows scroll.
        </>
      ),
      shot: 'tablet-tee-sheet',
      tabletHash: '#/tee-sheet?shift=early',
      storyId: 'components-layout-structure-tee-sheet--course-note',
    },
  ],
  birdie: [
    { name: 'ModalFrame (header)', file: 'src/pos/modals/ModalFrame.tsx', use: 'every tablet dialog: icon tile, title (any node), subtitle, headerAside, ✕.', surface: 'tablet' },
    { name: 'ReservationPanel (header)', file: 'src/pos/components/ReservationPanel.tsx', use: 'the slide-over: name + PayBadge, when and where, the group contact.', surface: 'tablet' },
    { name: 'CourseHeader', file: 'src/pos/components/TeeSheetGrid.tsx', use: 'a tee sheet course column: name, holes, load, ⓘ, ⋮, slot labels.', surface: 'tablet' },
    { name: 'PanelHeading', file: 'src/pos/components/operations/OpsParts.tsx', use: 'an h2 over a back-office section, 11px caps, with an optional aside on the right.', surface: 'tablet' },
    { name: 'SectionLabel', file: 'src/pos/components/primitives.tsx', use: 'the small caps label over nearly every group; `rule` adds a trailing hairline.', surface: 'tablet' },
    { name: 'SectionHeader', file: 'src/pos/mobile/screens/tee/parts.tsx', use: 'a handheld list header with a trailing action ("Everyone").', surface: 'handheld' },
  ],
  anatomy: [
    { part: 'Leading (optional)', description: 'A 34px tinted icon tile in a dialog, or an 8px member dot before a name. Never a large avatar.' },
    { part: 'Title', description: 'The subject: 17px 800 in a dialog, 18px 800 in the reservation, 14px 700 on a course column.' },
    { part: 'Status beside the title', description: 'A PayBadge, membership chips, ID.me. What the subject is entitled to or owes, where the eye lands first.' },
    { part: 'Subtitle', description: '12–12.5px on-surface-variant: when, where, which ID. One line.' },
    { part: 'Aside', description: 'Status for the whole container (headerAside) or a count (PanelHeading’s aside).' },
    { part: 'Close or menu', description: '✕ at the far right of dialogs and panels; ⓘ and ⋮ on course columns.' },
  ],
  variants: [
    { name: 'Dialog header', use: 'Any tablet dialog, through ModalFrame. A bottom border separates it from a scrolling body.' },
    { name: 'Panel header', use: 'A slide-over: the subject large, two lines of context, tabs underneath.' },
    { name: 'Column header', use: 'A sticky header over a scrolling column (tee sheet courses).' },
    { name: 'Section heading', use: 'Inside a panel or a screen: PanelHeading (an h2) or SectionLabel.', avoid: 'Using SectionLabel where a screen reader needs a heading: it is not one.' },
    { name: 'MUI CardHeader', use: 'Not used.', avoid: 'Everything in Birdie today.' },
  ],
  states: [
    { state: 'Default', tablet: 'Static. The header does not scroll with the body.', handheld: 'The TopAppBar; on the tee sheet it scrolls away and a one-line date bar docks in its place.' },
    { state: 'With status', tablet: 'PayBadge or chips beside the title change as the record changes (OPEN → PAID).', handheld: 'A badge row under the title (OPEN · 2 players · 18H · Walking).' },
    { state: 'Locked', tablet: 'A locked course’s header dims to 72% with a lock icon.', handheld: '—' },
  ],
  behavior: [
    'The header names the subject and stays put; the body under it scrolls.',
    'Status goes beside the title, not in the body: the first thing read should be what matters (owes money, is a member, is verified).',
    'Contact details appear once, in the header, not on every player (Weston: "we show my email 4 times…").',
    'Close is always top right; the main action is always in the footer, never in the header.',
  ],
  content: [
    'Titles are the subject’s name: "Foster, A.", "Alan Foster", "Championship · Front 9". Not "Reservation details".',
    'Subtitles chain facts with " · ": "6:08 AM · Championship · Front 9 · 18 holes".',
    'Section headings are short caps on screen: TIPS BY PERSON, OPEN BALANCE 27.',
  ],
  dos: [
    'Use ModalFrame for any tablet dialog and let it draw the header.',
    'Put the one status that matters beside the title.',
    'Use PanelHeading where the section needs to be a heading for assistive tech.',
  ],
  donts: [
    'MUI CardHeader in a Birdie screen.',
    'Actions in a header other than close, info or a menu.',
    'A third line of subtitle. Move it into the body.',
  ],
  a11y: [
    <>
      <strong>ModalFrame’s ✕ has no accessible name.</strong> Its icon is aria-hidden, so every tablet dialog has an unnamed close
      button. Add <code>aria-label="Close"</code>. The reservation’s ✕ is named "Close reservation".
    </>,
    'PanelHeading renders an h2; SectionLabel is an overline Typography (not a heading). Pick by whether the label starts a section.',
    <>
      Subtitle text passes: <Contrast fg={md3.onSurfaceVariant} bg="#ffffff" label="6:08" />. The reservation’s contact line is green
      at 12px bold: <Contrast fg={md3.primary} bg="#ffffff" label="(555)" />, under 4.5:1. The group-contact label is outline grey at
      11.5px: <Contrast fg={md3.outline} bg="#ffffff" label="R-3004" />.
    </>,
  ],
  decisions: [
    { decision: 'No CardHeader: each container owns its header', why: 'Dialogs, panels, course columns and sections need different densities and different status. One component per job (ModalFrame, the reservation, CourseHeader, PanelHeading) keeps them consistent within their kind.' },
    { decision: 'Status sits beside the title', why: 'Justin, on the customer record: "put the yellow tags with the name." Membership decides the rate, so it belongs where the eye lands first, not on a line below.' },
    { decision: 'The group contact appears once, in the reservation header', why: 'Weston: "I need to reach out to this group because of something. Who do I contact?" Repeating the booker’s phone on every player answered nothing.' },
  ],
  tokens: [
    { token: 'radius.md', value: '12px', role: 'The dialog header’s icon tile' },
    { token: 'md3.outlineVariant', value: '#c0c9c1', role: 'The border under a dialog header' },
    { token: 'md3.onSurfaceVariant', value: '#404943', role: 'Subtitles and section headings' },
  ],
  engineering: {
    import: `import { ModalFrame } from '../modals/ModalFrame';                 // a dialog and its header
import { PanelHeading } from '../components/operations/OpsParts';  // a section heading (h2)
import { SectionLabel } from '../components/primitives';           // a small caps label`,
    themeOverride: <>None. <code>MuiCardHeader</code> is not in <code>src/theme/theme.ts</code>.</>,
    notes: [
      <>
        <code>ModalFrame</code>’s <code>title</code> is a <code>ReactNode</code> so a header can carry chips;{' '}
        <code>headerAside</code> puts status between the title and ✕ (the customer record’s ID.me and View ID).
      </>,
      <>
        The story on this page is a kitchen ticket from the KDS project Birdie was scaffolded from. It shows MUI’s CardHeader in
        Birdie’s palette, not a Birdie screen.
      </>,
    ],
    snippet: `// The ID.me document dialog, from CustomerModal.tsx
<ModalFrame
  title="ID on file"
  subtitle={\`Passed back by ID.me\${group ? \` · \${idMeGroups[group].label}\` : ''}\`}
  icon="badge"
  width={480}
  onClose={onClose}
  actions={<OutlineButton onClick={onClose}>Close</OutlineButton>}
>
  {/* body */}
</ModalFrame>`,
  },
  related: [
    { name: 'Card', id: 'components-layout-structure-card' },
    { name: 'Dialog', id: 'components-feedback-status-dialog' },
    { name: 'App Chrome', id: 'components-layout-structure-app-chrome' },
    { name: 'Badge', id: 'components-feedback-status-badge' },
    { name: 'Typography', id: 'foundations-typography' },
  ],
};

export default doc;
