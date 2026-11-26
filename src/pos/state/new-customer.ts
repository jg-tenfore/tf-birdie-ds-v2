import { newCustomer, type Customer } from '../data/customers';
import type { BookingGuest } from '../types';
import type { PosState } from './pos-store';

/**
 * A customer made at the counter, onto the session's records — what New customer does, and what the
 * register's rain check does for a walk-in with no record (Nov 26 decision: the credit always belongs
 * to someone who can be looked up later).
 *
 * No type is baked into the name: v1 printed "Weston Farnsworth - Senior", which read as another person.
 * `newCustomer` still does that for the other editions; here the type stays a type.
 */
export type NewCustomerInput = { firstName: string; lastName: string; email?: string; phone?: string; birthday?: string; notes?: string; types?: string[] };

export function withNewCustomer(state: PosState, input: NewCustomerInput): { state: PosState; customer: Customer } {
  const n = state.opsSeq.customer + 1;
  const base = newCustomer({ ...input, types: input.types }, 9000 + n);
  const customer: Customer & { created: true } = { ...base, displayName: `${input.firstName} ${input.lastName}`.trim(), created: true };
  return {
    state: { ...state, customerEdits: { ...state.customerEdits, [customer.id]: customer }, opsSeq: { ...state.opsSeq, customer: n } },
    customer,
  };
}

/** A booking's guests with seat `seat` linked to `customerId` — padded with "Guest N" the way the seat editor pads them. */
export function guestsLinked(guests: BookingGuest[] | undefined, seat: number, customerId: string, name: string, phone?: string): BookingGuest[] {
  // The seed's guest lists can have holes (an unnamed seat between two named ones): fill them too.
  const out = [...(guests ?? [])];
  for (let k = 0; k <= seat; k++) out[k] ??= { name: `Guest ${k + 1}` };
  const was = out[seat];
  const generic = !was.name || /^Guest \d+$/.test(was.name);
  out[seat] = { ...was, name: generic ? name : was.name, crmId: customerId, ...(phone && !was.phone ? { phone } : {}) };
  return out;
}
