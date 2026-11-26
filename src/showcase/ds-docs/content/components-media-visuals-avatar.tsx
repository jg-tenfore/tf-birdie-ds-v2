import { withCodeSpans } from './_lib/code-spans';
import { playerAccents } from '../../../theme/tokens';
import { Contrast } from '../Contrast';
import type { DsDoc } from '../types';

const SEATS = ['Seat 1 · green', 'Seat 2 · blue', 'Seat 3 · amber', 'Seat 4 · violet', 'Seat 5 · red'];

/** 14% of an accent over white: the handheld register's SeatAvatar fill. */
const tint = (hex: string) =>
  `#${[1, 3, 5]
    .map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * 0.14 + 255 * 0.86).toString(16).padStart(2, '0'))
    .join('')}`;

/**
 * Avatar — initials on a disc. No photos, no MUI Avatar: Birdie draws its own, coloured by seat
 * on the tee sheet and by membership tier in People.
 */
const doc: DsDoc = {
  summary: (
    <>
      Initials on a coloured disc beside a person's name: <strong>FA</strong> for Foster, A., <strong>G2</strong> for Guest
      2. Birdie has no customer photos, so an avatar is never a picture. Its colour carries meaning: on a reservation it is
      the <strong>seat</strong> (seat 1 green, seat 2 blue, then amber, violet, red), the same colour as that seat's stripe
      and its financial rows; in People it is the <strong>membership tier</strong>. MUI's Avatar is not used; every
      avatar is a small Birdie component.
    </>
  ),
  status: 'core',
  statusNote: (
    <>
      Core as a pattern: on every player row on both surfaces, and in People and the League. MUI <code>Avatar</code> and{' '}
      <code>AvatarGroup</code> are not imported anywhere.
    </>
  ),
  mui: ['Avatar', 'AvatarGroup'],
  useFor: [
    'Marking a seat in a party: which player is seat 1, 2, 3, and matching them to their lines on the order.',
    'A person in a list (People, the League), where the tier colour helps a scan.',
  ],
  dontUseFor: [
    'Staff. Servers and operators show as initials in text ("JE · 4" on a table), not as discs.',
    'A stack of faces (AvatarGroup). Birdie says "4 players" in words.',
    'Photos. There are none in the data; don\'t design for them.',
    'The only label. The name is always beside the disc.',
  ],
  inBirdie: [
    {
      label: 'Seat colours, tablet reservation',
      caption: (
        <>
          <strong>FA</strong> green, <strong>G2</strong> blue, <strong>LO</strong> amber: seats 1, 2 and 3. The same colour
          runs down each row's left edge, so the disc and the stripe say which seat.
        </>
      ),
      shot: 'tablet-reservation',
      tabletHash: '#/tee-sheet?res=p04_m6',
    },
    {
      label: 'Seat colours, handheld',
      caption: (
        <>
          <code>PlayerAvatar</code> at 40dp, the same ramp: RX green, TM blue, WP amber.
        </>
      ),
      shot: 'mobile-player-rows',
      frame: 'handheld',
      handheldRoute: 'weston-edits-2-·-player-rows-mobile--player-rows',
    },
    {
      label: 'Tier colours, People',
      caption: (
        <>
          <code>GolferAvatar</code>: initials on the tier's tint with a ring in the tier colour, and the tier spelled out
          beside it (<em>Student Member</em>). Guests get a plain grey disc.
        </>
      ),
      shot: 'mobile-people',
      frame: 'handheld',
      handheldRoute: 'prototypes-mobile-customer-search-people--people-list',
    },
  ],
  birdie: [
    { name: 'Seat disc (PlayerRows)', file: 'src/pos/components/PlayerRows.tsx', use: 'the 26px disc inside the "open customer" button on a tablet player row; 32px in PlayerRowsV2.', surface: 'tablet' },
    { name: 'Avatar (League)', file: 'src/pos/components/league/LeagueParts.tsx', use: 'a 34px disc for golfers in the League view; takes any colour, falls back to "?".', surface: 'tablet' },
    { name: 'PlayerAvatar', file: 'src/pos/mobile/screens/tee/parts.tsx', use: 'seat disc on handheld tee screens: solid accent, white initials, `dim` for a no-show.', surface: 'handheld' },
    { name: 'SeatAvatar', file: 'src/pos/mobile/screens/register/parts.tsx', use: 'seat disc on handheld register screens: a 14% tint with accent initials.', surface: 'handheld' },
    { name: 'GolferAvatar', file: 'src/pos/mobile/screens/people/parts.tsx', use: 'a person in People: tier tint and ring, aria-hidden.', surface: 'handheld' },
  ],
  anatomy: [
    { part: 'Disc', description: 'A circle, 26–34px on the tablet, 40dp on the handheld.' },
    { part: 'Initials', description: 'Up to two letters, capitals, bold. The tablet and the handheld tee screens take them in the order written ("Foster, A." → FA; "Guest 2" → G2). The handheld register and People put the first name first ("Bennett, Laura" → LB). See Decisions.' },
    { part: 'Colour', description: 'The seat\'s accent (`playerAccents[seat]`) on reservations; the tier\'s colours (`memberTypes`) in People.' },
  ],
  variants: [
    { name: 'Solid seat disc', use: 'Tablet rows and handheld tee screens: white initials on the accent.', avoid: 'Lists of people who are not in a party.' },
    { name: 'Tinted seat disc (SeatAvatar)', use: 'Handheld register screens: accent initials on a 14% tint.', avoid: 'New screens; see Decisions.' },
    { name: 'Tier disc (GolferAvatar)', use: 'People: the tier\'s tint with a ring, guests neutral.', avoid: 'Reservations, where colour means seat.' },
    { name: 'Dimmed', use: 'A no-show seat: 45% opacity, beside the NO SHOW pill.' },
  ],
  states: [
    { state: 'Default', tablet: 'Part of the name button: clicking the disc or the name opens the customer record.', handheld: 'Part of the row; tapping the row opens the player.' },
    { state: 'No-show', tablet: 'The whole row dims to 60%.', handheld: 'The disc dims to 45%.' },
  ],
  sizing: [
    { surface: 'Tablet', size: '26px (rows), 32px (V2 rows), 34px (League)', why: 'Small enough to sit inside a 44px row beside 13.5–15.5px names.' },
    { surface: 'Handheld', size: '40dp', why: 'MD3 list-item leading element.' },
  ],
  behavior: [
    'Colour follows the seat, not the person. Move a player to seat 2 and their disc turns blue. The restaurant uses the same ramp for seats at a table, so seat 2 is blue there too.',
    'Never interactive on its own. It is inside the row or name button.',
  ],
  content: ['Two letters, capitals.', 'Guests without a name use G and their position on the tablet (G2, G3); the handheld register shows the seat number.'],
  dos: ['Keep the name beside every disc.', 'Use the seat ramp on anything that is part of a party.', 'Mark decorative discs aria-hidden when the name is right there.'],
  donts: ['Seat colours in People, or tier colours on a reservation. Each disc colour means one thing per screen.', 'Photos or icons in the disc.', 'AvatarGroup stacks.'],
  a11y: [
    <>
      <strong>White initials on the seat colours, computed:</strong>{' '}
      {playerAccents.map((c, i) => (
        <span key={c} style={{ display: 'inline-flex', marginRight: 10 }} title={SEATS[i]}>
          <Contrast fg="#ffffff" bg={c} label={`S${i + 1}`} />
        </span>
      ))}
      . Seat 1 (green) and seat 3 (amber) fail at this size. Because the name is always beside the disc, the initials are
      redundant, which is the only reason this is tolerable. Mark the disc aria-hidden (GolferAvatar does; the others do
      not, so a screen reader reads "F A, Foster, A.").
    </>,
    <>
      The tinted SeatAvatar is weaker: accent on its own 14% tint is{' '}
      {playerAccents.map((c, i) => (
        <span key={c} style={{ display: 'inline-flex', marginRight: 10 }}>
          <Contrast fg={c} bg={tint(c)} label={`S${i + 1}`} />
        </span>
      ))}
      .
    </>,
  ],
  decisions: [
    {
      decision: 'Colour means seat',
      why: 'The seat is what staff match across a party: seat 2\'s disc, row stripe and financial rows are all blue. tokens.ts records the ramp (player 1 brand green, then blue, amber, violet, red) and where it is used.',
    },
    {
      decision: 'No MUI Avatar',
      why: 'Every avatar needs a size and colour rule MUI\'s Avatar would override anyway, and none ever shows a picture. A Box with a fixed size is less code than a themed Avatar.',
    },
    {
      decision: 'Open: three handheld avatars',
      why: 'PlayerAvatar (solid), SeatAvatar (tinted) and GolferAvatar (tier ring) live in three parts files. Keep two: a seat disc (solid, aria-hidden) and a person disc (tier). Retire the tinted one.',
    },
    {
      decision: 'Open: which initial first',
      why: 'The same golfer is FA on the tablet\'s reservation and the handheld\'s tee screens, and AF on the handheld register and in People, because two initials helpers read "Last, First" in opposite orders. Pick one (first name first reads as a person; order-as-written matches the name beside it) and delete the other helpers.',
    },
    {
      decision: 'Open: green and amber discs',
      why: 'White on seat 1 and seat 3 is under 4.5:1. Either darken those two accents for discs, or use the accent as a ring (as GolferAvatar does with tiers) and dark initials.',
    },
  ],
  tokens: [
    { token: 'playerAccents', value: '#17a34a #2563eb #d97706 #7c3aed #dc2626', role: 'Seat colours, in seat order' },
    { token: 'memberTypes.{tier}', value: 'color · bg', role: 'People discs and rings' },
    { token: 'md3.onPrimary', value: '#ffffff', role: 'Initials on a solid disc' },
  ],
  engineering: {
    import: `import { PlayerAvatar } from './parts';             // handheld tee screens
import { GolferAvatar } from '../people/parts';      // handheld People`,
    themeOverride: <>None. <code>MuiAvatar</code> is not overridden because nothing uses it.</>,
    notes: [
      'The tablet disc is inline in PlayerRows and PlayerRowsV2 (not a component). If a third tablet screen needs one, extract it next to the League Avatar.',
      'There are eight ways to make initials: exported from PlayerRows.tsx, tee-helpers.ts, register parts, people-utils.ts and logic/dining.ts, and inline in LeagueParts, BookingDetail and TimeClockView. Keep one, in `logic/`.',
      'Seat colour is `playerAccents[seatIndex % playerAccents.length]`, so a sixth seat repeats green.',
    ],
    snippet: `<PlayerAvatar name={playerName(b, i)} index={i} dim={p.noShow} />
<Typography variant="subtitle1">{playerName(b, i)}</Typography>`,
  },
  related: [
    { name: 'Badge Group', id: 'components-feedback-status-badge-group' },
    { name: 'Badge', id: 'components-feedback-status-badge' },
    { name: 'Chip', id: 'components-typography-content-chip' },
  ],
};

const content: DsDoc = withCodeSpans(doc);
export default content;
