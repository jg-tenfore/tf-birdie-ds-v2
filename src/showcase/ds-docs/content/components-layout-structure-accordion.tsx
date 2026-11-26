import { md3 } from '../../../theme/tokens';
import { Contrast } from '../Contrast';
import type { DsDoc } from '../types';

/**
 * Accordion — sections that open and close under a header. MUI's Accordion is not used and not
 * themed; Birdie's one accordion is the customer record's section bar, whose closed state already
 * answers the question.
 */
const doc: DsDoc = {
  summary: (
    <>
      Sections that open and close under a header bar, so a long record fits a dialog. MUI's <code>Accordion</code> is{' '}
      <strong>not used</strong>. Birdie has one accordion, and it differs in the way that matters: the{' '}
      <strong>customer record</strong>’s section bars put the answer on the bar ("Gift cards · $275.00"), so a closed section still
      tells the counter what it needs. Everywhere else Birdie expands <em>in place</em> (a player row’s rate editor, a course’s ⓘ
      callout) or simply scrolls. The handheld has no accordions.
    </>
  ),
  status: 'avoid',
  statusNote: (
    <>
      Not used and not themed. Use the customer record’s section bar (<code>CustomerSection</code> in{' '}
      <code>CustomerModal.tsx</code>) when a dialog needs collapsing sections. It is private to that file today: a candidate to
      extract as a shared Birdie component.
    </>
  ),
  mui: ['Accordion', 'AccordionSummary', 'AccordionDetails'],
  useFor: [
    'A long record in a tablet dialog where each section has a one-line answer: balances, counts, history.',
    'Pick the Birdie section bar for this, not MUI Accordion.',
  ],
  dontUseFor: [
    'Hiding settings or form fields: a counter should see what it is about to change. Use sections and headings.',
    'The handheld. A phone scrolls; stack sections under SectionHeaders.',
    'One extra detail on a row: expand in place (the player row’s rate editor) or use a callout (the course ⓘ).',
    'Navigation. Use tabs, a list or the nav.',
  ],
  inBirdie: [
    {
      label: 'The customer record’s sections',
      caption: (
        <>
          Gift cards, Rain checks, Punch cards, Credit books and Tee time history, each a dark 44px bar with its answer on the right.
          A closed bar that says <strong>$0.00</strong> has answered "any gift card left?" without being opened.
        </>
      ),
      shot: 'tablet-customer-record',
      tabletHash: '#/tee-sheet?res=p04_m6&cust=607469&cust-seat=0',
      storyId: 'weston-edits-4-·-customer-profile-tablet--closed-sections-still-answer',
    },
    {
      label: 'Expanding in place: the rate editor',
      caption: (
        <>
          A player row opens its seat’s rates under itself: green fee, other rates, transport. Not a dialog. Weston: "maybe you click and
          this expands, instead of taking over a full screen."
        </>
      ),
      shot: 'tablet-rate-editor',
      tabletHash: '#/tee-sheet?res=p04_m6&rate=0',
    },
  ],
  birdie: [
    { name: 'CustomerSection', file: 'src/pos/components/CustomerModal.tsx', use: 'a collapsing section in a dialog, with its answer on the bar. Private to the customer record.', surface: 'tablet' },
    { name: 'RateExpand', file: 'src/pos/components/RateExpand.tsx', use: 'a seat’s rate editor, expanded in place under its player row.', surface: 'tablet' },
    { name: 'CourseInfoCallout', file: 'src/pos/components/CourseInfoCallout.tsx', use: 'a course at a glance under its ⓘ, with Full rates for the dialog.', surface: 'tablet' },
  ],
  anatomy: [
    { part: 'Bar', description: 'Full width, 44px, 8px corners, the dark on-surface fill with light text. The whole bar is the toggle.' },
    { part: 'Title', description: '13.5px 700, left: "Gift cards".' },
    { part: 'Answer', description: '13px at 85% opacity, right, before the chevron: "$275.00", "None", "3 on the sheet · 5 played".' },
    { part: 'Chevron', description: 'expand_less when open, expand_more when closed.' },
    { part: 'Body', description: 'Under the bar with 12px side padding: a compact table or a list.' },
  ],
  variants: [
    { name: 'Section bar (Birdie)', use: 'Collapsing sections in a dialog, each with a one-line answer.', avoid: 'Sections with no single answer to show closed.' },
    { name: 'Expand in place', use: 'One row’s extra controls (the rate editor), so the context stays on screen.' },
    { name: 'Callout', use: 'A glance at something without leaving (the course ⓘ).' },
    { name: 'MUI Accordion', use: 'Not used.', avoid: 'Everything in Birdie today: it has no answer on the summary and its targets are MUI’s defaults.' },
  ],
  states: [
    { state: 'Open (default)', tablet: 'Sections open by default (defaultOpen), so nothing is hidden the first time.', handheld: 'No accordions; sections are always open and the screen scrolls.' },
    { state: 'Closed', tablet: 'The bar still shows its answer. Chevron down.' },
    { state: 'Focus', tablet: 'ButtonBase’s focus-visible ring on the bar.' },
  ],
  sizing: [
    { surface: 'Tablet', size: '44px bars.', why: 'In a dialog a thumb is often the pointer. Weston asked for bigger targets: "let’s make this as big as we can… we need to plan for those."' },
    { surface: 'Handheld', size: 'Not used.', why: 'A phone screen scrolls; collapsing adds taps for no room gained.' },
  ],
  behavior: [
    'Several sections can be open at once. Opening one does not close the others.',
    'The answer on the bar is computed from the same data as the body, so they cannot disagree.',
    'Open state is local: closing the dialog forgets it. The record opens with every section open next time.',
  ],
  content: [
    'Titles are plural nouns: Gift cards, Rain checks, Punch cards, Credit books, Tee time history.',
    'The answer is a money figure, a count or "None". Never blank.',
  ],
  dos: [
    'Put the answer on the bar.',
    'Open sections by default unless the record is long enough to need closing.',
    'Use expand-in-place for one row’s detail, so the rest of the list stays in view.',
  ],
  donts: [
    'MUI Accordion in a Birdie screen.',
    'An accordion on the handheld.',
    'Hiding a form’s required fields in a closed section.',
  ],
  a11y: [
    'The bar is a button with aria-expanded, so a screen reader hears "Gift cards, $275.00, expanded". It does not set aria-controls; add it when the component is extracted.',
    <>
      Bar text, light on dark: <Contrast fg={md3.surface} bg={md3.onSurface} label="Gift" />. The answer, at 85% opacity:{' '}
      <Contrast fg="#d7d9d7" bg={md3.onSurface} label="$275" />.
    </>,
    '44px bars meet Birdie’s tablet thumb size.',
  ],
  decisions: [
    { decision: 'The answer goes on the bar', why: 'Ported from v1’s customer record. A counter opening a record usually has one question; a closed section that says $275.00 has answered it.' },
    { decision: 'A dark bar, not v1’s navy', why: 'It belongs to this terminal: on-surface dark, like the dialog’s main button.' },
    { decision: 'Expand in place rather than open a dialog, where possible', why: 'Weston, on the rate editor: "instead of taking over a full screen". The reservation stays in view.' },
    { decision: 'No accordions on the handheld', why: 'The phone scrolls. Material 3 handheld screens stack sections under headers.' },
  ],
  tokens: [
    { token: 'md3.onSurface', value: '#191d19', role: 'The bar’s fill' },
    { token: 'md3.surface', value: '#f8faf8', role: 'The bar’s text and chevron' },
    { token: 'radius.sm', value: '8px', role: 'The bar’s corners' },
  ],
  engineering: {
    import: `// Today: private to src/pos/components/CustomerModal.tsx
function CustomerSection({ title, summary, defaultOpen = true, children }) { … }`,
    themeOverride: <>None. <code>MuiAccordion</code> is not in <code>src/theme/theme.ts</code>; the story renders MUI defaults.</>,
    notes: [
      <>
        To reuse it, move <code>CustomerSection</code> into <code>src/pos/components/primitives.tsx</code> (or a sibling), add{' '}
        <code>aria-controls</code> and an <code>id</code> on the body, and keep its props: <code>title</code>,{' '}
        <code>summary</code>, <code>defaultOpen</code>.
      </>,
      <>
        The story’s copy (station routing, printers) comes from the KDS project Birdie was scaffolded from; it is not a Birdie
        screen.
      </>,
    ],
    snippet: `<CustomerSection title="Gift cards" summary={money(giftCards.reduce((s, g) => s + g.balance, 0))}>
  <DataTable columns={['Card', 'Issued', 'Balance']} widths="1fr 90px 80px" rows={giftCardRows} />
</CustomerSection>`,
  },
  related: [
    { name: 'Card Headers', id: 'components-layout-structure-card-headers' },
    { name: 'Dialog', id: 'components-feedback-status-dialog' },
    { name: 'Tabs', id: 'components-navigation-tabs' },
    { name: 'List', id: 'components-layout-structure-list' },
    { name: 'Divider', id: 'components-layout-structure-divider' },
  ],
};

export default doc;
