import { withCodeSpans } from './_lib/code-spans';
import { md3 } from '../../../theme/tokens';
import { Contrast } from '../Contrast';
import type { DsDoc } from '../types';

/**
 * Tooltip — a hover label. Tablet only, and never the only place something is said: the handheld
 * has no hover, and counter terminals are often touched.
 */
const doc: DsDoc = {
  summary: (
    <>
      A small dark label that appears on hover to name an icon or add a detail: <em>"Mark no-show"</em>,{' '}
      <em>"Order is empty"</em>, <em>"ID.me verified · Veteran"</em>. Birdie uses it on the <strong>tablet only</strong>,
      mostly on icon buttons in player rows and the collapsed order rail. The <strong>handheld has none</strong> on
      purpose: a phone has no hover. The rule that follows: a tooltip may repeat or extend, but it is never the only place
      something is said.
    </>
  ),
  statusNote: (
    <>
      In use in 5 tablet files (MUI Tooltip), plus the browser's own <code>title</code> attribute in several more. No
      handheld screen imports it, though one renders it by accident (see Decisions).
    </>
  ),
  mui: ['Tooltip'],
  useFor: [
    'Naming an icon-only button on the tablet: the player row\'s no-show, remove, rates and cart controls.',
    'The full text of something cut short: a long membership name, a booking note behind its icon.',
    'A detail a mouse user may want and nobody needs: who has a taken cart, beside a list that already says so.',
  ],
  dontUseFor: [
    'Anything on the handheld. Put it in the accessible name and on screen (a list, a caption line, a sheet).',
    'The only copy of information needed to do the job. If staff need it, show it.',
    'Instructions or errors: use a Callout.',
    'Labels that would fit on screen. A visible label beats a tooltip every time.',
  ],
  inBirdie: [
    {
      label: 'Who has a cart, tablet',
      caption: (
        <>
          A struck-through number is a cart that's out; hovering it says <em>"Out with {'{'}player{'}'} · {'{'}time{'}'}"</em>{' '}
          (a native title). The line under the grid says so, and lists the first four out, because "on a touch terminal a
          tooltip needs a mouse" (the story's own note).
        </>
      ),
      storyId: 'weston-edits-16-·-cart-signout-tablet--the-key-picker',
    },
    {
      label: 'The same, with no hover',
      caption: (
        <>
          The phone puts the holder in each number's accessible name (<em>"Cart 14, out with {'{'}player{'}'}"</em>) and lists
          six carts out under its own heading. The list does the tooltip's job, so it carries more.
        </>
      ),
      shot: 'mobile-cart-signout',
      frame: 'handheld',
      handheldRoute: 'weston-edits-16-·-cart-signout-mobile--what-is-out-now',
    },
    {
      label: 'The collapsed order rail',
      caption: (
        <>
          A 56px column of icons whose only labels are tooltips: <em>"Menu"</em>, <em>"{'{'}n{'}'} in the order"</em>. The
          review notes say it plainly: on a touch terminal the first use of the collapsed rail is a guess.
        </>
      ),
      storyId: 'weston-edits-13-·-order-rail-tablet--the-collapsed-strip',
    },
    {
      label: 'Icon buttons on a player row',
      caption: (
        <>
          Each icon-only control has a tooltip: <em>"Mark no-show"</em>, <em>"Remove player"</em>,{' '}
          <em>"Choose a rate"</em>, <em>"Sign out a cart"</em>. Where the button has no aria-label of its own, MUI uses
          the tooltip as its accessible name.
        </>
      ),
      storyId: 'weston-edits-2-·-player-rows-tablet--as-booked',
    },
  ],
  birdie: [
    { name: 'PlayerRows', file: 'src/pos/components/PlayerRows.tsx', use: 'the most tooltips in one place: every icon control on a seat. The model to copy (tooltip plus aria-label).', surface: 'tablet' },
    { name: 'Rail strip', file: 'src/pos/components/LeftPanel.tsx', use: 'the collapsed rail\'s Menu and order buttons, placement right.', surface: 'tablet' },
    { name: 'MemberDot', file: 'src/pos/components/primitives.tsx', use: 'the tier name on hover. The dot\'s only label (see Badge).', surface: 'both' },
    { name: 'IdMeBadge', file: 'src/pos/components/IdMeBadge.tsx', use: '"ID.me verified · {group}" on the compact badge, which shows only "ID.me".', surface: 'tablet' },
    { name: 'Native title', file: 'src/pos/components/CartSignout.tsx', use: 'the browser tooltip: cart holders, cut membership names (SeatChips), bay toggles. Unstyled and never on touch.', surface: 'tablet' },
  ],
  anatomy: [
    { part: 'Container', description: '`md3.scrim` (near-black), radius sm (8px), from the theme override.' },
    { part: 'Text', description: '11px, white, one short line.' },
    { part: 'Placement', description: 'Below by default; `right` on the collapsed rail so it clears the column.' },
  ],
  variants: [
    { name: 'Label for an icon button', use: 'The name of the action, identical in meaning to its aria-label.', avoid: 'A different wording from the aria-label.' },
    { name: 'Full text of a cut value', use: 'A membership name cut at 24 characters; a booking note behind its icon.', avoid: 'Hiding data that fits.' },
    { name: 'Native `title`', use: 'Only where an MUI Tooltip cannot wrap the element cheaply.', avoid: 'New code. It is unstyled, slow to appear and never shows on touch.' },
  ],
  states: [
    { state: 'Hover', tablet: 'Appears after MUI\'s delay, near the pointer\'s target.', handheld: 'There is no hover. Nothing appears.' },
    { state: 'Keyboard focus', tablet: 'Appears when its button takes focus. Only when the child is focusable (see Accessibility).', handheld: 'n/a' },
    { state: 'Touch', tablet: 'MUI opens it after a 700ms press, which nobody discovers. A native title never opens.', handheld: 'Same 700ms press, where a Tooltip has slipped in (MemberDot on the order screen).' },
  ],
  sizing: [{ surface: 'Tablet', size: '11px text, 8px corners', why: 'A whisper next to 12–14px UI. It names; it does not explain.' }],
  behavior: [
    'Never the only copy. If the tooltip says something staff need, put it on screen too (the cart list, the seat\'s caption line).',
    'The tooltip and the accessible name say the same thing. MUI uses a string title as the aria-label of its child unless the child already has one.',
    'One per control. No tooltips on text that is already a label.',
  ],
  content: [
    'A verb phrase for actions: "Mark no-show", "Remove player". Sentence case, no full stop.',
    'Toggle tooltips say what a click will do now: "Undo no-show" when it is marked.',
    'For values: the full value, or "label · detail" ("Out with {player} · {time}").',
  ],
  dos: [
    'Pair every icon-only button with a tooltip and an aria-label.',
    'Use MUI Tooltip, so the style, delay and touch behaviour are the theme\'s.',
    'Give the handheld the same information in words on screen.',
  ],
  donts: [
    'A tooltip on a non-focusable element. Keyboard users can never open it.',
    'The browser `title` attribute in new code.',
    'Tooltips on the handheld, even inherited ones.',
    'Long sentences.',
  ],
  a11y: [
    <>
      Contrast, computed: <Contrast fg="#ffffff" bg={md3.scrim} label="Menu" />.
    </>,
    'Two tooltips sit on things a keyboard can\'t reach: MemberDot is a bare span, and the tee-sheet booking note is an icon that Birdie\'s `Icon` marks aria-hidden. The tier and the note are therefore mouse-only. Put the tier in words where it decides a price, and the note in the booking.',
    'A tooltip is not a substitute for a visible label on a touch terminal. The collapsed rail\'s icons need either a label under them or an expanded state people can find.',
  ],
  decisions: [
    {
      decision: 'The golfer\'s note moved out of a tooltip',
      why: 'A player\'s note used to be a yellow button with the text in a tooltip. Weston: "this hover state wouldn\'t really work for touchscreen, but I do like the hover. If you just click on it, it takes you to the note." Now the note is on the row as one line that taps through to Notes. Source: the comment in PlayerRows.tsx.',
    },
    {
      decision: 'No tooltips on the handheld',
      why: 'A phone has no hover. The cart signout notes record the swap: the tablet\'s tooltip became the accessible name plus a longer list. Do the same everywhere.',
    },
    {
      decision: 'Tooltips are extras, not content',
      why: 'The tablet is mouse-first but counter terminals are often touched, and a tooltip needs a mouse. Anything that matters is on screen as well.',
    },
    {
      decision: 'Open: the MemberDot leaks a tooltip onto the phone',
      why: 'The handheld order screen imports the tablet\'s MemberDot, which wraps the dot in an MUI Tooltip. On the phone that is a 700ms long-press, i.e. hidden. Use a handheld dot that carries its tier in words or an aria-label.',
    },
    {
      decision: 'Open: two tooltip mechanisms',
      why: 'MUI Tooltip in 5 files, native `title` in several (CartSignout, SeatChips, the bay toggles, PlayerRows\' name button). Move the useful ones to MUI Tooltip and drop the rest.',
    },
  ],
  tokens: [
    { token: 'md3.scrim', value: '#1a1c1a', role: 'Background' },
    { token: 'radius.sm', value: '8px', role: 'Corner' },
  ],
  engineering: {
    import: `import { Tooltip } from '@mui/material';`,
    themeOverride: (
      <>
        <code>src/theme/theme.ts → MuiTooltip</code>: <code>md3.scrim</code> background, 11px, radius sm. The handheld theme
        inherits it.
      </>
    ),
    notes: [
      'MUI Tooltip needs a child that holds a ref and takes focus. A `ButtonBase` is right; a bare `Box component="span"` gets the hover but not the keyboard.',
      'For a disabled button, wrap it in a span (PlayerRows does: `<Box component="span" sx={{ display: \'inline-flex\' }}>`), because disabled elements fire no events.',
      'Tests find controls by their aria-label, not the tooltip text, so the label is the contract.',
    ],
    snippet: `<Tooltip title={p.noShow ? 'Undo no-show' : 'Mark no-show'}>
  <ButtonBase
    aria-label={p.noShow ? 'Undo no-show' : 'Mark no-show'}
    onClick={toggleNoShow}
    sx={{ p: 0.5, borderRadius: '50%' }}
  >
    <Icon name="person_off" size={16} />
  </ButtonBase>
</Tooltip>`,
  },
  related: [
    { name: 'Badge', id: 'components-feedback-status-badge' },
    { name: 'Button', id: 'components-actions-button' },
    { name: 'Chip', id: 'components-typography-content-chip' },
  ],
};

const content: DsDoc = withCodeSpans(doc);
export default content;
