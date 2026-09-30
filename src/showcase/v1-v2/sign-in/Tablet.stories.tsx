import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { APP_IDENTITY } from '../../../pos/data/nav';
import { STAFF } from '../../../pos/data/staff';
import type { CartItem } from '../../../pos/types';
import { Screen, atVenue } from '../../pos/screen-helpers';

/**
 * V1 → V2 Migration / Sign-in / Tablet
 *
 * **Who is at the terminal — a PIN pad, one PIN per person.**
 *
 * ## What v1 did
 *
 * `tf-birdie-ds-v1/app/src/screens/sign-in.tsx`, from `references/072926/pin.png`: a logo, a text
 * field reading "Enter your PIN" and a SIGN IN button. **Any** four digits signed in; the first digit
 * chose one of three operators.
 *
 * ## What was wrong with it
 *
 * A text field on a touch terminal brings up a full keyboard for four digits, and showed nothing of
 * how many had been typed. Nothing was ever refused, so the PIN identified nobody. And the screen
 * said nothing about the terminal it opened — which facility, and what the last person left open.
 *
 * ## What this does
 *
 * - **A PIN pad** — four dots, 1–9, Clear, 0, backspace, 72px keys. The fourth digit submits.
 * - **Each person has their own PIN.** A PIN the store does not know is refused and the state is
 *   unchanged: the dots shake, "PIN not recognised", and the pad clears.
 * - **The terminal as it was left**: facility, time, who signed out, and what is still open. An
 *   order on the register **stays** for whoever signs in next — a shared terminal hands over mid-order
 *   all the time — and the screen says so. Held orders and the drawer stay open too.
 * - **Log Out and Switch user** in the main nav both end the session and bring this up.
 * - **Demo PINs**, clearly labelled, so anyone reviewing can get in.
 */
const meta = {
  title: 'V1 → V2 Migration/Sign-in/Tablet',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj;

const at = (extra = {}) => atVenue('eighteen', { view: 'timeclock', leftPanelCollapsed: true, ...extra });

const pad = (el: HTMLElement) => el.querySelector<HTMLElement>('[data-sign-in]');
const key = (el: HTMLElement, k: string) => userEvent.click(el.querySelector<HTMLElement>(`[data-pin-key="${k}"]`)!);
const enter = async (el: HTMLElement, pin: string) => {
  for (const d of pin) await key(el, d);
};
const dots = (el: HTMLElement) => el.querySelector('[data-pin-dots]')!.getAttribute('data-pin-dots');

/**
 * **Sign out from the nav, get refused, get in.** Log Out brings up the pad over everything. 1234 is
 * nobody's PIN: refused, and the pad clears. 2222 is Jordan's — the terminal is now his, and Time
 * Clock marks his row "You".
 */
export const SignOutWrongPinRightPin: Story = {
  render: () => <Screen edition="v1v2" initialState={at({ navOpen: true })} />,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Log Out' }));
    await waitFor(() => expect(pad(canvasElement)).not.toBeNull());
    await expect(canvasElement.querySelector('[data-facility]')!.textContent).toBe(APP_IDENTITY.facility);

    await enter(canvasElement, '1234');
    await waitFor(() => expect(canvasElement.querySelector('[data-pin-error]')!.textContent).toContain('PIN not recognised'));
    await expect(dots(canvasElement)).toBe('0');
    await expect(pad(canvasElement)).not.toBeNull();

    await enter(canvasElement, '2222');
    await waitFor(() => expect(pad(canvasElement)).toBeNull());
    const row = canvasElement.querySelector<HTMLElement>('[data-clock-row="s-2"]')!;
    await expect(row.textContent).toContain('YOU');
    await expect(canvasElement.querySelector('[data-clock-row="s-1"]')!.textContent).not.toContain('YOU');
  },
};

/** **Switch user does the same** — on a shared terminal, switching *is* signing out for the next person. */
export const SwitchUser: Story = {
  render: () => <Screen edition="v1v2" initialState={at({ navOpen: true })} />,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Switch user' }));
    await waitFor(() => expect(pad(canvasElement)).not.toBeNull());
    await enter(canvasElement, '6666');
    await waitFor(() => expect(pad(canvasElement)).toBeNull());
    await expect(canvasElement.querySelector('[data-clock-row="s-6"]')!.textContent).toContain('YOU');
  },
};

/** **Backspace and Clear.** The dots count what has been keyed; nothing submits until the fourth. */
export const BackspaceAndClear: Story = {
  render: () => <Screen edition="v1v2" initialState={at({ signedIn: false })} />,
  play: async ({ canvasElement }) => {
    await enter(canvasElement, '12');
    await expect(dots(canvasElement)).toBe('2');
    await key(canvasElement, 'back');
    await expect(dots(canvasElement)).toBe('1');
    await enter(canvasElement, '11');
    await key(canvasElement, 'clear');
    await expect(dots(canvasElement)).toBe('0');
    await expect(pad(canvasElement)).not.toBeNull();
  },
};

const retail: CartItem[] = [
  { name: 'Golf Glove Mens', price: 18, qty: 1 },
  { name: 'Water', price: 2.5, qty: 2 },
];

/**
 * **An order on the register stays for the next person.** The pad says "1 order open on the register"
 * before anyone signs in, and after Hannah does, the order is still on the rail.
 */
export const AnOrderStaysOnTheRegister: Story = {
  render: () => <Screen edition="v1v2" initialState={atVenue('eighteen', { view: 'pos', leftPanelCollapsed: false, cart: retail, signedIn: false })} />,
  play: async ({ canvasElement }) => {
    const left = canvasElement.querySelector<HTMLElement>('[data-left-open]')!;
    await expect(left.textContent).toContain('1 order open on the register · 2 lines');
    await expect(left.textContent).toContain('stays as it was');
    await enter(canvasElement, '5555');
    await waitFor(() => expect(pad(canvasElement)).toBeNull());
    await expect(within(canvasElement).getByRole('button', { name: /^Pay \$/ })).toBeTruthy();
  },
};

/** **Demo PINs**, labelled as a prototype's — every person and their four digits. */
export const DemoPins: Story = {
  render: () => <Screen edition="v1v2" initialState={at({ signedIn: false })} />,
  play: async ({ canvasElement }) => {
    const hint = canvasElement.querySelector<HTMLElement>('[data-demo-pins]')!;
    await expect(hint.textContent).toContain('PROTOTYPE ONLY');
    for (const s of STAFF) {
      await expect(hint.textContent).toContain(s.name);
      await expect(hint.textContent).toContain(s.pin);
    }
  },
};

/** **Weston Edits has no sign-in** — even with the state saying nobody is signed in. */
export const WestonEditionHasNone: Story = {
  render: () => <Screen edition="weston" initialState={atVenue('eighteen', { signedIn: false })} />,
  play: async ({ canvasElement }) => {
    await expect(pad(canvasElement)).toBeNull();
  },
};
