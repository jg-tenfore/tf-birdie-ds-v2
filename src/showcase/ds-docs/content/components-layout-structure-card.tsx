import { md3 } from '../../../theme/tokens';
import { Contrast } from '../Contrast';
import type { DsDoc } from '../types';

/**
 * Card — one subject in a bordered block. Birdie is full of cards, but almost every one of them is
 * a button (a booking, a product, a dish, an order), so they are built on ButtonBase rather than
 * MUI's Card, which is themed and unused.
 */
const doc: DsDoc = {
  summary: (
    <>
      One subject in a bordered block: a booking, a product, a dish, an order, a figure. Birdie is full of them, and almost every
      one is something you tap, so Birdie draws its cards on <code>ButtonBase</code> with an outline and a radius rather than on
      MUI's <code>Card</code>. MUI's Card is themed to match (outlined, 16px corners, a 1.5px hairline) and no screen uses it. On
      the <strong>handheld</strong> the signature card is a booking with a payment stripe; on the <strong>tablet</strong>, the
      photo tiles of the register and the menu.
    </>
  ),
  status: 'available',
  statusNote: (
    <>
      MUI Card is themed (<code>MuiCard</code>: outlined by default, radius 16, 1.5px outline-variant) and unused. Birdie’s cards
      are its own components on <code>ButtonBase</code>, listed below. Fine to adopt for a static card; for a card that opens
      something, keep to <code>ButtonBase</code> (or MUI’s <code>CardActionArea</code>) so the whole card is one target.
    </>
  ),
  mui: ['Card', 'CardActionArea', 'CardActions', 'CardContent', 'CardHeader', 'CardMedia'],
  useFor: [
    'A thing you pick from a grid: a product, a dish, a destination.',
    'A record in a worklist that opens it: a booking in the list view, an order in Order Lookup.',
    'A figure with its label: the totals band on Orders & Tips, Inventory and the day summary.',
    'On the handheld: one booking in a time row, one player in a reservation.',
  ],
  dontUseFor: [
    'Records with columns to compare: use a table (tablet) or list rows (handheld).',
    'A single action: use a button.',
    'Grouping a form’s fields: use a section heading, not a box around them.',
    'Cards inside cards. One level of container.',
  ],
  inBirdie: [
    {
      label: 'Register tiles, tablet',
      caption: (
        <>
          A product photo on white over the category’s tint, name in caps, price. "2 left" flags low stock. Rates and modifiers
          have no photo and keep the compact text tile, so a blank panel never reads as missing content.
        </>
      ),
      shot: 'tablet-pro-shop',
      tabletHash: '#/register/GOLF%20BALLS',
      storyId: 'prototypes-tablet-pro-shop-register-order--category-and-items',
    },
    {
      label: 'Menu tiles, tablet',
      caption: (
        <>
          Quick Order and Tabs sell from one menu: a 120px photo, the dish name, one line of description, the price in green, and
          "Options" or "Choose" when the dish dialog will open.
        </>
      ),
      shot: 'tablet-quick-order',
      tabletHash: '#/quick-order',
      storyId: 'prototypes-tablet-quick-order-menu-photography--photographed-dishes',
    },
    {
      label: 'Booking cards, handheld',
      caption: (
        <>
          Outlined, 12px corners, a 4px stripe in the payment colour, the name and a PAID or OPEN badge, then course, party,
          transport, holes and check-in. Blocks and leagues are flat tinted cards with no stripe.
        </>
      ),
      shot: 'mobile-tee-sheet',
      frame: 'handheld',
      handheldRoute: 'weston-edits-1-·-reservation-panel-mobile--from-the-tee-sheet',
    },
    {
      label: 'List cards, tablet',
      caption: (
        <>
          The tee sheet’s list view: balance and badge on the left, then the name, party and time. 16px corners and a 1.5px
          hairline: the treatment MUI Card is themed to.
        </>
      ),
      shot: 'tablet-tee-sheet-list',
      tabletHash: '#/tee-sheet/list?status=open&sort=status',
    },
    {
      label: 'Order cards, tablet',
      caption: (
        <>
          Order Lookup’s results: order number, time and total on the first line, where and what on the second, tender and who on
          the third. The picked card is outlined green and its order opens on the right.
        </>
      ),
      shot: 'tablet-order-lookup',
      tabletHash: '#/order-lookup',
      storyId: 'v1-→-v2-migration-12-·-order-lookup-tablet--open-an-order',
    },
    {
      label: 'Stat tiles, tablet',
      caption: (
        <>
          A figure and its label on a tinted block: Payments, Sales, Tips. The one that matters most is filled green; Low is
          amber and Out is red on Inventory.
        </>
      ),
      shot: 'tablet-orders-tips',
      tabletHash: '#/orders-tips',
      storyId: 'components-layout-structure-card--in-birdie-stat-tiles',
    },
  ],
  birdie: [
    { name: 'ItemTile (register)', file: 'src/pos/components/PosView.tsx', use: 'a product: photo, name, price, stock badge; tinted by its category.', surface: 'tablet' },
    { name: 'ItemTile (menu)', file: 'src/pos/components/restaurant/MenuBrowser.tsx', use: 'a dish: photo, name, description, price, Options or Choose.', surface: 'tablet' },
    { name: 'ListCard', file: 'src/pos/components/ListView.tsx', use: 'a booking in the tee sheet’s list view, balance first.', surface: 'tablet' },
    { name: 'ResultRow', file: 'src/pos/components/operations/OrderLookupView.tsx', use: 'an order in Order Lookup; selectable, opens its detail.', surface: 'tablet' },
    { name: 'Stat', file: 'src/pos/components/operations/OpsParts.tsx', use: 'a figure with its label, toned strong, warn or bad. Not interactive.', surface: 'tablet' },
    { name: 'BookingCard', file: 'src/pos/mobile/screens/tee/parts.tsx', use: 'a booking at phone size, with the payment stripe.', surface: 'handheld' },
  ],
  anatomy: [
    { part: 'Container', description: 'White, a 1.5px outline-variant border (1px on the handheld), 12px corners for tiles, 16px for list cards. No shadow at rest.' },
    { part: 'Media (optional)', description: 'A product or dish photo on white, cut out, contained rather than cropped. 1:1 on the register, 120px tall on the menu.' },
    { part: 'Signal', description: 'The one thing to read first: the payment stripe on a booking card, the balance on a list card, the stock badge on a product.' },
    { part: 'Title', description: 'The subject: a dish, a product, a name. 14px 800 on the tablet; title-small on the handheld.' },
    { part: 'Supporting lines', description: 'One or two lines of detail in on-surface-variant, clamped, never wrapping a card taller than its row.' },
    { part: 'Figure', description: 'Price or amount, bold. Green on sellable tiles; dark on records.' },
  ],
  variants: [
    { name: 'Photo tile', use: 'Physical goods sold by sight: balls, apparel, dishes.', avoid: 'Rates, modifiers, services: nothing to photograph. Use the text tile.' },
    { name: 'Text tile', use: 'Sellables with no photo. The register’s original compact tile.' },
    { name: 'Record card', use: 'A booking or an order in a worklist; the whole card opens it.', avoid: 'More than three lines. Open the record for the rest.' },
    { name: 'Stat tile', use: 'A figure on a dashboard band. Toned only when the figure needs attention.', avoid: 'Making it a button. Filter chips sit beside the band instead.' },
    { name: 'Booking card (handheld)', use: 'One booking in a time row, search or the day summary.' },
    { name: 'Category tile', use: 'Not a card: the register’s colour-filled category buttons are navigation (CategoryButton).' },
  ],
  states: [
    { state: 'Default', tablet: 'Outline, no shadow.', handheld: 'Outline, no shadow; surface background.' },
    { state: 'Hover', tablet: 'List cards lift 1px with a green border and an e2 shadow. Tiles do not lift.', handheld: 'No hover.' },
    { state: 'Pressed', tablet: 'Menu tiles turn primary-container with a green border while pressed.', handheld: 'Ripple across the card. Long-press opens the booking’s actions.' },
    { state: 'Selected', tablet: 'Green 1.5px border (an order in Order Lookup) or a dark outline (the booking open in the reservation).', handheld: 'Not used.' },
    { state: 'Disabled', tablet: 'Register tiles grey out when a round on the order locks the other hole count, and modifiers dim until there is a round.', handheld: 'Not used.' },
    { state: 'Dimmed record', tablet: 'A no-show list card at 55%.', handheld: 'No-show and refunded cards at 70%; a no-show’s name struck through.' },
  ],
  sizing: [
    { surface: 'Clover Mini', size: 'Register: 5 tiles a row. Menu tiles at least 104px tall. Stat tiles share their band equally.', why: 'Dense, so the order rail and the catalogue stay in view together.' },
    { surface: 'Large display', size: 'Register: 7 tiles a row.', why: 'More tiles in a row rather than the same five stretched to 300px (useTileColumns).' },
    { surface: 'Handheld', size: 'Full-width cards, 12px corners, 12px padding.', why: 'One column; the card is the touch target.' },
  ],
  behavior: [
    'The whole card is the target. A card never holds a second button that opens something else.',
    'Photos sit on white inside the card, not on the category tint: the source shots are cut out on white and a tint shows as a grey halo.',
    'A card that needs a decision before it can be sold says so ("Choose") so the extra step is expected.',
    'Low stock is a badge on the tile ("2 left") and an OUT badge in Inventory. Out-of-stock items stay sellable; the register flags them.',
  ],
  content: [
    'Product names in caps on register tiles (the catalogue’s style); dish names in sentence case on menu tiles.',
    'Prices "$54.00": two decimals on tiles and records.',
    'Record cards lead with what the worklist is for: the balance on a list card, the total on an order card.',
  ],
  dos: [
    'Build a tappable card on ButtonBase, or CardActionArea if you adopt MUI Card.',
    'Use one radius per kind: 12px tiles, 16px list cards.',
    'Keep a card to its subject and at most three lines.',
    'Reuse OpsParts’ Stat for a figure tile.',
  ],
  donts: [
    'A shadow at rest. Birdie’s cards are outlined; shadows mean floating (menus, dialogs).',
    'Buttons inside a card that is itself a button.',
    'A blank image panel for an item with no photo.',
    'An eleventh Stat component (see Decisions).',
  ],
  a11y: [
    'Register and menu tiles, order cards and handheld booking cards are buttons, reachable by keyboard and named by their text. The handheld booking card adds an aria-label ("Strand, E., OPEN").',
    'The tablet’s list card (ListCard) is not: it is a Stack with a click handler, so the keyboard cannot reach it. Make it a ButtonBase.',
    <>
      Prices on menu tiles are green at 14px: <Contrast fg={md3.primary} bg="#ffffff" label="$7.50" />, under 4.5:1. Use primary.dark
      for price text: <Contrast fg="#0f7a36" bg="#ffffff" label="$7.50" />. Stat labels pass (<Contrast fg={md3.onSurfaceVariant} bg={md3.surfaceContainer} label="Sales" />), as do the
      warn and bad tones (<Contrast fg="#92400e" bg="#fef3c7" label="14" />, <Contrast fg={md3.error} bg="#ffdad6" label="8" />).
    </>,
    <>
      Card borders are <Contrast fg={md3.outlineVariant} bg="#ffffff" size="non-text" label="▢" />. They are decorative: the text
      inside identifies the card, so that is acceptable.
    </>,
  ],
  decisions: [
    { decision: 'Cards are buttons, built on ButtonBase', why: 'Nearly every card in Birdie opens or sells something. A button is one target with native keyboard support; a Card with an action inside is two.' },
    { decision: 'Outlined, never elevated at rest', why: 'From the source prototype (`.lv-card`). Shadow is reserved for things that float: menus, dialogs, the slide-over.' },
    { decision: 'Photos only where they help choose', why: 'Physical goods are sold by sight; a wall of near-identical ball-box names is hard to pick from. Rates and services have nothing to show.' },
    { decision: 'Open: ten Stat components', why: 'OpsParts exports one Stat, used by Inventory. Nine screens define their own (Orders & Tips, Gift Cards, Customers, the customer record, the day summary, Reservations, and three on the handheld). Consolidate on OpsParts’ Stat.' },
  ],
  tokens: [
    { token: 'radius.md / radius.lg', value: '12 / 16px', role: 'Tiles and record cards / list cards and MUI Card' },
    { token: 'md3.outlineVariant', value: '#c0c9c1', role: 'The 1.5px hairline' },
    { token: 'elevation.e2', value: 'MD3 level 2', role: 'List card hover lift only' },
    { token: 'md3.primaryContainer', value: '#b7f0cf', role: 'Pressed menu tile, strong Stat tile' },
    { token: 'payBadges.*.text', value: '7 colours', role: 'The handheld booking card’s stripe' },
  ],
  engineering: {
    import: `import { ButtonBase } from '@mui/material';               // a tappable card
import { Stat } from '../components/operations/OpsParts';  // a figure tile`,
    themeOverride: (
      <>
        <code>src/theme/theme.ts → MuiCard</code>: <code>variant: 'outlined'</code> by default, radius 16, 1.5px outline-variant
        border. No screen exercises it. <code>MuiCardHeader</code>, <code>MuiCardContent</code> and <code>MuiCardActions</code> are
        not themed.
      </>
    ),
    notes: [
      <>
        A tappable card is a <code>ButtonBase</code> with <code>display: flex</code>, <code>flexDirection: column</code>,{' '}
        <code>alignItems: stretch</code> and <code>textAlign: left</code>, so its content lays out like a block and not like a
        centred label.
      </>,
      <>
        Tile columns come from <code>useTileColumns(base, wide)</code> in <code>device-context.tsx</code>: 5 and 7 on the register.
      </>,
      <>
        Photos resolve through <code>itemImage()</code> and <code>menuImage()</code> (<code>src/pos/data</code>). Lazy-load them and
        give them an empty <code>alt</code>: the name beside them is the label.
      </>,
    ],
    snippet: `<ButtonBase
  onClick={() => sell(item)}
  sx={{
    display: 'flex', flexDirection: 'column', alignItems: 'stretch', textAlign: 'left',
    minHeight: 104, borderRadius: \`\${radius.md}px\`, border: \`1.5px solid \${md3.outlineVariant}\`,
    bgcolor: '#fff', overflow: 'hidden',
  }}
>
  {photo && <Box component="img" src={photo} alt="" loading="lazy" sx={{ height: 120, objectFit: 'contain' }} />}
  <Typography sx={{ fontSize: 14, fontWeight: 800 }}>{item.name}</Typography>
  <Typography sx={{ fontSize: 14, fontWeight: 800, color: md3.primary }}>{money(item.price)}</Typography>
</ButtonBase>`,
  },
  related: [
    { name: 'Card Headers', id: 'components-layout-structure-card-headers' },
    { name: 'Paper', id: 'components-layout-structure-paper' },
    { name: 'List', id: 'components-layout-structure-list' },
    { name: 'Tee Sheet', id: 'components-layout-structure-tee-sheet' },
    { name: 'Badge', id: 'components-feedback-status-badge' },
    { name: 'Images', id: 'foundations-images' },
  ],
};

export default doc;
