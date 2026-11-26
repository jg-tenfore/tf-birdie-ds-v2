import { describe, expect, it } from 'vitest';
import { TAX_RATE } from './config';
import { TRANSPORT_RATES } from './rate-catalog';
import { BIRDIE_DEFAULTS, PAYMENT_TYPES, PRINTERS, TABLETS, TAX_TYPES, THIS_TABLET, TRANSPORTATION_TYPES, printersFor } from './buck-club';
import { HARDWARE_OPTIONS, TENDER_KEYS, settingsDefaults } from '../state/settings';

describe("Buck's club settings, as the counter reads them", () => {
  it('maps every checkout tender to a Buck payment type, once', () => {
    expect(PAYMENT_TYPES.map((p) => p.tender).sort()).toEqual([...TENDER_KEYS].sort());
  });

  it("offers a register only the club's printers, for the job each is for", () => {
    expect(HARDWARE_OPTIONS.receiptPrinter).toEqual([...printersFor('Pro Shop Printer').map((p) => p.name), 'None']);
    expect(HARDWARE_OPTIONS.kitchenPrinter).toEqual([...printersFor('Service Printer').map((p) => p.name), 'None']);
    const hw = settingsDefaults().terminalSettings.hardware;
    expect(PRINTERS.find((p) => p.name === hw.receiptPrinter)?.uses).toContain('Pro Shop Printer');
    expect(PRINTERS.find((p) => p.name === hw.kitchenPrinter)?.uses).toContain('Service Printer');
  });

  it("names this tablet's printer as one the club has", () => {
    expect(TABLETS).toContain(THIS_TABLET);
    for (const t of TABLETS.filter((x) => x.printer)) expect(PRINTERS.map((p) => p.name)).toContain(t.printer);
  });

  it("keeps Buck's default sales tax at the rate the register charges", () => {
    expect(TAX_TYPES.find((t) => t.isDefault)?.rate).toBe(TAX_RATE);
  });

  it('names defaults and transport the register really sells', () => {
    const teeFee = BIRDIE_DEFAULTS.find((d) => d.label === 'Default Event Transportation')!.value;
    expect(TRANSPORT_RATES.map((r) => r.name)).toContain(teeFee);
    for (const t of TRANSPORTATION_TYPES) expect(TRANSPORT_RATES.some((r) => r.mode === t.mode)).toBe(true);
  });
});
