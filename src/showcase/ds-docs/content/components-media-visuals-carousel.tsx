import { withCodeSpans } from './_lib/code-spans';
import type { DsDoc } from '../types';

/**
 * Carousel — one panel at a time behind arrows or dots. Avoid: an operator needs everything in view.
 */
const doc: DsDoc = {
  summary: (
    <>
      One panel at a time, with arrows or dots to move between them. <strong>Birdie doesn't use it and shouldn't.</strong>{' '}
      An operator at a counter needs to see every option at once and hit the right one first time; a carousel hides all
      but one and makes them page to find it. Where Birdie has more than fits, it scrolls a row or wraps a grid, and the
      menu shows every dish as a photo tile.
    </>
  ),
  status: 'avoid',
  statusNote: (
    <>
      Avoid. Nothing imports MUI's <code>MobileStepper</code> (the story's base), and no screen needs one. Use a grid of
      tiles or a horizontally scrolling chip row. The one place it might ever be right is a customer-facing display, not
      the operator's screen.
    </>
  ),
  mui: ['MobileStepper'],
  useFor: [
    'Nothing on the operator\'s screens.',
    'If a customer-facing screen ever needs rotating promotions, design it there, with its own rules.',
  ],
  dontUseFor: [
    'Menu categories or dishes: use the photo tile grid (Quick Order, the tab editor).',
    'Days or dates: use the date strip and its arrows (the handheld tee sheet\'s week row).',
    'Filters or chips that overflow: scroll the row sideways (`ChipRow`).',
    'Onboarding or tips. Birdie has none; the screens say what they need to.',
  ],
  inBirdie: [
    {
      label: 'What Birdie does instead: the menu grid',
      caption: (
        <>
          Every dish on one screen as a photo tile, categories as chips above. Nothing is hidden behind a next arrow, so the
          server finds the Calamari without paging.
        </>
      ),
      shot: 'tablet-tabs',
      tabletHash: '#/tabs?tab=T-1003',
    },
    {
      label: 'And for dates: a strip, not slides',
      caption: (
        <>
          The handheld shows a whole week of days at once under the date, each one a tap away. Arrows step the date, but
          nothing is hidden behind them: the choices on screen are all visible.
        </>
      ),
      shot: 'mobile-tee-sheet',
      frame: 'handheld',
      handheldRoute: 'prototypes-mobile-tee-sheet-sheet-views--default',
    },
  ],
  anatomy: [
    { part: 'Slide', description: 'The one visible panel.' },
    { part: 'Stepper', description: 'Dots and Back / Next buttons (MUI MobileStepper in the story).' },
  ],
  variants: [{ name: 'Any', use: 'Not used.', avoid: 'All operator screens.' }],
  states: [{ state: 'Any', tablet: 'Not used.', handheld: 'Not used. A swipe that pages content fights the back gesture and the scroll.' }],
  behavior: [
    'If something overflows, let it scroll in its own axis and keep its controls still.',
    'Step arrows (the date\'s previous and next) are fine when every choice on screen stays visible and the arrows only change the set.',
  ],
  dos: ['Show every option at once when there is room.', 'Scroll a row sideways when there isn\'t.'],
  donts: ['Auto-advancing anything on an operator screen.', 'Dots as the only sign there is more.'],
  a11y: [
    'Carousels hide content from sight and often from assistive tech, and auto-advance breaks WCAG 2.2.2 (pause, stop, hide). Another reason to avoid them.',
  ],
  decisions: [
    {
      decision: 'Avoid on operator screens',
      why: 'Speed at a busy counter comes from recognition, not recall: seeing the option is faster than remembering which slide it was on. Birdie\'s screens are built to show the whole set (the menu grid, the tee sheet, the floor).',
    },
    {
      decision: 'Candidate to remove from the system',
      why: 'The page exists because the MUI catalogue has one. If nothing adopts it by the time Birdie ships, drop it from the Design System so nobody reaches for it.',
    },
  ],
  engineering: {
    import: `// Not used. For an overflowing row:
<Stack direction="row" gap={1} sx={{ overflowX: 'auto', scrollbarWidth: 'none' }}>…</Stack>`,
    themeOverride: <>None.</>,
    notes: ['The story below is a generic MUI MobileStepper demo, kept so the id stays valid.'],
  },
  related: [
    { name: 'Chip', id: 'components-typography-content-chip' },
    { name: 'Avatar', id: 'components-media-visuals-avatar' },
  ],
};

const content: DsDoc = withCodeSpans(doc);
export default content;
