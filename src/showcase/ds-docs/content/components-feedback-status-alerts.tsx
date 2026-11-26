import { withCodeSpans } from './_lib/code-spans';
import { md3, noteColors } from '../../../theme/tokens';
import { Contrast } from '../Contrast';
import type { DsDoc } from '../types';

/**
 * Alerts — in Birdie, the Callout: a tinted message inside the screen, there for as long as its
 * reason is. MUI's Alert is not used.
 */
const doc: DsDoc = {
  summary: (
    <>
      An alert in Birdie is a <strong>Callout</strong>: a tinted box inside the screen or dialog that tells the operator
      something before they act. <em>"Table 3 is held for Delgado, Ana (4) at 12:30 PM."</em>{' '}
      <em>"Another order is on the register. Finish or clear it there before paying this tab."</em> It stays as long as
      its reason does, and it sits next to the thing it is about. Birdie does not use MUI's Alert; it has its own Callout,
      drawn once for the tablet and (twice) for the handheld.
    </>
  ),
  status: 'core',
  statusNote: (
    <>
      Core as a pattern: about 95 Callouts in 41 files, on both surfaces. MUI's <code>Alert</code> and{' '}
      <code>AlertTitle</code> are not used anywhere; don't import them. Use <code>Callout</code>.
    </>
  ),
  mui: ['Alert', 'AlertTitle'],
  useFor: [
    'A condition that changes what the operator should do here: a held table, a busy register, a staged tip not yet charged.',
    'Why an action is refused, said where the action is ("Out of service. Nothing can be opened or seated here until it is back.").',
    'A quiet fact the operator needs while deciding (a reservation note, "Nothing movable at 9:12 AM").',
    'The result inside a dialog that stays open: "Approved · card · 9:41 AM" on the payment reader.',
  ],
  dontUseFor: [
    'Confirming an action that already happened and closed the screen: use the toast (Snackbar).',
    'A question that needs an answer before going on: use a confirm dialog (tablet) or a bottom sheet (handheld).',
    'Status of a record in a list or row: use a Badge or a status Chip.',
    'Decoration or tips nobody needs. Every callout competes with the main action.',
  ],
  inBirdie: [
    {
      label: 'Pay refused, tablet floor',
      caption: (
        <>
          A warning Callout directly under a disabled <strong>Pay $154.98</strong>: <em>"Another order is on the register.
          Finish or clear it there before paying this tab."</em> The reason sits next to the button it explains.
        </>
      ),
      storyId: 'v1-→-v2-migration-7-·-tables-tablet--pay-is-refused-while-the-register-is-busy',
      tabletHash: '#/tables',
    },
    {
      label: 'The same rule, handheld',
      caption: (
        <>
          The phone's tab says it with the register-parts Callout, an amber icon and body text:{' '}
          <em>"The register has another order on it. Pay or clear that order first, then pay this tab."</em> Same rule,
          different words; see Decisions.
        </>
      ),
      handheldRoute: 'prototypes-mobile-tabs-tabs-on-the-handheld--pay-refused-while-the-register-is-busy',
      storyId: 'prototypes-mobile-tabs-tabs-on-the-handheld--pay-refused-while-the-register-is-busy',
    },
    {
      label: 'Held table, Open tab dialog',
      caption: (
        <>
          Seating a walk-in on a table held for a reservation is warned, not stopped: an amber Callout names the party,
          size and time, and the button says what it is, <strong>Seat walk-in anyway</strong>. Out of service is the red
          (danger) tone, and it disables the action.
        </>
      ),
      storyId: 'v1-→-v2-migration-7-·-tables-tablet--a-walk-in-on-a-held-table',
    },
  ],
  birdie: [
    {
      name: 'Callout',
      file: 'src/pos/modals/ModalFrame.tsx',
      use: 'every tablet alert, in dialogs and on screens. Tones info, warning, danger, success; an optional Material Symbols icon name.',
      surface: 'tablet',
    },
    {
      name: 'Callout (tee)',
      file: 'src/pos/mobile/screens/tee/parts.tsx',
      use: 'the handheld Tee Sheet and reservation screens. Same four tones, from `noteColors`, with a border; 14px body.',
      surface: 'handheld',
    },
    {
      name: 'Callout (register)',
      file: 'src/pos/mobile/screens/register/parts.tsx',
      use: 'the handheld Register and restaurant screens. Info, warning, success only; no border; the icon is a node.',
      surface: 'handheld',
    },
  ],
  anatomy: [
    { part: 'Container', description: 'A tinted fill with a 1px border of the same hue, radius md (12px). Full width of its column.' },
    { part: 'Icon', description: "The tone's default (info, warning, error, check_circle) or a specific one that names the subject: block, receipt_long, point_of_sale." },
    { part: 'Message', description: 'One or two sentences, in the tone\'s dark text colour. Bold for the name of the thing ("Table 3 is held for Delgado, Ana").' },
    { part: 'Actions (rare)', description: 'Buttons go under the Callout, not inside it: Checkout\'s staged-tip warning puts Recalculate below.' },
  ],
  variants: [
    { name: 'Info (blue)', use: 'A neutral fact the operator needs: an existing tab on this table, a reservation note, what a list includes.', avoid: 'Anything that blocks an action. Use warning or danger.' },
    { name: 'Warning (amber)', use: 'Go ahead with care, or not yet: a held table, a busy register, a tip staged but not charged. The most used tone.', avoid: 'Errors that stop the action outright.' },
    { name: 'Danger (red)', use: 'The action is blocked, or will destroy something: a table out of service, an expired card on file, a block that will remove 2 bookings.', avoid: 'Form validation on one field. Put that at the field.' },
    { name: 'Success (green)', use: 'A result inside a dialog that stays open: "Approved · card · 9:41 AM".', avoid: 'Results that close the dialog: toast those.' },
  ],
  states: [
    { state: 'Present', tablet: 'Shown while its condition is true and gone the moment it isn\'t. No close button: you cannot dismiss a fact.', handheld: 'Same.' },
    { state: 'With a blocked action', tablet: 'The action is disabled and the Callout says why, directly above or beside it.', handheld: 'Above the pinned bottom bar, so the reason is next to the disabled button.' },
  ],
  sizing: [
    { surface: 'Tablet', size: '12px text, 15px icon, 10px × 12px padding', why: 'Dialog bodies are dense; the callout should read as part of the form, not a banner.' },
    { surface: 'Handheld', size: '14px (body2), 20px icon, 12px padding', why: 'Reading at arm\'s length, often outdoors.' },
  ],
  behavior: [
    'Inline only. Birdie has no page-top banners and no floating alerts; the callout lives in the column it is about.',
    'Never dismissible. It disappears when the condition does (the register clears, the table comes back into service).',
    'When it explains a disabled action, it carries a data hook the tests use (`data-pay-refusal`); keep it.',
    'One per decision. Two callouts stacked mean the screen is asking two questions.',
  ],
  content: [
    'Lead with the subject: "Table 3 is held…", "A {amount} tip is staged…".',
    'Say what to do next in the same callout: "Finish or clear it there before paying this tab."',
    'Use the real names, times and amounts. "Held for Delgado, Ana (4) at 12:30 PM", not "This table is reserved".',
    'Full sentences with a full stop. No "Warning:" prefix; the tone already says it.',
  ],
  dos: [
    'Put the callout next to the control it explains.',
    'Pick the tone by consequence: info (know this), warning (careful), danger (can\'t, or can\'t undo).',
    'Use a specific icon when it names the subject faster than words (block for out of service).',
    'Reuse the Birdie Callout for the surface you are on.',
  ],
  donts: [
    'MUI\'s Alert. It is not themed for Birdie and nothing uses it.',
    'A hand-drawn amber box. The Bay Sheet\'s daily-limit warning in `ResourcePanel.tsx` and the League\'s violet `Hint` are both one-offs that should be Callouts.',
    'A toast for something the operator must still act on.',
    'A close ✕. If it can be dismissed, it was probably not needed.',
  ],
  a11y: [
    'The icon is decorative (aria-hidden); the message carries the meaning, so the colour is never the only signal.',
    'Callouts are not live regions. When one appears because of an action (a refused Pay), focus stays on the action and the button\'s disabled state explains it; consider aria-describedby from the button to the callout.',
    <>
      Contrast, computed (tablet tones): info <Contrast fg="#1e40af" bg="#eff6ff" />, warning{' '}
      <Contrast fg="#92400e" bg="#fef3c7" />, danger <Contrast fg={md3.error} bg="#ffdad6" />, success{' '}
      <Contrast fg="#166534" bg="#f0fdf4" />. Handheld red (from <code>noteColors.red</code>):{' '}
      <Contrast fg={noteColors.red.text} bg={noteColors.red.bg} />.
    </>,
  ],
  decisions: [
    {
      decision: 'Birdie\'s own Callout, not MUI Alert',
      why: 'The prototype drew its notes in the same pale tints as the time-row notes (`noteColors`), with a hairline border and small type. MUI\'s Alert is heavier and uses a different palette; matching it would mean overriding every slot.',
    },
    {
      decision: 'Inline, never dismissible',
      why: 'A counter terminal is shared. A dismissed warning is gone for the next person too, and the condition it described is still true.',
    },
    {
      decision: 'Open: three Callouts for two surfaces',
      why: 'The handheld has two (tee parts and register parts) that differ in border, tones and icon type. The register one has no danger tone. Merge them into one handheld Callout with four tones.',
    },
    {
      decision: 'Open: tablet tones are literals',
      why: 'The tablet Callout hard-codes its hex values; the handheld reads `noteColors`. The danger tone differs between them (tablet `#ffdad6`/`md3.error`, handheld `noteColors.red`). Move the tablet to the tokens.',
    },
    {
      decision: 'Open: out of service is red on one surface, amber on the other',
      why: 'The tablet\'s Open tab dialog says a table is out of service in the danger tone; the handheld\'s Open tab screen says it in warning. The action is blocked either way, so it is danger on both.',
    },
    {
      decision: 'Open: one rule, two wordings',
      why: 'The busy-register refusal is worded differently on each surface ("Finish or clear it there before paying this tab." / "Pay or clear that order first, then pay this tab."). Pick one string and share it from the logic layer.',
    },
  ],
  tokens: [
    { token: 'noteColors.blue / yellow / green / red', value: 'bg · border · text · dot', role: 'Handheld tones (and the source of the tablet\'s literals)' },
    { token: 'md3.error', value: '#ba1a1a', role: 'Tablet danger text' },
    { token: 'radius.md', value: '12px', role: 'Corner' },
  ],
  engineering: {
    import: `import { Callout } from '../modals/ModalFrame';            // tablet
import { Callout } from './parts';                         // handheld, Tee Sheet screens
import { Callout } from '../register/parts';               // handheld, Register and restaurant`,
    themeOverride: (
      <>
        None. MUI's <code>MuiAlert</code> is not overridden in <code>src/theme/theme.ts</code> because nothing uses it. The
        Callouts carry their own styles.
      </>
    ),
    notes: [
      <>
        <code>CourseInfoCallout</code> (<code>src/pos/components/CourseInfoCallout.tsx</code>) is a popover under the
        course's ⓘ button, not an inline alert. The name is historical.
      </>,
      'The tablet Callout takes an icon name (a Material Symbols ligature, through `Icon`); the register-parts one takes a React node. Know which you are importing.',
      'A Callout explaining a refusal should read its condition from the store (`registerBusy`, `canPayTab`), the same value that disables the button, so the two never disagree.',
    ],
    snippet: `const payable = canPayTab(state, tab.id);

<HostButton tone="primary" icon="payments" fullWidth disabled={!payable} onClick={pay}>
  Pay {money(total)}
</HostButton>
{!payable && (
  <Callout tone="warning" icon="point_of_sale">
    <span data-pay-refusal>Another order is on the register. Finish or clear it there before paying this tab.</span>
  </Callout>
)}`,
  },
  related: [
    { name: 'Snackbar', id: 'components-feedback-status-snackbar' },
    { name: 'Dialog', id: 'components-feedback-status-dialog' },
    { name: 'Empty State', id: 'components-feedback-status-empty-state' },
    { name: 'Badge', id: 'components-feedback-status-badge' },
  ],
};

const content: DsDoc = withCodeSpans(doc);
export default content;
