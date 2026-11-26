import { md3 } from '../../../theme/tokens';
import { Contrast } from '../Contrast';
import type { DsDoc } from '../types';

/** `fg` laid over `bg` at `alpha`, as one hex: the colour a translucent rail actually paints, so it can be measured. */
const tint = (fg: string, alpha: number, bg = '#ffffff') => {
  const ch = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [f, b] = [ch(fg), ch(bg)];
  return `#${f.map((v, i) => Math.round(v * alpha + b[i] * (1 - alpha)).toString(16).padStart(2, '0')).join('')}`;
};

/**
 * Slider — drag a thumb along a track to set a value. Every number Birdie takes is exact (money,
 * minutes, guests), so it uses presets, steppers and typed amounts instead.
 */
const doc: DsDoc = {
  summary: (
    <>
      MUI's track and thumb for <strong>setting a value by dragging</strong>. Birdie does not use it, on purpose. Every
      number Birdie takes is exact: a tip, a fee, a tee-time interval, a guest count. A slider is good at "about this
      much" and bad at "exactly $18.00", and it is fiddly with a thumb at the first tee. Birdie uses{' '}
      <strong>presets</strong> (15%, 18%, 20%), <strong>segmented choices</strong> (7, 8, 10, 15 min),{' '}
      <strong>steppers</strong> (− 8 guests +) and <strong>typed amounts</strong> instead.
    </>
  ),
  status: 'avoid',
  statusNote: (
    <>
      Not used. For a number, use presets with a custom amount, a segmented control, a stepper, or a money field. A
      slider would only be right for a setting with no exact answer and live feedback, like screen brightness, and
      Birdie has none.
    </>
  ),
  mui: ['Slider'],
  useFor: [
    'Nothing in Birdie today.',
    'At most: a preference with no exact right answer, whose effect is visible while dragging.',
  ],
  dontUseFor: [
    'Money (tips, fees, discounts): presets plus a typed amount.',
    'A few known values (intervals, hours): a segmented control.',
    'Counts (guests, players, quantity): a stepper, − and +.',
    'A range of times on the tee sheet: pick a start and an end. See Select.',
  ],
  inBirdie: [
    {
      label: 'Instead: tip presets, handheld',
      caption: (
        <>
          No tip, 15%, 18%, 20%, or a custom amount. The tip goes to the reader only when the operator continues, so a
          slip of the finger can't become the charge.
        </>
      ),
      handheldRoute: 'mobile-screens-5-·-payment--tip',
    },
    {
      label: 'Instead: segmented values, tablet',
      caption: (
        <>
          The tee sheet's display settings choose the interval (7, 8, 10, 15 min) and the grid's first and last hour from
          a few segments. Exact, visible, one click.
        </>
      ),
      storyId: 'v1-→-v2-migration-18-·-settings-tablet--the-tee-sheet-section',
      tabletHash: '#/settings?section=teesheet',
    },
    {
      label: 'Instead: a stepper, tablet',
      caption: (
        <>
          The tab editor's guest count: − <strong>8 guests</strong> +. It can't go below the highest seat with a dish on
          it, or above 30; the buttons disable at the limits.
        </>
      ),
      shot: 'tablet-tabs',
      tabletHash: '#/tabs?tab=T-1003',
    },
  ],
  anatomy: [
    { part: 'Rail', description: 'The full range, in green at 38% opacity.' },
    { part: 'Track', description: 'The chosen part, solid green.' },
    { part: 'Thumb', description: 'A 20px green circle to drag.' },
    { part: 'Marks and value label (optional)', description: 'Ticks for steps, and a bubble with the value while dragging.' },
  ],
  variants: [
    { name: 'Continuous', use: 'Not in Birdie.', avoid: 'Any value that has to be exact.' },
    { name: 'Range (two thumbs)', use: 'Not in Birdie.', avoid: 'Time ranges. Two pickers say the times in words.' },
    { name: 'Stepped with marks', use: 'Not in Birdie.', avoid: 'Four or five steps: a segmented control shows them all as words.' },
  ],
  states: [
    { state: 'Default', tablet: 'Green thumb and track on a pale green rail.', handheld: 'Same; the thumb is the only target.' },
    { state: 'Dragging', tablet: 'A halo around the thumb; the value bubble if enabled.', handheld: 'The thumb sits under the finger, so the value is hidden while it changes.' },
    { state: 'Focus', tablet: 'Arrow keys step the value.', handheld: 'Same, with a keyboard.' },
    { state: 'Disabled', tablet: 'Grey.', handheld: 'Same.' },
  ],
  sizing: [
    { surface: 'Tablet', size: '20px thumb, 4px track, 30px tall', why: 'Fine with a mouse, but the value is only as exact as the hand.' },
    { surface: 'Handheld', size: 'The same unless resized', why: 'A 20px thumb is under the 48dp floor, and dragging it outdoors is slow.' },
  ],
  behavior: [
    'Values change continuously while dragging. Anything that reacts (a price) would react many times.',
    'The value is hidden under the finger on touch screens.',
    'Nothing in Birdie listens to it.',
  ],
  dos: [
    'Offer the common values as presets, and a custom amount for the rest.',
    'Show the exact number the operator is choosing.',
    'Use − and + for counts, with limits that disable the buttons.',
  ],
  donts: [
    'A slider for money.',
    'A range slider for times.',
    'A value that changes the price on every pixel of a drag.',
  ],
  a11y: [
    'MUI renders a native range input inside the thumb, so the arrow keys and screen readers work.',
    <>
      Contrast, computed: the track and thumb are <Contrast fg={md3.primary} bg="#ffffff" size="non-text" />, but the
      rail is <Contrast fg={tint(md3.primary, 0.38)} bg="#ffffff" size="non-text" />, under 3:1, so the ends of the range
      are hard to see.
    </>,
    'The thumb is 20px. On the handheld that is under half the 48dp target Birdie uses everywhere else.',
  ],
  decisions: [
    {
      decision: 'Presets and a typed amount for tips',
      why: '"A mistyped tip can\'t become the charge without being seen on the button first" (TipScreen.tsx). The same goes for a dragged one, which is easier to get wrong.',
    },
    {
      decision: 'Segments for the tee sheet grid',
      why: 'Intervals and hours have a handful of real values. Showing them all is faster than finding them on a track (TeeSheetSettingsPanel.tsx).',
    },
    {
      decision: 'Avoid',
      why: 'No Birdie value is approximate. Documented so the next "set a percentage" doesn\'t become a slider by default.',
    },
    {
      decision: 'Open: the handheld\'s tip presets are typed into the screen',
      why: (
        <>
          The tablet's checkout reads the percentages from Settings (<code>terminalSettings.checkout.tipPresets</code>); the
          handheld's <code>TipScreen.tsx</code> has its own 15, 18 and 20. Change them in Settings and the two disagree.
        </>
      ),
    },
  ],
  engineering: {
    import: `import { Slider } from '@mui/material'; // not used by any Birdie screen`,
    themeOverride: (
      <>
        None in either theme. It picks up the brand green from the palette (<code>primary.main</code> ={' '}
        <code>md3.primary</code>) and MUI's default sizes.
      </>
    ),
    notes: [
      <>
        For counts, use the existing steppers: <code>CountStepper</code> (<code>components/restaurant/HostControls.tsx</code>
        ) on the tablet, <code>Stepper</code> (<code>mobile/screens/restaurant/parts.tsx</code>) on the handheld.
      </>,
      <>
        Tip presets are a setting: <code>state.terminalSettings.checkout.tipPresets</code>, edited in Settings. Read them
        rather than hard-coding percentages.
      </>,
    ],
    snippet: `// What Birdie does instead of a slider: presets, then a custom amount
{tipPresets.map((pct) => (
  <ButtonBase key={pct} aria-pressed={choice === pct} onClick={() => setChoice(pct)}>
    {pct}%
  </ButtonBase>
))}
<Field label="Custom" prefix="$" value={custom} onChange={setCustom} />`,
  },
  related: [
    { name: 'Input Number', id: 'components-forms-input-number' },
    { name: 'Toggle Button', id: 'components-forms-toggle-button' },
    { name: 'Input Payment', id: 'components-forms-input-payment' },
    { name: 'Radio Buttons', id: 'components-forms-radio-buttons' },
    { name: 'Rating', id: 'components-forms-rating' },
  ],
};

export default doc;
