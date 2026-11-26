import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor, within } from 'storybook/test';
import { CURRENT_EDITION } from '../../../../pos/edition';
import { CREDIT_BOOKS } from '../../../../pos/data/credits';
import { withEdition } from '../../../edition-decorator';
import { Screen, atVenue } from '../../../pos/screen-helpers';

/**
 * Gift Cards — **credits as TF Buck names them** (Nov 26).
 *
 * Buck › Reports › Credits lists the four instruments a counter meets: gift cards, rain checks, punch
 * cards and credit books. In Birdie they are now the same instruments with Buck's words:
 *
 * - **Credit books** pay out to gift cards — Buck's gift-card detail reads "Paid out from credit book
 *   …", typed *Winnings*. So a Winnings card names its book on the Gift Cards list, at the gift-card
 *   tender, and on the customer's record, which lists the books they are in.
 * - **Punch cards** follow Buck's final design: items with punches awarded, used and remaining — a
 *   Green Fee, counted in rounds — and Buck's status: *Active*, *Expiring soon*, *Exhausted*,
 *   *Expired*. An expired card no longer pays a round, however many punches it shows.
 */
const meta = {
  title: 'Prototypes/Tablet/Gift Cards/Credits from Buck',
  parameters: { layout: 'fullscreen' },
  decorators: [withEdition('current-tablet')],
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** **Winnings say which credit book paid them.** */
export const WinningsNameTheirBook: Story = {
  render: () => <Screen edition={CURRENT_EDITION.tablet} initialState={atVenue('eighteen', { view: 'giftcards', leftPanelCollapsed: true })} />,
  play: async ({ canvasElement }) => {
    const books = await waitFor(() => {
      const els = [...canvasElement.querySelectorAll('[data-credit-book]')];
      if (!els.length) throw new Error('no Winnings rows yet');
      return els;
    });
    const titles = CREDIT_BOOKS.map((b) => b.title);
    for (const el of books) await expect(titles).toContain(el.textContent);
  },
};

/**
 * **A record's punch cards and credit books, by Buck.** Kelsey Sutton's 20-round card expired on
 * March 16 with 18 rounds on it: Buck's status says *Expired*, and the card is not offered to pay a
 * round. Her Winnings card was paid out from a credit book, which her record lists.
 */
export const ARecordsCredits: Story = {
  render: () => (
    <Screen edition={CURRENT_EDITION.tablet} initialState={atVenue('eighteen', { view: 'tee', customerModal: { customerId: '458349' } })} />
  ),
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    const record = await body.findByRole('dialog');
    await waitFor(() => expect(record.querySelector('[data-punch-status]')!.textContent).toBe('Expired'));
    await expect(within(record).getByText('18 rounds')).toBeTruthy();
    await expect(within(record).getByText('Credit books')).toBeTruthy();
    await expect(record.textContent).toMatch(/paid out from credit book/);
  },
};
