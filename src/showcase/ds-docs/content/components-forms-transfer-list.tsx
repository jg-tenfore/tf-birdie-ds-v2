import { md3 } from '../../../theme/tokens';
import { Contrast } from '../Contrast';
import type { DsDoc } from '../types';

/** Transfer List: two lists with move buttons between. Not used, and not a fit for either device. */
const doc: DsDoc = {
  summary: (
    <>
      Two checkbox lists side by side, with buttons between them that move the ticked items across: "available" on the left,
      "assigned" on the right. It is a back-office pattern for long lists on a large screen.{' '}
      <strong>No Birdie screen uses it</strong>, and it fits neither device: on the 1280×800 counter two lists and a column of
      buttons take a whole dialog for a job a row of chips does, and on a 360dp handheld it doesn't fit at all. Where Birdie
      moves things between groups, it ticks what moves and then asks where it goes.
    </>
  ),
  status: 'avoid',
  statusNote: (
    <>
      Avoid on the counter and the handheld. To assign a few things, use multi-select pills (Settings' gift card categories,
      booking tags). To move things from one place to another, tick them, then pick the destination (Move players). A transfer
      list belongs in a desktop back office, if anywhere.
    </>
  ),
  mui: [],
  useFor: [
    'Nothing in Birdie today.',
    'If ever: a desktop back-office screen assigning a long list of items to one thing, both sides long enough to scroll.',
  ],
  dontUseFor: [
    'Choosing a few options: use multi-select pills (PillGroup multi) or checkboxes.',
    'Moving players, bookings or items to another place: tick them, then choose where (Move players).',
    'Anything on the handheld: there is no room for two lists side by side.',
  ],
  inBirdie: [
    {
      label: 'What Birdie does instead: move players, tablet',
      caption: (
        <>
          Tick the parties that move (all ticked for "Move everyone"), then pick the course and time. Only destinations with room
          are offered. One list and one choice, not two lists.
        </>
      ),
      storyId: 'prototypes-tablet-tee-sheet-operations--move-players',
    },
    {
      label: 'What Birdie does instead: move players, handheld',
      caption: <>The same rules as a full-screen dialog: ticked players, then a time list that only offers times that fit.</>,
      handheldRoute: 'mobile-screens-3-·-booking-check-in--move-everyone',
    },
    {
      label: 'What Birdie does instead: assign a few',
      caption: (
        <>
          Settings › Tips &amp; gift cards: what a new gift card is good for is a row of pills, each one on or off. Every choice is
          in view; nothing moves between columns.
        </>
      ),
      storyId: 'v1-→-v2-migration-18-·-settings-tablet--checkout-and-receipts',
    },
  ],
  anatomy: [
    { part: 'Source list', description: 'Items not yet assigned, each with a checkbox.' },
    { part: 'Move buttons', description: '> and <, moving the ticked items across. Some versions add >> and <<.' },
    { part: 'Target list', description: 'Items assigned, each with a checkbox.' },
    { part: 'List headers', description: 'What each side means: "Available", "On this display".' },
  ],
  variants: [
    { name: 'Two lists with move buttons', use: 'Long lists on a desktop.', avoid: 'Birdie\'s counter and handheld.' },
    { name: 'Tick, then choose where (Birdie)', use: 'Moving players or bookings.', avoid: 'Assigning many items to one thing.' },
    { name: 'Multi-select pills (Birdie)', use: 'Assigning a handful of options.', avoid: 'More options than fit in two rows.' },
  ],
  states: [
    { state: 'Nothing ticked', tablet: 'Move buttons disabled.', handheld: 'Not used.' },
    { state: 'Ticked', tablet: 'The matching move button enables.', handheld: '—' },
  ],
  behavior: [
    'Ticking selects; nothing moves until a move button is pressed.',
    'Moved items lose their tick, so a second press doesn\'t move them back.',
  ],
  dos: ['Use multi-select pills to assign a few things.', 'Use tick-then-choose to move things somewhere else.'],
  donts: ['A transfer list on the tablet or the handheld.', 'Two lists where one list with a destination would do.'],
  a11y: [
    'If it is ever built: the move buttons need names ("Move to On this display"), and moved items should be announced.',
    <>The demo's list text is MUI's default on white, <Contrast fg={md3.onSurface} bg="#ffffff" />.</>,
  ],
  decisions: [
    {
      decision: 'Avoid',
      why: 'Birdie\'s settings that assign things are short lists, shown as pills. Moving players is "tick, then choose a destination that fits", which also checks the destination has room (MovePlayersScreen.tsx, planMove). A transfer list would split that across two columns and still need the check.',
    },
    {
      decision: 'Back office, if anywhere',
      why: 'Configuration is moving to Buck (Settings › Set in Buck shows Buck\'s values read-only at the counter). A long assignment list, if one appears, is Buck\'s to draw on a desktop.',
    },
  ],
  engineering: {
    themeOverride: <>None. The demo is two MUI <code>List</code>s with <code>Checkbox</code>es and <code>Button</code>s, under the tablet theme.</>,
    notes: [
      <>
        The story (<code>src/showcase/base/TransferList.stories.tsx</code>) is kept so the page has a live example. Its kitchen
        stations are an illustration, not a Birdie screen.
      </>,
      <>For "tick, then choose", see <code>MovePlayers</code> in <code>src/pos/modals/TimeRow.tsx</code> and <code>MovePlayersScreen.tsx</code>.</>,
    ],
  },
  related: [
    { name: 'Checkbox', id: 'components-forms-checkbox' },
    { name: 'Multi Select', id: 'components-forms-multi-select' },
    { name: 'Toggle Button', id: 'components-forms-toggle-button' },
    { name: 'List', id: 'components-layout-structure-list' },
  ],
};

export default doc;
