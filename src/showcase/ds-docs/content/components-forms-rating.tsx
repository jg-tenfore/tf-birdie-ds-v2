import { Contrast } from '../Contrast';
import type { DsDoc } from '../types';

/** MUI Rating's own colours, as rendered in this Storybook: #faaf00 filled, black at 26% empty (over white, #bdbdbd). */
const STAR = '#faaf00';
const STAR_EMPTY = '#bdbdbd';

/**
 * Rating — a row of stars for giving or showing a score. Nothing in Birdie asks for one: it is
 * documented so nobody reaches for it.
 */
const doc: DsDoc = {
  summary: (
    <>
      MUI's row of stars for <strong>giving or showing a score</strong>. Birdie has no use for it. Nothing on the tablet
      or the handheld asks anyone for a score: the operator records facts (paid, checked in, refunded) and, when a
      judgement matters, a <strong>named reason</strong> such as "Damaged" or "Unhappy with it". A golfer is never handed
      the terminal to rate their round. This page exists so nobody adds stars where a word would be clearer.
    </>
  ),
  status: 'avoid',
  statusNote: (
    <>
      Not used, and a candidate to remove from the system. To record a judgement, use named options (Radio Buttons, or
      pills like the refund dialog's reasons) with a free-text fallback. Feedback from golfers belongs outside the POS.
    </>
  ),
  mui: ['Rating'],
  useFor: [
    'Nothing in Birdie today.',
    'If it ever appears: showing a score that comes from somewhere else, read-only, with the number next to it.',
  ],
  dontUseFor: [
    'Recording why something happened: use named reasons. The refund dialog offers "Returned, Damaged, Wrong item, Charged twice, Unhappy with it" and a text field.',
    'Staff performance or station speed: that is a report, with real numbers.',
    'Anything a customer fills in at the counter: Birdie never turns the screen around for that.',
    'A level or quantity: use a stepper or a segmented control with labels.',
  ],
  inBirdie: [
    {
      label: 'Instead: a named reason, tablet',
      caption: (
        <>
          Refunding an order asks for an optional <strong>Reason</strong>: five pills ("Returned", "Damaged", "Unhappy with
          it"…) and "Or type one". It prints on the refund slip. A reason says what happened; three stars would not.
        </>
      ),
      storyId: 'v1-→-v2-migration-12-·-order-lookup-tablet--refund-the-whole-order',
      tabletHash: '#/order-lookup',
    },
  ],
  anatomy: [
    { part: 'Icons', description: 'Five stars by default (max). Any icon can stand in.' },
    { part: 'Fill', description: 'Whole or half steps (precision).' },
    { part: 'Value label', description: 'Not built in. A score needs its number beside it to be read exactly.' },
  ],
  variants: [
    { name: 'Interactive', use: 'Not in Birdie.', avoid: 'Everywhere: there is no score to collect.' },
    { name: 'Read-only', use: 'Only if a score arrives from another system and must be shown. Put the number beside it.', avoid: 'Showing Birdie\'s own data as stars.' },
    { name: 'Custom icon', use: 'Not in Birdie.', avoid: 'Flames, hearts, flags. A scale nobody can read without a legend.' },
  ],
  states: [
    { state: 'Default', tablet: 'Amber stars, MUI\'s own colour: the theme has no override.', handheld: 'Same.' },
    { state: 'Hover', tablet: 'Stars fill up to the pointer and the hovered one grows.', handheld: 'No hover, so the preview a mouse gets is missing.' },
    { state: 'Read-only', tablet: 'Not focusable; an image of the score.', handheld: 'Same.' },
    { state: 'Disabled', tablet: 'Faded.', handheld: 'Same.' },
  ],
  sizing: [
    { surface: 'Tablet', size: 'About 22px per star at the default size', why: 'Close together and small: a mis-click gives the wrong score.' },
    { surface: 'Handheld', size: 'The same unless set large', why: 'Below the 48dp target. Five targets in a row would need a full width.' },
  ],
  behavior: [
    'A click sets the score; clicking the same star again clears it.',
    'Arrow keys move the value when it has focus.',
    'Nothing in Birdie listens to it.',
  ],
  dos: [
    'Use words for judgements: "Damaged", "Wrong item".',
    'Show a number when you show a score.',
    'Ask whether the information is a fact before asking for an opinion.',
  ],
  donts: [
    'Stars in a POS workflow.',
    'Custom icons that need a legend.',
    'A score without its number.',
    'Asking customers to rate at the counter.',
  ],
  a11y: [
    'MUI builds it from radio inputs, so a screen reader hears "3 Stars" and the arrow keys work.',
    <>
      Contrast, computed against white: filled stars <Contrast fg={STAR} bg="#ffffff" size="non-text" label="★" /> and
      empty stars <Contrast fg={STAR_EMPTY} bg="#ffffff" size="non-text" label="☆" />. Both fail the 3:1 an icon that
      carries meaning needs. One more reason not to adopt it as is.
    </>,
    'Stars at the default size are under 44px, too small for a thumb on the handheld.',
  ],
  decisions: [
    {
      decision: 'Avoid, and a candidate to remove',
      why: 'No Birdie flow asks for a score, and the story file\'s examples came from the kitchen display this repo was scaffolded from, not from Birdie.',
    },
    {
      decision: 'Named reasons instead',
      why: 'A refund reason prints on the slip and has to make sense to whoever reads it later. "Damaged" does; two stars doesn\'t.',
    },
  ],
  engineering: {
    import: `import { Rating } from '@mui/material'; // not used by any Birdie screen`,
    themeOverride: (
      <>
        None. <code>MuiRating</code> has no override in <code>src/theme/theme.ts</code> or{' '}
        <code>src/theme/mobile-theme.ts</code>, so it keeps MUI's amber, which is not a Birdie token.
      </>
    ),
    notes: [
      <>
        If a read-only score is ever needed, set <code>readOnly</code>, a <code>color</code> from the tokens, and render
        the number beside it. Don't ship MUI's default amber.
      </>,
    ],
    snippet: `// What Birdie does instead: named, optional, one tap to clear
<ModalSection title="Reason" hint="Optional — it prints on the refund slip">
  {REASONS.map((r) => (
    <ButtonBase key={r} aria-pressed={reason === r} onClick={() => setReason(reason === r ? '' : r)}>
      {r}
    </ButtonBase>
  ))}
  <Field value={reason} onChange={setReason} placeholder="Or type one" />
</ModalSection>`,
  },
  related: [
    { name: 'Radio Buttons', id: 'components-forms-radio-buttons' },
    { name: 'Slider', id: 'components-forms-slider' },
    { name: 'Chip', id: 'components-typography-content-chip' },
    { name: 'Badge', id: 'components-feedback-status-badge' },
  ],
};

export default doc;
