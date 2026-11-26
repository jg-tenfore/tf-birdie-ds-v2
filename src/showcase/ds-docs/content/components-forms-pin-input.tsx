import { md3 } from '../../../theme/tokens';
import { Contrast } from '../Contrast';
import type { DsDoc } from '../types';

/** `fg` drawn at `alpha` over `bg`, as hex: the sign-in screen draws its keys and secondary text in white at an opacity. */
const over = (fg: string, bg: string, alpha: number) =>
  '#' +
  [1, 3, 5]
    .map((i) => Math.round(alpha * parseInt(fg.slice(i, i + 2), 16) + (1 - alpha) * parseInt(bg.slice(i, i + 2), 16)).toString(16).padStart(2, '0'))
    .join('');

/** Pin Input: four dots and a keypad, on the tablet's sign-in screen. Not the four boxes of the live example. */
const doc: DsDoc = {
  summary: (
    <>
      How a person signs in to a shared terminal: <strong>four dots and a keypad</strong>. Each member of staff has their own
      four-digit PIN. The dots fill as digits are pressed, the fourth digit signs in (there is no Sign in button), and a PIN the
      store doesn't know shakes the dots and clears the pad. Birdie doesn't use the four separate boxes in the live example: on a
      touchscreen a box brings up the system keyboard, and a box shows the digit.
    </>
  ),
  status: 'in-use',
  statusNote: (
    <>
      Used once, on the tablet's sign-in screen (<code>SignInScreen.tsx</code>), over the whole terminal. The handheld has no PIN
      pad yet: Switch operator lists the staff and signs in with a tap, a stand-in the code says so about.
    </>
  ),
  mui: [],
  useFor: [
    'Signing in to a shared terminal: who is working the register, and so whose sales, tabs and tips these are.',
    'A short numeric secret that must not be shown on screen.',
  ],
  dontUseFor: [
    'Setting someone\'s PIN: that is a manager\'s form field in Settings › Staff & PINs.',
    'Codes on paper or cards (gift cards, confirmation numbers): use a search field, and scan where you can.',
    'Approving one action: Birdie has "no manager approvals" (operations.ts). A discount Buck flags is applied only by a manager who is signed in.',
  ],
  inBirdie: [
    {
      label: 'Sign-in, tablet',
      caption: (
        <>
          Left: the facility, the time, who signed out and what is still open ("It stays as it was for whoever signs in next").
          Right: "Enter your PIN", four dots, and 72px keys. The demo PINs are labelled as such: a prototype's PINs, not a
          security model.
        </>
      ),
      shot: 'tablet-sign-in',
      storyId: 'v1-→-v2-migration-sign-in-tablet--sign-out-wrong-pin-right-pin',
    },
    {
      label: 'Switching user, tablet',
      caption: <>Signing out leaves the order on the register for the next person; their PIN picks it up.</>,
      storyId: 'v1-→-v2-migration-sign-in-tablet--switch-user',
    },
    {
      label: 'Switch operator, handheld',
      caption: (
        <>
          More › Switch operator opens a list of staff; a tap signs in as that person. It "stands in for the keypad" until the
          handheld has one (MoreScreen.tsx).
        </>
      ),
      handheldRoute: 'prototypes-mobile-global-nav-menu-by-role--switching-operator',
    },
    {
      label: 'Staff & PINs, tablet',
      caption: (
        <>
          Where a PIN is set: managers only. Four digits, and no two people who can sign in share one; the dialog says which rule
          a PIN breaks.
        </>
      ),
      storyId: 'v1-→-v2-migration-18-·-settings-tablet--staff-as-a-manager',
    },
  ],
  birdie: [
    {
      name: 'SignInScreen',
      file: 'src/pos/components/operations/SignInScreen.tsx',
      use: 'the PIN pad: dots, an error line, a 3×4 keypad, keyboard input, and the terminal as it was left.',
      surface: 'tablet',
    },
    {
      name: 'staffByPin',
      file: 'src/pos/data/staff.ts',
      use: 'who a PIN belongs to: only someone active on the roster.',
      surface: 'both',
    },
  ],
  anatomy: [
    { part: 'Prompt', description: '"Enter your PIN", centred above the dots.' },
    { part: 'Dots', description: 'Four 16px circles with a 2px white outline; each fills white as a digit is pressed. They never show the digit.' },
    { part: 'Error line', description: 'Reserved space under the dots, so the pad doesn\'t jump: "PIN not recognised. Try again."' },
    { part: 'Keypad', description: '1–9, then Clear, 0 and delete. 72px keys, radius lg, white at 10% on the scrim.' },
    { part: 'The terminal (left)', description: 'Facility, date and time, who signed out, and what is still open: an order, held orders, the drawer.' },
  ],
  variants: [
    { name: 'Sign-in (full terminal)', use: 'Nobody is signed in: the pad covers everything, dialogs included.', avoid: 'Partial overlays; a dialog left open by the last person is still theirs.' },
    { name: 'Switch operator (handheld)', use: 'For now: a staff list in a bottom sheet.', avoid: 'Shipping it. A real handheld needs the PIN pad too.' },
  ],
  states: [
    { state: 'Empty', tablet: 'Four outlined dots. The keypad is ready; so is the keyboard.' },
    { state: 'Entering', tablet: 'A dot fills per digit. Delete removes the last; Clear empties all four.' },
    { state: 'Fourth digit', tablet: 'Submits at once. Nothing to confirm.' },
    { state: 'Refused', tablet: 'The dots shake (0.45s) and outline in pale red; "PIN not recognised. Try again." shows; the pad clears.' },
    { state: 'Accepted', tablet: 'The overlay goes; the register is as the last person left it.' },
  ],
  sizing: [
    { surface: 'Tablet', size: '72px keys, three across a 300px column; 16px dots.', why: 'The first thing anyone touches on a shift, and the pad has the screen to itself. The biggest keys in the product.' },
    { surface: 'Handheld', size: 'Not built yet: the staff list uses 72dp two-line rows.', why: 'MD3 list rows.' },
  ],
  behavior: [
    'The fourth digit submits. There is no Sign in button to find.',
    'The store decides: an unknown PIN leaves the state as it was, and the screen reads that as a refusal.',
    'A physical keyboard works too: digits, Backspace to delete, Escape to clear.',
    'Signing in takes over whatever is open. An order on the register, held orders and an open drawer stay, and the screen says so.',
    'Only active staff can sign in (staffByPin checks the roster).',
  ],
  content: [
    '"Enter your PIN". Not "Password", not "Code".',
    'The refusal says what happened and what to do: "PIN not recognised. Try again."',
    'Say what the next person inherits: "1 order open on the register · 3 lines".',
  ],
  dos: [
    'Use dots and a keypad for a PIN, never a text field.',
    'Submit on the last digit.',
    'Keep space for the error line so nothing moves when it appears.',
  ],
  donts: [
    'Show the digits, even for a moment.',
    'Accept any four digits. v1 did, so a PIN identified nobody.',
    'Separate boxes per digit on a touchscreen; each one summons the keyboard.',
  ],
  a11y: [
    'Keys are buttons named by their digit, "Clear" and "Delete last digit".',
    'The refusal is a role="alert" line, so it is announced when it appears.',
    <>
      <strong>Gap: the dots' count is not announced.</strong> The row has <code>aria-label="2 of 4 digits entered"</code> on a
      plain <code>div</code>, which most screen readers ignore. A <code>role="status"</code> (polite live region) with that text
      would say it as it changes.
    </>,
    'The overlay is role="dialog" with aria-modal and the name "Sign in".',
    <>
      Contrast on the scrim, computed: the prompt and keys <Contrast fg="#ffffff" bg={md3.scrim} />, a key's digit on its fill{' '}
      <Contrast fg="#ffffff" bg={over('#ffffff', md3.scrim, 0.1)} />, the secondary line (white at 66%){' '}
      <Contrast fg={over('#ffffff', md3.scrim, 0.66)} bg={md3.scrim} />, the refusal <Contrast fg="#ffb4ab" bg={md3.scrim} />, and an
      empty dot's outline (white at 70%) <Contrast fg={over('#ffffff', md3.scrim, 0.7)} bg={md3.scrim} size="non-text" />.
    </>,
  ],
  decisions: [
    {
      decision: 'A PIN pad, not a text field',
      why: 'v1 had a text field and a SIGN IN button. On a touch terminal the field brought up "a full QWERTY sheet for four digits", and it showed nothing of how many had been typed (SignInScreen.tsx).',
    },
    {
      decision: 'Each person has their own PIN',
      why: 'In v1 any four digits worked and the first digit picked one of three operators, so a PIN was not really identifying anybody. Now the store refuses a PIN it doesn\'t know.',
    },
    {
      decision: 'The order stays at sign-out',
      why: '"A shared terminal hands over mid-order all the time (a server takes over a tab, the shop covers a break), and throwing the order away at sign-out would lose a sale" (SignInScreen.tsx).',
    },
    {
      decision: 'Managers set PINs',
      why: 'Anyone signed in may change the terminal settings; only a manager may change staff and PINs, and the reducer enforces it rather than the screen hiding a button (settings.ts).',
    },
  ],
  tokens: [
    { token: 'md3.scrim', value: '#1a1c1a', role: 'The sign-in backdrop' },
    { token: 'md3.primaryContainer', value: '#b7f0cf', role: 'The product name and its mark' },
    { token: 'radius.lg', value: '16px', role: 'Keys' },
    { token: 'radius.md', value: '12px', role: 'The "left open" and demo PIN boxes' },
  ],
  engineering: {
    import: `import { SignInScreen } from '../components/operations/SignInScreen';
import { staffByPin } from '../data/staff';`,
    themeOverride: <>None. The screen draws on the scrim with white at set opacities; keys are <code>ButtonBase</code>.</>,
    notes: [
      <>
        The screen dispatches <code>{'{'} type: 'signIn', pin {'}'}</code> and checks <code>state.signedIn</code> after the
        render: the reducer is the only judge of a PIN.
      </>,
      <>
        Keyboard input is a <code>keydown</code> listener on <code>window</code>, added only while nobody is signed in.
      </>,
      <>
        The PIN field in <code>StaffFormDialog</code> is a plain <code>Field</code> that keeps digits only and stops at four. It
        shows the PIN, on purpose or not; worth deciding (open question).
      </>,
    ],
    snippet: `const press = (k: string) => {
  if (k === 'clear') return setPin('');
  if (k === 'back') return setPin((p) => p.slice(0, -1));
  const next = (pin + k).slice(0, 4);
  setPin(next);
  if (next.length === 4) dispatch({ type: 'signIn', pin: next });
};`,
  },
  related: [
    { name: 'Input Payment', id: 'components-forms-input-payment' },
    { name: 'Input Number', id: 'components-forms-input-number' },
    { name: 'Text Field', id: 'components-forms-text-field' },
    { name: 'Dialog', id: 'components-feedback-status-dialog' },
  ],
};

export default doc;
