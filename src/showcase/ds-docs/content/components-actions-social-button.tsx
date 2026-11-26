import type { DsDoc } from '../types';

/**
 * Social Button — documented so nobody reaches for it. A counter POS signs staff in with a PIN on a
 * shared terminal; customers are found by name or phone, never by a third-party account.
 */
const doc: DsDoc = {
  summary: (
    <>
      A "Continue with Google / Apple" button for signing in through another company's account. <strong>Birdie has no
      place for it.</strong> Staff sign in to a shared counter terminal with a <strong>PIN</strong>, and customers are found by
      name, phone or member number, never through a social account. This page exists so nobody adds one.
    </>
  ),
  status: 'avoid',
  statusNote: (
    <>
      Not used, and not themed. A candidate to remove from the system. Staff sign-in is the PIN pad; finding a customer is
      Customer Search.
    </>
  ),
  useFor: ['Nothing in Birdie. A guest-facing web booking site might want one; that is not this product.'],
  dontUseFor: [
    'Staff signing in: the PIN pad on the sign-in screen. A shared terminal changes hands many times a shift.',
    'Finding or linking a customer: Customer Search, by name, phone or member number.',
    'Paying: payments go through the card reader and the tender dialogs.',
  ],
  inBirdie: [
    {
      label: 'What Birdie does instead: the PIN pad',
      caption: (
        <>
          The sign-in screen on the counter terminal. Staff tap a 4-digit PIN; switching user is signing out and letting the
          next person in. No email, no password, no third-party account.
        </>
      ),
      shot: 'tablet-sign-in',
      storyId: 'v1-→-v2-migration-sign-in-tablet--demo-pins',
    },
    {
      label: 'What Birdie does instead: Customer Search',
      caption: (
        <>
          A customer is found by what they say at the counter: a name, a phone number, a member number. The record comes from
          the club's own data, not from a social login.
        </>
      ),
      shot: 'tablet-customer-search',
      tabletHash: '#/customers?cid=M005',
    },
  ],
  anatomy: [
    { part: 'Provider mark', description: "Another company's logo. Birdie's icon set has no brand marks, and the brief for these pages is to name no outside brands." },
    { part: 'Label', description: '"Continue with …". Not a sentence Birdie ever needs.' },
  ],
  states: [
    { state: 'Any', tablet: 'Not used.', handheld: 'Not used.' },
  ],
  behavior: [
    'A shared terminal is signed into by whoever is at it, many times a shift. A PIN is the right weight for that; an account sign-in is not.',
    'Signing in through a third party would also leave a personal account signed in on a shared device.',
  ],
  dos: ['Use the PIN pad for staff.', 'Use Customer Search to find a customer.'],
  donts: ['Add a social sign-in to the terminal or the handheld.', "Put another company's logo on a Birdie button."],
  a11y: [
    "Nothing to check: the component isn't used. The PIN pad and Customer Search have their own pages.",
  ],
  decisions: [
    {
      decision: 'Staff sign in with a PIN',
      why: 'On a shared terminal, switching user is signing out and letting the next person in (the main navigation’s Switch user does exactly that). A PIN takes two seconds; an account sign-in takes a minute and leaves a session behind.',
    },
    {
      decision: 'Keep the page, mark it Avoid',
      why: 'A Material component kit ships this button, so someone will find it. The page says no before they build with it.',
    },
  ],
  engineering: {
    notes: [
      <>
        Staff sign-in lives in <code>src/pos/components/operations/SignInScreen.tsx</code>; switching operator dispatches{' '}
        <code>signOut</code> from the main navigation (<code>src/pos/components/NavOverlay.tsx</code>).
      </>,
      'The story below is a plain outlined MUI Button with a provider icon. It is kept only so the pattern is recognisable.',
    ],
  },
  related: [
    { name: 'Button', id: 'components-actions-button' },
    { name: 'Pin Input', id: 'components-forms-pin-input' },
    { name: 'Autocomplete', id: 'components-forms-autocomplete' },
  ],
};

export default doc;
