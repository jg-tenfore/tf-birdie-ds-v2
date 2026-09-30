import { describe, expect, it } from 'vitest';
import { TAX_RATE } from '../data/config';
import { createInitialState, reducer, type PosState } from './pos-store';
import { amountDue } from './operations';
import { checkoutProblem, staffProblem } from './settings';

const s0 = () => createInitialState();
const as = (s: PosState, operatorId: string): PosState => ({ ...s, operatorId });

describe('Settings drive the register', () => {
  it('a saved tax rate prices the order being rung, and an order already paid keeps its tax', () => {
    const paid = reducer({ ...s0(), cart: [{ name: 'Titleist Pro V1 Box', price: 54, qty: 1 }] }, { type: 'recordPayment', method: 'card', amount: 58.32 });
    const before = paid.orders.at(-1)!;
    expect(before.tax).toBe(4.32);
    const s = reducer({ ...paid, cart: [], lastPayment: null }, { type: 'saveCheckoutSettings', checkout: { ...paid.terminalSettings.checkout, taxRate: 0.065 } });
    expect(s.terminalSettings.checkout.taxRate).toBe(0.065);
    expect(s.settingsSaved.checkout?.by).toBe('s-1');
    const ringing = { ...s, cart: [{ name: 'Titleist Pro V1 Box', price: 54, qty: 1 }] };
    expect(amountDue(ringing)).toBe(57.51);
    expect(s.orders.find((o) => o.orderNumber === before.orderNumber)!.tax).toBe(4.32);
    // Every edition without Settings is still at the prototype's 8%.
    expect(s0().terminalSettings.checkout.taxRate).toBe(TAX_RATE);
  });

  it('someone added in Settings signs in with their PIN; someone deactivated cannot', () => {
    let s = reducer(s0(), { type: 'saveStaff', member: { name: 'Sam Ortiz', role: 'server', pin: '7777' } });
    s = reducer(s, { type: 'setStaffActive', id: 's-6', active: false });
    const out = reducer(s, { type: 'signOut' });
    const sam = reducer(out, { type: 'signIn', pin: '7777' });
    expect(sam.signedIn).toBe(true);
    expect(sam.operatorId).toBe(s.staffRoster.at(-1)!.id);
    expect(reducer(out, { type: 'signIn', pin: '6666' })).toBe(out);
  });

  it('refuses a checkout draft that would leave nothing to take money with', () => {
    const c = s0().terminalSettings.checkout;
    expect(checkoutProblem({ ...c, tenders: { ...c.tenders, card: false, cash: false } })).toMatch(/Card or Cash/);
    expect(checkoutProblem({ ...c, taxRate: 0.4 })).toMatch(/Tax/);
    expect(checkoutProblem({ ...c, tipPresets: [15, 0, 20] })).toMatch(/tip/i);
    const s = s0();
    expect(reducer(s, { type: 'saveCheckoutSettings', checkout: { ...c, taxRate: 0.4 } })).toBe(s);
  });

  it('saves the hardware, but not without a register name', () => {
    const s = s0();
    const hw = s.terminalSettings.hardware;
    expect(reducer(s, { type: 'saveHardware', hardware: { ...hw, name: '  ' } })).toBe(s);
    expect(reducer(s, { type: 'saveHardware', hardware: { ...hw, name: ' Register 2 ' } }).terminalSettings.hardware.name).toBe('Register 2');
  });
});

describe('staff and PINs are for managers', () => {
  const add = { name: 'Sam Ortiz', role: 'server' as const, pin: '7777' };

  it('a manager adds someone, with a short name made for tickets', () => {
    const s = reducer(s0(), { type: 'saveStaff', member: add });
    expect(s.staffRoster.at(-1)).toMatchObject({ name: 'Sam Ortiz', short: 'Sam O.', pin: '7777', active: true });
  });

  it('anyone else is refused — the rule is in the reducer, not only the screen', () => {
    const server = as(s0(), 's-2');
    expect(reducer(server, { type: 'saveStaff', member: add })).toBe(server);
    expect(reducer(server, { type: 'setStaffActive', id: 's-3', active: false })).toBe(server);
  });

  it('no two people who can sign in share a PIN, and a PIN is four digits', () => {
    const roster = s0().staffRoster;
    expect(staffProblem(roster, { ...add, pin: '2222' })).toMatch(/Jordan Ellis/);
    expect(staffProblem(roster, { ...add, pin: '12' })).toMatch(/four digits/);
    // Their own PIN is not a clash with themselves.
    expect(staffProblem(roster, { id: 's-2', name: 'Jordan Ellis', pin: '2222' })).toBeNull();
  });

  it('a deactivated person’s PIN is free; reactivating them while it is taken is refused', () => {
    let s = reducer(s0(), { type: 'setStaffActive', id: 's-6', active: false });
    s = reducer(s, { type: 'saveStaff', member: { ...add, pin: '6666' } });
    expect(s.staffRoster.at(-1)!.pin).toBe('6666');
    expect(reducer(s, { type: 'setStaffActive', id: 's-6', active: true })).toBe(s);
  });

  it('nobody deactivates themselves', () => {
    const s = s0();
    expect(reducer(s, { type: 'setStaffActive', id: 's-1', active: false })).toBe(s);
  });
});
