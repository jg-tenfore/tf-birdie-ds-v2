import { describe, expect, it } from 'vitest';
import { cleanJsDoc, parseStoryExports, sanitize, storyId, storyNameFromExport } from './story-meta';

describe('storyNameFromExport (Storybook startCase)', () => {
  it.each([
    ['Interactive', 'Interactive'],
    ['DetailPlayers', 'Detail Players'],
    ['Tee18', 'Tee 18'],
    ['ModifiersNeedARound', 'Modifiers Need A Round'],
    ['CheckInRates', 'Check In Rates'],
    ['snake_case_name', 'Snake Case Name'],
    ['Pay9Holes', 'Pay 9 Holes'],
  ])('%s → %s', (input, expected) => {
    expect(storyNameFromExport(input)).toBe(expected);
  });
});

describe('sanitize / storyId', () => {
  it('keeps the middle dot and drops ampersands', () => {
    expect(sanitize('Mobile Screens/1 · Register & Order')).toBe('mobile-screens-1-·-register-order');
  });

  it('matches the ids Storybook indexes', () => {
    expect(storyId('Mobile Screens/2 · Tee Sheet', 'Default')).toBe('mobile-screens-2-·-tee-sheet--default');
    expect(storyId('Mobile Screens/0 · Navigation', 'OrderInProgress')).toBe(
      'mobile-screens-0-·-navigation--order-in-progress',
    );
    expect(storyId('Mobile Screens/3 · Booking & Check-in', 'Tee18')).toBe(
      'mobile-screens-3-·-booking-check-in--tee-18',
    );
  });
});

describe('cleanJsDoc', () => {
  it('strips gutters, joins wrapped lines and keeps paragraphs', () => {
    expect(cleanJsDoc('\n * First line\n * continues.\n *\n * Second para.\n ')).toBe(
      'First line continues.\n\nSecond para.',
    );
  });

  it('handles a one-line comment', () => {
    expect(cleanJsDoc(' Retail only: no round. ')).toBe('Retail only: no round.');
  });
});

describe('parseStoryExports', () => {
  const source = `import x from 'y';

/**
 * File header — belongs to meta, not a story.
 */
const meta = { title: 'Mobile Screens/0 · Navigation' } satisfies Meta;
export default meta;

/** Zebra comes first in the file. */
export const Zebra: Story = { render: () => null };

// ─── Section divider ───

export const NoDoc: Story = { render: () => null };

/**
 * Two lines
 * of prose.
 */
export const Apple: Story = {
  render: () => null,
};

/** Orphaned: separated from the export by code. */
const helper = 1;
export const AfterHelper: Story = { render: () => null };
`;

  it('keeps source order, not alphabetical', () => {
    expect(parseStoryExports(source).map((e) => e.exportName)).toEqual(['Zebra', 'NoDoc', 'Apple', 'AfterHelper']);
  });

  it('attaches only the JSDoc directly above each export', () => {
    const byName = Object.fromEntries(parseStoryExports(source).map((e) => [e.exportName, e.description]));
    expect(byName.Zebra).toBe('Zebra comes first in the file.');
    expect(byName.NoDoc).toBe('');
    expect(byName.Apple).toBe('Two lines of prose.');
    expect(byName.AfterHelper).toBe('');
  });
});
