import { md3 } from '../../../theme/tokens';
import { Contrast } from '../Contrast';
import type { DsDoc } from '../types';

/**
 * Input Payment. The live example is a card-number form, which Birdie never uses: cards go on the
 * reader. What Birdie does have is the cents keypad, for cash, tips and drawer counts.
 */
const doc: DsDoc = {
  summary: (
    <>
      How money comes in at the counter. <strong>Birdie never asks anyone to type a card number.</strong> Cards are tapped,
      inserted or swiped on the reader; cards on file and house accounts are picked from the customer. What gets keyed is an
      amount: the cash a customer hands over, a tip, the cash in the drawer. For that Birdie has{' '}
      <strong>one entry model on both surfaces, the cents keypad</strong>: keying 2, 0, 0, 0, 0 reads $200.00, so there is never
      a decimal point to find.
    </>
  ),
  status: 'avoid',
  statusNote: (
    <>
      Avoid the card-number form in the live example: no screen in Birdie keys card data, and none should. For an amount, use the
      cents keypad (<code>CashAmountPad</code> on the tablet, the cash tender screen on the handheld). For a card, hand over to the
      reader.
    </>
  ),
  mui: [],
  useFor: [
    'Cash tendered at checkout: the keypad, with Exact amount, and the change due worked out.',
    'A tip: presets (15, 18, 20%) first, the keypad or a custom amount second.',
    'Counting the drawer: open shift, cash drop, close shift, a cash payout.',
  ],
  dontUseFor: [
    'Card numbers, expiry dates or CVCs. The reader takes the card; the customer record holds cards on file.',
    'Prices and fees: use a field with a $ prefix (see Input Group and Input Number).',
    'Gift cards: scan the card, or type its number, UPC or the holder\'s name in a search field.',
  ],
  inBirdie: [
    {
      label: 'Checkout, tablet',
      caption: (
        <>
          The receipt on the left, the keypad on the right. Amount tendered or Tip says which number the pad is keying; Exact
          amount fills in the balance; the tenders sit below.
        </>
      ),
      shot: 'tablet-checkout',
      tabletHash: '#/register?order=walkin&modal=checkout',
    },
    {
      label: 'Cash, handheld',
      caption: (
        <>
          The cash tender is a takeover: due, tendered, Exact and two round-ups ($260, $300), then 56dp keys. The button reads
          "Enter at least $258.12" until enough is keyed, then "Cash received · change …".
        </>
      ),
      shot: 'ds-mobile-cash-tendered',
      frame: 'handheld',
      handheldRoute: 'mobile-screens-5-·-payment--reader-cash',
    },
    {
      label: 'Card, handheld',
      caption: (
        <>
          A card is never typed: the reader screen waits for a tap, insert or swipe. No back arrow, because mid-payment is "the one
          moment an accidental swipe must not undo".
        </>
      ),
      shot: 'mobile-card-reader',
      frame: 'handheld',
      handheldRoute: 'mobile-screens-5-·-payment--reader-card',
    },
    {
      label: 'Tip, handheld',
      caption: (
        <>
          Before the reader: No tip, 15%, 18%, 20% as large cards, then Custom amount with a $ field. The amount isn't sent to
          the reader until Continue, so a mistyped tip is seen on the button first.
        </>
      ),
      handheldRoute: 'mobile-screens-5-·-payment--tip',
    },
    {
      label: 'Close shift, tablet',
      caption: (
        <>
          The drawer dialogs share <code>CashAmountPad</code>. Tap a readout (cash or checks) to make it the pad's target; the
          variance updates as you key.
        </>
      ),
      storyId: 'v1-→-v2-migration-17-·-shift-tablet--closing-records-the-variance',
    },
    {
      label: 'Adjusting a tip, tablet',
      caption: (
        <>
          The usual percentages are one tap. A tip over half the sale is accepted only after a second confirm: "far more often an
          $80 typed for $8.00".
        </>
      ),
      storyId: 'v1-→-v2-migration-9-·-orders-tips-tablet--a-slipped-digit-asks-twice',
    },
  ],
  birdie: [
    { name: 'CashAmountPad', file: 'src/pos/modals/CashAmountPad.tsx', use: 'the cents keypad: 1–9, 00, 0, delete, and Clear. 52px keys. The drawer dialogs and cash payout.', surface: 'tablet' },
    { name: 'AmountReadout', file: 'src/pos/modals/CashAmountPad.tsx', use: "the figure a pad is keying, 26px bold. Tappable when a dialog keys two amounts (it's then a pressed toggle).", surface: 'tablet' },
    { name: 'Checkout keypad', file: 'src/pos/modals/Checkout.tsx', use: "checkout's own pad, with two modes (Amount tendered, Tip), Clear and Exact amount. Same model, separate code.", surface: 'tablet' },
    { name: 'CashTender', file: 'src/pos/mobile/screens/register/PaymentReaderScreen.tsx', use: 'the handheld cash keypad: quick amounts, 56dp keys, the change on the button.', surface: 'handheld' },
    { name: 'TipScreen', file: 'src/pos/mobile/screens/register/TipScreen.tsx', use: 'tip presets as pressed cards, and a custom $ field.', surface: 'handheld' },
  ],
  anatomy: [
    { part: 'Readout', description: 'The amount, large and right-aligned ($0.00 at 26–45px), with its label and what it is measured against ("Balance due", "expected in the drawer").' },
    { part: 'Mode or target (optional)', description: 'Which number the pad is keying: Amount tendered or Tip at checkout; cash or checks at close.' },
    { part: 'Quick amounts (optional)', description: 'Exact amount, round-ups, tip percentages. One tap for the common case.' },
    { part: 'Keys', description: '1–9, then 00, 0 and delete, three across.' },
    { part: 'Clear', description: 'Empties the amount. A separate key, so delete only ever removes one digit.' },
    { part: 'Result', description: 'What the amount means, said in words: "Change due $1.88", "$10.00 short".' },
  ],
  variants: [
    { name: 'Checkout pad (two modes)', use: 'One pad for two jobs at checkout: the cash tendered and the tip.', avoid: 'More than two modes on one pad.' },
    { name: 'Drawer pad (CashAmountPad)', use: 'Counting and moving cash: open shift, drop, close, payout.', avoid: 'Prices; they are typed into fields.' },
    { name: 'Handheld cash tender', use: 'Cash on the phone: a full-screen takeover with quick amounts.', avoid: 'Navigation away mid-payment.' },
    { name: 'Tip presets', use: 'Percentages from Settings, as one-tap choices, before any keying.', avoid: 'A tip keyed first and checked second.' },
    { name: 'Card-number form', use: 'Nothing in Birdie.', avoid: 'Always. Cards go on the reader.' },
  ],
  states: [
    { state: 'Empty', tablet: '$0.00, with the balance due under it.', handheld: '$0.00, "Amount tendered", the button saying how much is needed.' },
    { state: 'Keying', tablet: 'Each key shifts the digits left: 2 → $0.02, 20 → $0.20, 2000 → $20.00. Seven digits at most.', handheld: 'Same model.' },
    { state: 'Enough', tablet: 'Change shows on the receipt side.', handheld: 'The amount line turns green: "Change due …"; the button enables.' },
    { state: 'Tip staged', tablet: 'A keyed tip is staged: "Recalculate to add it to the charge." The balance doesn\'t move until then.', handheld: 'The tip is added to the amount on the Continue button.' },
    { state: 'Far off', tablet: 'A tip over half the sale, or a drawer variance of $20 or more, asks for a second tap.', handheld: '—' },
  ],
  sizing: [
    { surface: 'Tablet', size: 'CashAmountPad keys 52px, Clear 44px. Checkout keys 38px. A 280–300px column.', why: 'The keypad is pressed by hand even on the mouse-first terminal. Checkout\'s 38px keys are the tightest; they share the column with nine tenders.' },
    { surface: 'Handheld', size: '56dp keys, three across the full width.', why: 'A thumb, with someone waiting for change.' },
  ],
  behavior: [
    'One entry model everywhere: digits fill from the right, so the pad never needs a decimal point. Leading zeros are dropped.',
    'The pads are touch only. Unlike the PIN pad, they do not listen to a physical keyboard; a terminal with one cannot type an amount. Open decision.',
    'Exact amount (tablet) or Exact (handheld) fills the balance due in one tap.',
    "A tip changes the charge, so it never applies silently: checkout stages it until Recalculate; the handheld shows it on the button before the reader.",
    'Mid-payment, the handheld takes over the screen: no back arrow, no navigation bar. Cancel returns to the step before.',
  ],
  content: [
    'Amounts in the money format: "$258.12", two decimals, no currency code.',
    'Say the result in words: "Change due $1.88", "Enter at least $258.12", "$10.00 short".',
    'Quick amounts are short: "Exact", "$260", "15%".',
  ],
  dos: [
    'Use the cents keypad for any cash amount.',
    'Show the balance or the expected amount right under the figure being keyed.',
    'Offer the common amount first (Exact, tip presets).',
  ],
  donts: [
    'Ask for card numbers, expiry dates or CVCs. Ever.',
    'Apply a tip without showing it on the charge first.',
    'Build another keypad. Checkout\'s should become CashAmountPad too.',
  ],
  a11y: [
    <>
      <strong>Known gap: checkout's delete key has no name.</strong> Its keys carry no <code>aria-label</code>, and delete is an
      icon only, so it is announced as "button". <code>CashAmountPad</code> and the handheld pad name it "Delete". Checked in the
      prototype's checkout.
    </>,
    "Checkout's Amount tendered and Tip don't set aria-pressed, so which number is being keyed is visible but not announced. AmountReadout, its counterpart in the drawer dialogs, does.",
    'The readout is not a live region; keyed digits are not announced. The keys themselves are (they are buttons named by their digit).',
    <>
      Contrast: keys <Contrast fg={md3.onSurface} bg="#ffffff" />; the readout label{' '}
      <Contrast fg={md3.onSurfaceVariant} bg={md3.surfaceContainer} />. Checkout's selected mode is brand green on
      primary-container, <Contrast fg={md3.primary} bg={md3.primaryContainer} />, which fails at 12px (see Toggle Button).
    </>,
  ],
  decisions: [
    {
      decision: 'No card entry in Birdie',
      why: "The reader takes the card, and card data never passes through a field Birdie draws. A card on file is charged from the customer record, which shows only its last four digits.",
    },
    {
      decision: 'Cents entry, everywhere',
      why: '"So money is keyed one way everywhere on the terminal" (CashAmountPad.tsx): checkout, the drawer dialogs and the cash payout all fill from the right.',
    },
    {
      decision: 'A staged tip',
      why: 'Tips change the charge, "so the operator has to Recalculate before the balance moves. That\'s what stops a mistyped tip from silently becoming the amount charged" (Checkout.tsx).',
    },
    {
      decision: 'One pad, two modes, at checkout',
      why: '"A counter operator does two different arithmetic jobs here: entering the cash tendered … and entering a tip. One pad serves both, and the mode switch makes clear which number is being edited" (Checkout.tsx). The handheld splits them into two steps instead.',
    },
  ],
  tokens: [
    { token: 'md3.surfaceContainer', value: '#eef1ee', role: 'Readout fill' },
    { token: 'md3.primaryContainer', value: '#b7f0cf', role: 'The active readout or mode' },
    { token: 'md3.outlineVariant', value: '#c0c9c1', role: 'Key outline (tablet)' },
    { token: 'mobile.surfaceContainerLow', value: '#f2f5f2', role: 'Key fill (handheld)' },
    { token: 'radius.md', value: '12px', role: 'Keys and readout' },
  ],
  engineering: {
    import: `import { AmountReadout, CashAmountPad } from '../modals/CashAmountPad';`,
    themeOverride: <>None. The keys are <code>ButtonBase</code>; the readout is <code>Typography</code> on a filled box.</>,
    notes: [
      <>
        The pad holds digits as a string of cents (<code>'25812'</code>) and the screen divides by 100 to show it. Keep it a string
        while keying; parse once.
      </>,
      <>
        <code>CashAmountPad</code> calls itself "the terminal's one cash pad", but <code>Checkout.tsx</code> still draws its own
        keys (no names, 38px). Moving checkout onto <code>CashAmountPad</code> fixes both.
      </>,
      <>
        When a dialog keys two amounts, give each an <code>AmountReadout</code> with <code>onClick</code>; it becomes a pressed
        toggle (<code>aria-pressed</code>). A readout with nothing to retarget stays a plain figure.
      </>,
    ],
    snippet: `const [cents, setCents] = useState('');
<AmountReadout label="Cash counted" value={money(cents ? parseInt(cents, 10) / 100 : 0)}
  sub={\`\${money(expected)} expected in the drawer\`} />
<CashAmountPad cents={cents} onChange={setCents} />`,
  },
  related: [
    { name: 'Input Number', id: 'components-forms-input-number' },
    { name: 'Input Group', id: 'components-forms-input-group' },
    { name: 'Pin Input', id: 'components-forms-pin-input' },
    { name: 'Button', id: 'components-actions-button' },
    { name: 'Dialog', id: 'components-feedback-status-dialog' },
  ],
};

export default doc;
