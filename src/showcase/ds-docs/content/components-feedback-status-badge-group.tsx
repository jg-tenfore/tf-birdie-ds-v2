import { withCodeSpans } from './_lib/code-spans';
import { MembershipChips } from '../../../pos/components/SeatChips';
import { customers } from '../../../pos/data/customers';
import type { DsDoc } from '../types';

/** A real seed record with more than fits, so the live example shows the +N. */
const crowded = customers.find((c) => c.memberships.length + c.customerTypes.length > 2) ?? customers[0];

/**
 * Badge Group — the row of badges beside a name. Not a component in Birdie: a composition rule,
 * with MembershipChips as the one piece that groups and overflows on its own.
 */
const doc: DsDoc = {
  summary: (
    <>
      The row of small labels beside a name that says who this is and where they stand: membership, customer type,
      ID.me, booker, and on the right, where they are in the round and whether they've paid. In Birdie it is{' '}
      <strong>a composition rule, not a component</strong>. The one piece that groups and overflows by itself is{' '}
      <code>MembershipChips</code>: the first membership, the first customer type, and <strong>+N</strong> for the rest.
    </>
  ),
  status: 'in-use',
  statusNote: (
    <>
      In use on every player row, on both surfaces, built from Badge and Chip parts. There is no MUI component to adopt;
      follow the order and limits below.
    </>
  ),
  useFor: [
    'The facts about a person that change the price or the service: membership, customer type, ID.me group.',
    'A record\'s state beside its name: round status, paid.',
    'Several statuses that can be true at once: a tab that has asked for its check and has food not sent.',
  ],
  dontUseFor: [
    'Filters. A row of filter chips is a Chip group with selection, not badges.',
    'More than three labels. Past that, show +N and put the full list one tap away.',
    'Labels that never vary between rows. If every row says it, say it once in the header.',
  ],
  inBirdie: [
    {
      label: 'A player row, tablet',
      caption: (
        <>
          Left to right: avatar and name, <strong>BOOKER</strong>, then the membership chips (<em>Social</em>,{' '}
          <em>Senior</em>, <strong>+1</strong>). On the right: the round status chip (<em>Finished ▾</em>) and the seat's
          pill (<strong>UNPAID</strong>). Who, what they hold, where they are, what they owe.
        </>
      ),
      shot: 'tablet-reservation',
      tabletHash: '#/tee-sheet?res=p04_m6',
    },
    {
      label: 'Player rows, handheld',
      caption: (
        <>
          The same facts, re-stacked for 360dp: member dot and name on one line, the ID.me badge (<em>Veteran</em>,{' '}
          <em>Nurse</em>) and the round state in words on the next, and <strong>OPEN</strong> on the right.
        </>
      ),
      shot: 'mobile-player-rows',
      frame: 'handheld',
      handheldRoute: 'weston-edits-2-·-player-rows-mobile--player-rows',
    },
    {
      label: 'ID.me in the group',
      caption: <>The compact ID.me badge joins the row right after the name, before memberships: a verified group can unlock a rate on its own.</>,
      storyId: 'weston-edits-3-·-id-me-badge-tablet--on-the-player-row',
    },
  ],
  birdie: [
    {
      name: 'MembershipChips',
      file: 'src/pos/components/SeatChips.tsx',
      use: 'a player\'s memberships and customer types: the first of each (cut at 24 and 16 characters), then +N, which opens the full list.',
      surface: 'tablet',
    },
    { name: 'PlayerRowsV2', file: 'src/pos/components/PlayerRowsV2.tsx', use: 'the reference composition: BOOKER, IdMeBadge, MembershipChips or NOT LINKED, then RoundStatusChip and PaidPill.', surface: 'tablet' },
    { name: 'ReservationPlayers', file: 'src/pos/mobile/screens/tee/ReservationPlayers.tsx', use: 'the handheld composition: dot, name, IdMeBadge, round state, StatusBadge.', surface: 'handheld' },
  ],
  anatomy: [
    { part: 'Identity', description: 'Avatar and name, never cut on the tablet\'s current rows (Weston, Oct 2: "we\'d probably want to show the full name").' },
    { part: 'Role', description: 'BOOKER or NOT LINKED: tiny capitals, no fill. A fact about the seat, not a status.' },
    { part: 'Entitlements', description: 'ID.me, then the first membership (violet), then the first customer type (blue), then +N (grey).' },
    { part: 'State (right side)', description: 'The round status chip, then the paid pill. Right-aligned so every row\'s state lines up in a column.' },
  ],
  variants: [
    {
      name: 'Live: MembershipChips',
      use: (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <MembershipChips record={crowded} />
          <span style={{ fontSize: 12.5 }}>
            {crowded.firstName} {crowded.lastName}, a seed record: {crowded.memberships.length} memberships,{' '}
            {crowded.customerTypes.length} customer types. Tap +N.
          </span>
        </span>
      ),
    },
    { name: 'One of each (most players)', use: 'Membership and type show in full; no +N. Most rows look exactly as they did before the chips arrived.' },
    { name: 'Overflow', use: '+N counts everything not shown and opens the full list in a small popover, headed MEMBERSHIPS and CUSTOMER TYPE.' },
    { name: 'None', use: 'A guest with no record shows NOT LINKED instead of chips.' },
  ],
  states: [
    { state: 'Fits', tablet: 'Everything on one line beside the name.', handheld: 'Badges wrap to a second line under the name; the state stays on the right.' },
    { state: 'Long names', tablet: 'Membership cut at 24 characters with "…", type at 16; the full name is in the chip\'s title.', handheld: 'Long names wrap rather than truncate.' },
    { state: '+N open', tablet: 'A 300px popover under the chips with every membership and type. A tap outside closes it.' },
  ],
  behavior: [
    'Order is fixed: who → what they hold → where they are → what they owe. Don\'t reorder per screen.',
    'Show at most two entitlement chips plus +N. The full list is one tap away.',
    'A tap on +N opens the list and does not open the customer record (it stops propagation).',
    'Badges in a group share a height (22dp on the handheld) so the row reads as one line.',
  ],
  content: [
    'Use the record\'s own names ("Single Premium Membership"); cut them, don\'t abbreviate them by hand.',
    'Role labels are capitals and plain: BOOKER, NOT LINKED.',
  ],
  dos: ['Keep the same order on every row.', 'Cut long names at the documented lengths and keep the full name reachable.', 'Right-align state so it scans as a column.'],
  donts: ['More than three visible labels.', 'A badge group as a filter.', 'Colour-only members of the group (the membership dot needs a word nearby; see Badge).'],
  a11y: [
    'Each label is text, so the group reads in order. The +N button is labelled "{n} more".',
    'Cut names keep the full text in a `title` attribute, which only a mouse can see. The +N list is the accessible way to read them; make sure it is reachable even when nothing is cut.',
  ],
  decisions: [
    {
      decision: 'First membership, first type, +N',
      why: 'Weston, Sep 30: "we want to have the customer type and the membership." Oct 2: some names are about 30 characters and some players hold five. So: the first of each, cut at 24, and +N for the rest. Source: the MembershipChips comment in SeatChips.tsx.',
    },
    {
      decision: 'Status on the right, entitlements on the left',
      why: 'Entitlements belong to the person and change the price; status belongs to this round and changes through the day. Splitting them lets staff scan one column for "who still owes".',
    },
  ],
  tokens: [
    { token: 'membership chip', value: '#ede9fe / #6d28d9', role: 'Violet, local to SeatChips.tsx (not yet a token)' },
    { token: 'customer type chip', value: '#e0f2fe / #0369a1', role: 'Blue, local to SeatChips.tsx' },
    { token: 'MEMBERSHIP_CHIP_CHARS', value: '24', role: 'Where a membership name is cut' },
  ],
  engineering: {
    import: `import { MembershipChips, RoundStatusChip } from '../components/SeatChips';
import { IdMeBadge } from '../components/IdMeBadge';
import { PaidPill } from '../components/PlayerRows';`,
    themeOverride: <>None. Each part styles itself; the group is a <code>Stack direction="row" gap={'{0.5}'}</code>.</>,
    notes: [
      'MembershipChips returns null when the record has neither memberships nor types, so the caller decides what to show instead (PlayerRowsV2 shows NOT LINKED).',
      'Tests find the group by `data-membership-chips` and the overflow by `data-membership-more`.',
    ],
    snippet: `<Stack direction="row" alignItems="center" gap={0.75} sx={{ minWidth: 0 }}>
  <Typography sx={{ fontSize: 15.5, fontWeight: 800 }}>{name}</Typography>
  {isBooker && <Typography sx={{ fontSize: 10.5, fontWeight: 800 }}>BOOKER</Typography>}
  {idMe && <IdMeBadge group={idMe} compact />}
  {record ? <MembershipChips record={record} /> : <Typography>NOT LINKED</Typography>}
  <Box sx={{ flex: 1 }} />
  <RoundStatusChip step={p.step} label={name} onStep={setStep} />
  <PaidPill paid={p.paid} noShow={p.noShow} />
</Stack>`,
  },
  related: [
    { name: 'Badge', id: 'components-feedback-status-badge' },
    { name: 'Chip', id: 'components-typography-content-chip' },
    { name: 'Avatar', id: 'components-media-visuals-avatar' },
  ],
};

const content: DsDoc = withCodeSpans(doc);
export default content;
