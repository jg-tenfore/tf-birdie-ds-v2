import { expect, screen, userEvent, waitFor, within } from 'storybook/test';
import { lessonInstructor } from '../../../../pos/data/credits';
import { golferOf } from '../../../../pos/data/customers';
import { liveCustomer } from '../../../../pos/data/roster';
import type { PosState } from '../../../../pos/state/pos-store';
import type { CartItem, Transport } from '../../../../pos/types';
import { atVenue } from '../../../pos/screen-helpers';

/**
 * Shared by the Pro Shop checkout stories (Nov 26, "checkout that's right"): the customers who hold
 * Buck's credits, counter orders built from catalog lines, and the taps that pay one.
 */

/** Customers with credits (invented, from the ported roster). */
export const HOLDERS = {
  /** Kelsey Sutton — Men's League Weekly Play book, two rain checks, the Golf & Range Bundle card. */
  kelsey: '458349',
  /** Marissa Chen — a Range Pass and a Sim Bay 10-Pack beside her 20-round card. */
  marissa: '458346',
  /** Priya Raman — two lesson packs. */
  priya: '458347',
  /** Chris Moreno — the Member-Guest book, which pays for alcohol. */
  chris: '458348',
} as const;

export const golfer = (id: string) => golferOf(liveCustomer(id)!);

/** A round rung at the counter, with a tee time on the 18-hole club so Pay goes straight to checkout. */
export function counterRound(players = 1, transport: Transport = 'cart', name = 'Guest Rate 18 Holes', fee = 59): CartItem {
  return {
    name,
    unitPrice: fee,
    price: fee * players,
    qty: players,
    isCheckIn: true,
    teeTime: { courseId: 'champ-front', courseName: 'Championship · Front 9', timeMin: 10 * 60 + 8, label: '10:08 AM' },
    players: Array.from({ length: players }, (_, i) => ({
      name: `Guest ${i + 1}`,
      transport,
      modifierTags:
        transport === 'cart' ? [{ name: 'Riding Cart', tag: 'CART', tagColor: '#1d4ed8', p: 20, isTransport: true }] : [],
    })),
  };
}

export const item = (name: string, price: number, qty = 1): CartItem => ({ name, price, qty });

/** A lesson rung up with its instructor (Nov 26): `lesson('Lesson 30 Min', 55, 'jordan-pike')`. */
export function lesson(name: string, price: number, instructorId: string): CartItem {
  const who = lessonInstructor(instructorId)!;
  return { name, price, qty: 1, lesson: { instructorId: who.id, instructor: who.name } };
}

/** The register at the 18-hole club with `cart` on the order, `customerId` attached. */
export function counterOrder(cart: CartItem[], customerId?: string, extra: Partial<PosState> = {}): Partial<PosState> {
  return atVenue('eighteen', {
    view: 'pos',
    leftPanelCollapsed: false,
    cart,
    ...(customerId && { selectedGolfer: golfer(customerId) }),
    ...extra,
  });
}

export const dialog = async () => within(await screen.findByRole('dialog'));
export const q = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector<T>(sel);
export const usd = (n: number) => `$${n.toFixed(2)}`;

/** Wait for a selector, and return it. */
export async function find(sel: string): Promise<HTMLElement> {
  return waitFor(() => {
    const el = q(sel);
    if (!el) throw new Error(`waiting for ${sel}`);
    return el;
  });
}

/** From checkout: tap a card-reader tender and approve it, leaving the receipt on screen. */
export async function payOnReader(method: RegExp = /^card$/i): Promise<void> {
  const checkout = await dialog();
  await userEvent.click(checkout.getByRole('button', { name: method }));
  const reader = await dialog();
  await userEvent.click(reader.getByRole('button', { name: /Simulate tap|Cash received/ }));
  await waitFor(() => expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'Done' })).toBeTruthy(), { timeout: 4000 });
}

/** Close the reader's done step. */
export async function done(): Promise<void> {
  await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Done' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
}

/** From checkout: Credits › one of the four (Rain check, Punch card, Credit book, Lesson credit). */
export async function chooseCredit(name: string): Promise<void> {
  const checkout = await dialog();
  await userEvent.click(checkout.getByRole('button', { name: 'Credits' }));
  await userEvent.click(await within(document.body).findByRole('menuitem', { name }));
}
