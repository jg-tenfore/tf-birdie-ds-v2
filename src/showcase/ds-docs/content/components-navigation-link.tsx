import { md3 } from '../../../theme/tokens';
import { Contrast } from '../Contrast';
import type { DsDoc } from '../types';

/**
 * Link — in Birdie a "link" is a text action that goes somewhere inside the app (an order number
 * into Order Lookup), built on ButtonBase because navigation is a store action. Deep links (the
 * hash URLs) are the other half: every screen and panel has an address.
 */
const doc: DsDoc = {
  summary: (
    <>
      Text you press to go somewhere. Birdie has no pages to link between, so its links are{' '}
      <strong>text actions that open another place in the app</strong>: a paid reservation's order number (
      <strong>#A-34768</strong>) opens that order in Order Lookup, "See order" does the same from a seat. They are green, carry
      an icon, and are built on <code>ButtonBase</code>, because moving in Birdie is a store action, not a URL. The other half
      is <strong>deep links</strong>: every screen, panel and tab has a hash address, so a reviewer can be handed a link that
      lands on the thing being reviewed.
    </>
  ),
  status: 'in-use',
  statusNote: (
    <>
      The pattern is in use on the tablet (<code>OrderNumberLink</code> and the Financial tab's per-seat order links). MUI's{' '}
      <code>Link</code>, an anchor, isn't imported in <code>src/pos</code>: use it only for a real URL, which the counter
      rarely has.
    </>
  ),
  mui: ['Link'],
  useFor: [
    'Jumping to a related record from inside another: an order number to its order, a seat to its receipt.',
    'A real URL that opens outside the app, if one is ever needed (help, a policy). That’s MUI Link.',
  ],
  dontUseFor: [
    'Actions that change something (Refund, Print receipt): a button, outlined or filled.',
    'Going to a top-level screen: the main navigation or the navigation bar.',
    'Text that only looks important: phone numbers and emails are information, not links (see Accessibility).',
    'Low-stakes actions in a panel footer like Clear all: a text button.',
  ],
  inBirdie: [
    {
      label: 'The order number, tablet',
      caption: (
        <>
          A paid reservation's footer shows its order number, <strong>#A-34768</strong>, in green with a receipt icon. It
          appears only once something is paid. Pressing it opens the order in Order Lookup, where a refund is done, with a
          Back to the reservation bar.
        </>
      ),
      shot: 'tablet-paid-reservation',
      tabletHash: '#/tee-sheet?res=p03_m6',
      storyId: 'v1-→-v2-migration-12-·-order-lookup-tablet--from-a-reservation-and-back',
    },
    {
      label: 'Per seat, on Financial',
      caption: (
        <>
          On the Financial tab each paid player carries the same order number link, then <strong>Print receipt</strong> and{' '}
          <strong>See order</strong> as small outlined pills. The link goes somewhere; the pills do something.
        </>
      ),
      storyId: 'v1-→-v2-migration-100226-built-into-the-app-tablet--financial-order-per-player',
    },
    {
      label: 'Deep links',
      caption: (
        <>
          Every screen, panel, tab and editor has an address: <code>#/tee-sheet?res=p43&res-tab=financial</code>,{' '}
          <code>#/bays?hide=bay-3,palmer</code>, <code>#/register?nav=1</code>. Start Here › Deep links lists them.
        </>
      ),
      storyId: 'weston-edits-19-·-deep-links-tablet--every-link',
    },
  ],
  birdie: [
    {
      name: 'OrderNumberLink',
      file: 'src/pos/components/BookingTabs.tsx',
      use: 'a paid reservation’s order number, as a link into Order Lookup (V1 → V2) or the register (Weston Edits).',
      surface: 'tablet',
    },
    {
      name: 'url-state',
      file: 'src/pos/state/url-state.ts',
      use: 'the deep-link codec: POS state ↔ a hash URL. Add a parameter here when a new screen or panel needs an address.',
      surface: 'tablet',
    },
  ],
  anatomy: [
    { part: 'Icon', description: 'A 13–14px leading icon that says what kind of place it opens (receipt_long for an order).' },
    { part: 'Text', description: 'The identifier itself ("#A-34768"), 12px bold, brand green.' },
    { part: 'Hover', description: 'A mint wash behind the text (primaryContainer). No underline.' },
  ],
  variants: [
    {
      name: 'In-app link (ButtonBase)',
      use: 'Going to another record or screen in Birdie. Dispatches to the store; the URL follows.',
      avoid: 'Anything that changes data.',
    },
    {
      name: 'MUI Link (anchor)',
      use: 'A real URL that leaves the app.',
      avoid: 'In-app navigation: it would bypass the store and reload state.',
    },
    {
      name: 'Text button',
      use: 'A quiet action that stays put: Clear all, + Add on a seat.',
      avoid: 'Going somewhere.',
    },
  ],
  states: [
    { state: 'Default', tablet: 'Green text with an icon.', handheld: 'No order-number link on the handheld yet.' },
    { state: 'Hover', tablet: 'Mint wash behind the text.' },
    { state: 'Not available', tablet: 'Not rendered. An unpaid tee time has no order, and a number shown before one exists is a number someone will quote down the phone.' },
    { state: 'Focus', tablet: 'Focus-visible ring, as on any button.' },
  ],
  sizing: [
    { surface: 'Tablet', size: '12px bold text, a hit area of about 22px', why: 'Inline in a dense footer, used with a mouse.' },
    { surface: 'Handheld', size: '—', why: 'Not used; the handheld’s equivalents are list rows that push a screen.' },
  ],
  behavior: [
    'A link goes somewhere. If it changes something, it is a button.',
    'Following a link out of a reservation leaves a way back: the Back to the reservation bar.',
    'The app writes its state to the URL as it changes (useUrlSync), so the address bar is always a link to what is on screen.',
    'Stale links fail visibly: a customer id that matches nobody drops the record instead of opening a plausible neighbour.',
  ],
  content: [
    'Use the identifier the operator would read out: "#A-34768", not "View order".',
    'When a link sits beside buttons, keep it shorter and quieter than them.',
  ],
  dos: [
    'Make every new screen or panel addressable in url-state.ts.',
    'Pair a jump out of a reservation with a way back.',
    'Give an icon-led link an aria-label that says where it goes ("Open order #A-34768 in Order Lookup").',
  ],
  donts: [
    'Colour plain information link-green.',
    'Use an anchor for in-app navigation.',
    'Show an identifier before it exists.',
  ],
  a11y: [
    'OrderNumberLink is a button with an aria-label naming the order and where it opens.',
    <>
      Contrast, computed. <strong>Green link text fails</strong> at 12px:{' '}
      <Contrast fg={md3.primary} bg="#ffffff" label="#A-34768" />. It passes only as large text. Options: the deeper green
      the palette already defines as <code>primary.dark</code> (<Contrast fg="#0f7a36" bg="#ffffff" label="#A-34768" />), or
      onSurface text with the green icon.
    </>,
    'In the reservation header the group contact’s phone and email are also green and bold, but they aren’t links: pressing them does nothing. They read as links. Make them onSurface, or make them do something.',
    'The list view filter panel’s "Clear all" is the one underlined text in the app; it is a button, which is right.',
  ],
  decisions: [
    {
      decision: 'In-app links are store actions',
      why: 'The prototype is one app on a hash route; opening an order means loading it into Order Lookup with a way back, which a plain href can’t express. The URL follows the state, not the other way round.',
    },
    {
      decision: 'The order number goes to Order Lookup (V1 → V2)',
      why: 'Weston: "we need to display the order number somewhere on here. And have it clickable… a way for them to easily go to that order and refund." Order Lookup is where a refund is done.',
    },
    {
      decision: 'Hash routing for deep links',
      why: 'From url-state.ts: the prototype is served from a GitHub Pages subpath with no SPA fallback, so a path would 404. A hash never reaches the server, so the same link works on Pages, on localhost and from a file.',
    },
  ],
  tokens: [
    { token: 'md3.primary', value: '#17a34a', role: 'Link text and icon (fails AA at 12px)' },
    { token: 'md3.primaryContainer', value: '#b7f0cf', role: 'Hover wash' },
    { token: 'palette.primary.dark', value: '#0f7a36', role: 'The deeper green a fix could use' },
  ],
  engineering: {
    import: `import { OrderNumberLink } from '../components/BookingTabs';
import { Link } from '@mui/material'; // only for a real URL`,
    themeOverride: <>None. There is no <code>MuiLink</code> entry; Birdie's links style <code>ButtonBase</code> in place.</>,
    notes: [
      <>
        Navigation is a dispatch: <code>openOrderLookup</code> with <code>fromBookingId</code> sets{' '}
        <code>returnToBooking</code>, which is what draws the Back bar.
      </>,
      <>
        The URL is written from state by <code>useUrlSync</code> and read back by the codec in{' '}
        <code>src/pos/state/url-state.ts</code>. The encoder only emits values that differ from the default, so a plain
        register link stays <code>#/register</code>.
      </>,
      'Tests find the link by its accessible name, so the aria-label is part of the contract.',
    ],
    snippet: `<ButtonBase
  data-order-number
  aria-label={\`Open order \${number} in Order Lookup\`}
  onClick={() => dispatch({ type: 'openOrderLookup', orderNumber: number, fromBookingId: b.id })}
  sx={{ gap: 0.375, px: 0.75, py: 0.25, borderRadius: \`\${radius.sm}px\`, fontSize: 12, fontWeight: 700,
        color: md3.primary, '&:hover': { bgcolor: md3.primaryContainer } }}
>
  <Icon name="receipt_long" size={14} />
  {number}
</ButtonBase>`,
  },
  related: [
    { name: 'Button', id: 'components-actions-button' },
    { name: 'Breadcrumbs', id: 'components-navigation-breadcrumbs' },
    { name: 'Tabs', id: 'components-navigation-tabs' },
  ],
};

export default doc;
