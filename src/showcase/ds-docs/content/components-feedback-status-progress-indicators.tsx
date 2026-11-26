import { withCodeSpans } from './_lib/code-spans';
import { md3 } from '../../../theme/tokens';
import { Contrast } from '../Contrast';
import type { DsDoc } from '../types';

/**
 * Progress Indicators — MUI's circular and linear progress. Two uses, both on the handheld.
 */
const doc: DsDoc = {
  summary: (
    <>
      MUI's circular and linear progress: a spinner that says "busy", and a bar that says "this much". Birdie uses each
      once, both on the <strong>handheld</strong>: the spinner in the card reader while a payment processes, and a
      determinate bar per course in the Day Summary (<em>"{'{'}pct{'}'}% of slots filled"</em>). The tablet uses neither; it shows
      the same facts as numbers and words.
    </>
  ),
  statusNote: (
    <>
      In use, lightly: two handheld files. Fine to use for a measured quantity beside its number. Progress through the
      round is not this component; it is the round status chip (see Chip).
    </>
  ),
  mui: ['CircularProgress', 'LinearProgress'],
  useFor: [
    'A measured share with its number beside it: how full a course is today.',
    'An indeterminate wait the operator must watch, with words: the card reader (see Loading Indicator).',
  ],
  dontUseFor: [
    'Where a player is in the round: use the round status chip or the round rail.',
    'A count against a limit that matters to money (punch cards, gift card balance): say the numbers, "3 of 10 used".',
    'Page or list loading: use a Skeleton.',
    'Decoration on a dashboard tile. A bar with no number is a guess.',
  ],
  inBirdie: [
    {
      label: 'Day Summary, handheld',
      caption: (
        <>
          One row per course: name, <em>"{'{'}n{'}'} tee times · {'{'}pct{'}'}% of slots filled"</em>, and a 6dp determinate
          bar underneath. The words carry the number; the bar makes the courses comparable at a glance. Tapping a row
          filters the sheet to that course.
        </>
      ),
      handheldRoute: 'prototypes-mobile-tee-sheet-sheet-views--day-summary',
      storyId: 'prototypes-mobile-tee-sheet-sheet-views--day-summary',
    },
    {
      label: 'Card reader, handheld',
      caption: <>The indeterminate spinner, 48dp, white on the green reader disc, only while processing.</>,
      shot: 'mobile-card-reader',
      frame: 'handheld',
      handheldRoute: 'prototypes-mobile-pro-shop-payment--reader-card',
    },
    {
      label: 'Day summary, tablet (no bar)',
      caption: (
        <>
          The tablet's day summary answers the starter's questions (how many out, how many carts, who hasn't paid) as
          numbers and a list, with no bars. At the counter the number is the answer, and there is room to print it.
        </>
      ),
      storyId: 'prototypes-tablet-tee-sheet-sheet-views--day-summary',
    },
  ],
  birdie: [
    { name: 'DaySummaryScreen', file: 'src/pos/mobile/screens/tee/DaySummaryScreen.tsx', use: 'the determinate LinearProgress per course, styled inline (6dp, rounded, `surfaceHighest` track).', surface: 'handheld' },
    { name: 'PaymentReaderScreen', file: 'src/pos/mobile/screens/register/PaymentReaderScreen.tsx', use: 'the indeterminate CircularProgress while processing.', surface: 'handheld' },
    { name: 'RoundRail', file: 'src/pos/components/BookingTabs.tsx', use: 'not a progress bar: the five round steps as clickable dots. Use it (or RoundStatusChip) for "where are they in the round".', surface: 'tablet' },
  ],
  anatomy: [
    { part: 'Track', description: '`md3.surfaceHighest`, 6dp tall, fully rounded.' },
    { part: 'Indicator', description: 'Brand green, from the theme\'s primary.' },
    { part: 'Number', description: 'Always printed nearby, in words: "{pct}% of slots filled". The bar never stands alone.' },
  ],
  variants: [
    { name: 'Determinate linear', use: 'A share you can measure: slots filled.', avoid: 'Anything where the exact number matters more than the comparison.' },
    { name: 'Indeterminate circular', use: 'A short wait with no measurable progress: the reader.', avoid: 'Waits longer than a few seconds without a status word.' },
    { name: 'Indeterminate linear', use: 'Not used.', avoid: 'Page loads; use Skeletons.' },
    { name: 'Determinate circular', use: 'Not used.', avoid: 'Dials on dashboards. Print the number.' },
  ],
  states: [
    { state: '0–100%', tablet: 'Not used on the tablet.', handheld: 'Value capped at 100 (`Math.min(100, pct)`), so an overbooked course shows a full bar and the true % in words.' },
  ],
  sizing: [
    { surface: 'Handheld', size: '6dp bar under a two-line list item; 48dp spinner', why: 'Thick enough to compare across rows at arm\'s length, thin enough not to compete with the course name.' },
  ],
  behavior: [
    'The bar is read-only and sits inside a list row; the row is the button.',
    'Values come from the store (`dayBookings`), computed per render. No animation on change.',
  ],
  content: ['Print the number in words next to the bar: "{n} tee times · {pct}% of slots filled".', 'Round to whole percent.'],
  dos: ['Pair every bar with its number.', 'Use the theme\'s primary for the fill.'],
  donts: ['A bar for money or limits. Say the amounts.', 'A coloured bar that changes colour by threshold without saying why.'],
  a11y: [
    'MUI gives LinearProgress role="progressbar" with aria-valuenow. Add an aria-label naming the course, or aria-labelledby the row\'s title, so a screen reader hears what the percentage is of.',
    <>
      Contrast, computed: the green fill against its track is{' '}
      <Contrast fg={md3.primary} bg={md3.surfaceHighest} size="non-text" label="" />, under the 3:1 non-text minimum. It
      passes only because the percentage is also printed in words. Keep the words, or darken the track.
    </>,
  ],
  decisions: [
    {
      decision: 'Numbers on the tablet, bars on the handheld',
      why: 'The tablet\'s summary panel has room to print every count; the phone row has two short lines, and a bar makes four courses comparable without reading them.',
    },
    {
      decision: 'The round is a stepper, not a bar',
      why: 'Staff jump players between steps out of order ("jump a group straight to Finished after the fact"), so each step must be a target. A bar can\'t be tapped to a step. Source: RoundRail\'s comment in BookingTabs.tsx.',
    },
  ],
  tokens: [
    { token: 'md3.surfaceHighest', value: '#e2e6e2', role: 'Track' },
    { token: 'md3.primary', value: '#17a34a', role: 'Fill (theme primary)' },
  ],
  engineering: {
    import: `import { CircularProgress, LinearProgress } from '@mui/material';`,
    themeOverride: <>None. Size, track and radius are set inline at each use.</>,
    notes: ['If bars spread to more screens, move the 6dp/rounded/track styling into a `MuiLinearProgress` override in the handheld theme.'],
    snippet: `<Typography variant="body2">{plural(n, 'tee time')} · {pct}% of slots filled</Typography>
<LinearProgress
  variant="determinate"
  value={Math.min(100, pct)}
  aria-label={\`\${course.name}, slots filled\`}
  sx={{ mt: 1, height: 6, borderRadius: 3, bgcolor: md3.surfaceHighest }}
/>`,
  },
  related: [
    { name: 'Loading Indicator', id: 'components-feedback-status-loading-indicator' },
    { name: 'Skeleton', id: 'components-feedback-status-skeleton' },
    { name: 'Chip', id: 'components-typography-content-chip' },
  ],
};

const content: DsDoc = withCodeSpans(doc);
export default content;
