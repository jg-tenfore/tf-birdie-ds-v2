import { withCodeSpans } from './_lib/code-spans';
import { memberTypes, payBadges } from '../../../theme/tokens';
import type { PayState } from '../../../theme/tokens';
import { MemberDot, PayBadge } from '../../../pos/components/primitives';
import { PaidPill } from '../../../pos/components/PlayerRows';
import { StatusBadge } from '../../../pos/mobile/screens/tee/parts';
import { Contrast } from '../Contrast';
import type { DsDoc } from '../types';

/** One row of the payment vocabulary: the real badges, rendered, with their computed contrast. */
const payRow = (pay: PayState, meaning: string) => ({
  state: (
    <>
      {payBadges[pay].label}
      <span style={{ display: 'block', fontWeight: 400, fontSize: 12.5 }}>{meaning}</span>
    </>
  ),
  tablet: (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <PayBadge pay={pay} />
      <Contrast fg={payBadges[pay].text} bg={payBadges[pay].bg} label={payBadges[pay].label} />
    </span>
  ),
  handheld: <StatusBadge pay={pay} />,
});

/**
 * Badge — status in words (PayBadge and family) and counts on icons (MUI Badge). The page where
 * Birdie's status language is set down: colour plus words, never colour alone.
 */
const doc: DsDoc = {
  summary: (
    <>
      A small label that states a status or a count. Birdie has two kinds. <strong>Status badges</strong> say where a
      booking stands, in words: <PayBadge pay="paid" /> <PayBadge pay="open" /> <PayBadge pay="no_show" />. The tablet draws
      them with <code>PayBadge</code>, the handheld with <code>StatusBadge</code>, from the same colours.{' '}
      <strong>Count badges</strong> put a number on an icon: the handheld's Register tab shows how many lines are on the
      order. One rule runs through both: <strong>colour plus words, never colour alone</strong>.
    </>
  ),
  status: 'core',
  statusNote: (
    <>
      Status badges are on both surfaces (<code>PayBadge</code> in 7 files, <code>StatusBadge</code> in 5 handheld files).
      MUI's{' '}
      <code>Badge</code>, the count on an icon, is used on the handheld only; the tablet draws its one count badge itself.
    </>
  ),
  mui: ['Badge'],
  useFor: [
    'The payment state of a booking or seat: PAID, OPEN, NO SHOW, REFUNDED, RAIN CHK.',
    'A fact about a person that changes what they pay: a membership tier, an ID.me verification.',
    'A count that should be visible from anywhere: lines on the open order, filters narrowing the sheet.',
  ],
  dontUseFor: [
    'Anything you can tap to change: that is a Chip (the round status chip opens a menu; a badge never does).',
    'A sentence. A badge is one or two words; anything longer is a Callout.',
    'A count that is the content (tee times in a day): print it as text.',
    'Colour on its own. A dot with no word next to it is not a badge; see the membership dot below.',
  ],
  inBirdie: [
    {
      label: 'The unpaid worklist, tablet',
      caption: (
        <>
          List view filtered to open balances: every card leads with its amount and an <strong>OPEN</strong> badge. The
          filter chips above repeat the vocabulary with a coloured dot, the word and the count.
        </>
      ),
      shot: 'tablet-tee-sheet-list',
      tabletHash: '#/tee-sheet/list?status=open&sort=status',
    },
    {
      label: 'Tee sheet cards, handheld',
      caption: (
        <>
          <code>StatusBadge</code> at 22dp: PAID and OPEN on every card, with the same colour repeated as the card's left
          stripe. A violet dot before Reed, M. is a membership tier, and it has no word (see Decisions).
        </>
      ),
      shot: 'mobile-tee-sheet',
      frame: 'handheld',
      handheldRoute: 'prototypes-mobile-tee-sheet-sheet-views--default',
    },
    {
      label: 'Booking and seats, tablet',
      caption: (
        <>
          The reservation header says <strong>OPEN</strong> (PayBadge); each player row says <strong>UNPAID</strong>{' '}
          (PaidPill). Same state, two words. See Decisions.
        </>
      ),
      shot: 'tablet-reservation',
      tabletHash: '#/tee-sheet?res=p04_m6',
    },
    {
      label: 'Order count, collapsed rail',
      caption: (
        <>
          With the order rail collapsed, the cart icon carries a small green count, and its tooltip says{' '}
          <em>"{'{'}n{'}'} in the order"</em>. The handheld's Register tab does the same job with a red MUI Badge.
        </>
      ),
      storyId: 'weston-edits-13-·-order-rail-tablet--the-collapsed-strip',
    },
  ],
  birdie: [
    { name: 'PayBadge', file: 'src/pos/components/primitives.tsx', use: 'a booking\'s payment state, anywhere on the tablet: tee sheet list, reservation header, context menus, day summary. `size="sm"` for tight rows.', surface: 'tablet' },
    { name: 'StatusBadge', file: 'src/pos/mobile/screens/tee/parts.tsx', use: 'the same states at phone size (22dp, 11px). Use it on the handheld instead of PayBadge.', surface: 'handheld' },
    { name: 'PaidPill', file: 'src/pos/components/PlayerRows.tsx', use: 'one seat\'s state on a player row: PAID, UNPAID, NO SHOW.', surface: 'tablet' },
    { name: 'Badge (order events)', file: 'src/pos/components/operations/OrderEventParts.tsx', use: 'Order Lookup and Events: a status in the pay colours, any word you pass.', surface: 'tablet' },
    { name: 'MemberDot', file: 'src/pos/components/primitives.tsx', use: 'a member\'s tier as a coloured dot, with the tier name in a hover tooltip. Resolves the tier from phone or name.', surface: 'both' },
    { name: 'MemberBadge', file: 'src/pos/mobile/screens/tee/parts.tsx', use: 'the tier as dot plus words ("Annual Member"). The version that meets the rule.', surface: 'handheld' },
    { name: 'IdMeBadge', file: 'src/pos/components/IdMeBadge.tsx', use: 'ID.me verification: shield + "ID.me · Veteran". A handheld version lives in tee parts.', surface: 'both' },
    { name: 'NavigationBar badges', file: 'src/pos/mobile/chrome.tsx', use: 'MUI Badge on a destination: the Register shows lines on the open order.', surface: 'handheld' },
  ],
  anatomy: [
    { part: 'Fill', description: 'A pale tint of the state\'s hue (`payBadges[state].bg`). Never a solid saturated fill for a status.' },
    { part: 'Word', description: 'The state in capitals, 800 weight: PAID, OPEN, NO SHOW. 10px on the tablet (9px small), 11px on the handheld.' },
    { part: 'Shape', description: 'Small radius (4px) for payment badges, so they read as labels; pills are for chips you can tap.' },
    { part: 'Count badge', description: 'A number in a small circle on an icon\'s top-right. Hidden at zero.' },
  ],
  variants: [
    { name: 'Payment (PayBadge, StatusBadge)', use: 'Where a booking stands with money. The highest-priority signal on the tee sheet, which is why it is filled, not outlined.', avoid: 'Seat-level state: use PaidPill.' },
    { name: 'Seat (PaidPill)', use: 'One player\'s state inside a booking.', avoid: 'Booking-level state.' },
    { name: 'Membership (MemberDot, MemberBadge)', use: 'A tier that changes the rate. Dot in tight rows; dot plus label where there is room.', avoid: 'The dot alone where the tier decides the price and nothing else says it.' },
    { name: 'Verification (IdMeBadge)', use: 'A verified group that unlocks a rate, with a shield icon.' },
    { name: 'Count (MUI Badge)', use: 'Lines on the order, active filters.', avoid: 'Numbers that are the content of the screen.' },
  ],
  states: [
    payRow('paid', 'Settled.'),
    payRow('open', 'Money still due.'),
    payRow('rain_chk', 'A rain check issued.'),
    payRow('no_show', 'Booked, never came.'),
    payRow('refund', 'Money returned.'),
    payRow('block', 'A held slot, not a party.'),
    payRow('event', 'An outing or league.'),
  ],
  sizing: [
    { surface: 'Tablet', size: 'PayBadge 10px (md) / 9px (sm); PaidPill 9.5px; rail count 15px circle, 9px', why: 'Badges sit inside dense rows and booking chips beside 12–14px text. They are meant to be scanned, not read.' },
    { surface: 'Handheld', size: 'StatusBadge, MemberBadge, IdMeBadge all 22dp tall, 11px', why: 'Re-drawn at phone size from the same tokens; the tablet\'s 10px "reads as specks on a phone" (tee parts comment). They share a height so a row\'s badges line up.' },
  ],
  behavior: [
    'Badges are read-only. If tapping it should change the state, it is a chip with a menu (RoundStatusChip).',
    'The word comes from the token (`payBadges[state].label`), so every screen says the same word for the same state.',
    'Count badges hide at zero (`invisible={!count}`) rather than showing 0.',
    'Unknown states fall back to a grey badge with the raw value in capitals, so a new state shows up rather than vanishing.',
  ],
  content: [
    <>
      <strong>The status language.</strong> Every status is a word. Colour makes it findable; the word makes it true.
      Where it helps, a shape is the third channel: a lock for <em>Sent 11:18 AM</em>, an amber dot for{' '}
      <em>Not sent</em>, a strike-through for a cart that's out.
    </>,
    'Payment words are capitals, short and fixed: PAID, OPEN, RAIN CHK, NO SHOW, REFUNDED, BLOCKED, EVENT.',
    'Restaurant and kitchen states are sentence case and can carry a number: "Check requested", "2 not sent", "Nothing ordered", "All sent".',
    'One state, one word, on every surface. Today "OPEN" (booking) and "UNPAID" (seat, and the list filter) mean the same thing; pick one.',
  ],
  dos: [
    'Render the word from the token, never type it.',
    'Put the payment badge where the eye lands first in the row (left on list cards, right on handheld cards, consistently per surface).',
    'Use StatusBadge on the handheld and PayBadge on the tablet.',
    'Pair any coloured dot with a word, or with a tooltip and an accessible label at the very least.',
  ],
  donts: [
    'Colour alone. The tee-sheet grid comes close: its booking chips say NO SHOW, RAIN CHK, REFUNDED, BLOCKED and EVENT in words, but paid and open have none (paid is a solid green chip, open is white with a green outline). Fill against outline is a second channel beyond hue, so it holds, but it is the one place the sheet\'s money state has no word.',
    'A new colour for an existing state.',
    'PayBadge on the handheld. OrderScreen.tsx still uses it for the loaded booking; swap it for StatusBadge.',
    'A red count badge for something that is not an error.',
  ],
  a11y: [
    <>
      <strong>Three of the seven payment colours fail AA</strong>, and the badges are 9–10px, well under "large text".
      Computed in the States table: PAID, OPEN and REFUNDED are below 4.5:1. PAID is the most common badge on the sheet.
      Deepen those three text colours (the fills can stay).
    </>,
    <>
      <strong>The membership dot is colour alone.</strong> <code>MemberDot</code> has no visible word; its tier name is in a
      hover tooltip, which a touch terminal and the handheld rarely show. The Annual dot is also faint:{' '}
      <MemberDot memberType="annual" size={10} /> <Contrast fg={memberTypes.annual.color} bg="#ffffff" size="non-text" label="" />, under 3:1
      for a graphic, and Annual (<MemberDot memberType="annual" size={10} />) and Senior (
      <MemberDot memberType="senior" size={10} />) are two ambers.
    </>,
    <>
      Seat pills: <PaidPill paid={false} noShow={false} /> uses the OPEN colours, so it fails with them.
    </>,
    'MUI Badge\'s number is plain text, so a screen reader hears a bare "3" beside the icon. The navigation bar\'s destinations should say the count in their accessible name ("Register, 3 lines"), as the tablet rail\'s button does ("Order · 3 items").',
  ],
  decisions: [
    {
      decision: 'Filled, not outlined, for payment',
      why: 'PayBadge\'s own comment: payment is the highest-priority signal on the tee sheet and in list view, so it gets a solid fill.',
    },
    {
      decision: 'Re-drawn for the handheld, same tokens',
      why: 'The handheld\'s StatusBadge, MemberBadge and IdMeBadge share one 22dp height so a row\'s badges line up, and they read the same `payBadges` and `memberTypes` so a state looks identical on both surfaces.',
    },
    {
      decision: 'Open: the membership dot',
      why: 'Birdie\'s one colour-only signal, used on the tablet\'s chips and rows and on the handheld\'s cards. Either add the tier\'s short name beside it where it decides a price, or give the dot a shape per tier.',
    },
    {
      decision: 'Open: OPEN or UNPAID',
      why: 'PayBadge says OPEN, PaidPill says UNPAID, the list filter says Unpaid and its section says OPEN BALANCE. One word.',
    },
    {
      decision: 'Open: two order counts',
      why: 'The tablet rail counts items by quantity (a threesome\'s golf is 3); the handheld Register badge counts order lines (the same golf is 1), and it is red where the tablet\'s is green. Count the same way and use a neutral or brand colour; red means error.',
    },
  ],
  tokens: [
    { token: 'payBadges.{state}', value: 'bg · text · label', role: 'Every payment badge, both surfaces' },
    { token: 'memberTypes.{tier}', value: 'color · bg · label', role: 'Membership dots and badges' },
    { token: 'idMeGroups.{group}', value: 'bg · text · label', role: 'ID.me badges' },
    { token: 'radius.sm / 2', value: '4px', role: 'Payment badge corner' },
  ],
  engineering: {
    import: `import { MemberDot, PayBadge } from '../components/primitives';   // tablet
import { MemberBadge, StatusBadge } from './parts';                 // handheld tee screens
import { Badge } from '@mui/material';                              // handheld counts`,
    themeOverride: (
      <>
        None for <code>MuiBadge</code>. The payment colours are on the palette as <code>theme.palette.pay</code> (from{' '}
        <code>payBadges</code> in <code>src/theme/tokens.ts</code>), and member tiers as{' '}
        <code>theme.palette.memberTypes</code>.
      </>
    ),
    notes: [
      '`MemberDot` resolves the tier from `memberType`, then `phone`, then `name`, against the session roster, so a member created at the counter gets a dot too. Pass `memberType` when you have it.',
      '`PayBadge` accepts any string; an unknown one renders grey with the raw value. Add new states to `payBadges`, not as one-off colours.',
      'The tablet\'s count badge is hand-drawn in `LeftPanel.tsx`. If the tablet needs more count badges, use MUI Badge with the theme rather than copying it.',
    ],
    snippet: `<Stack direction="row" alignItems="center" gap={0.75}>
  <BookingMemberDot booking={b} />
  <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{b.name}</Typography>
  <PayBadge pay={b.pay} size="sm" sx={{ ml: 'auto' }} />
</Stack>`,
  },
  related: [
    { name: 'Badge Group', id: 'components-feedback-status-badge-group' },
    { name: 'Chip', id: 'components-typography-content-chip' },
    { name: 'Avatar', id: 'components-media-visuals-avatar' },
    { name: 'Tooltip', id: 'components-typography-content-tooltip' },
  ],
};

const content: DsDoc = withCodeSpans(doc);
export default content;
