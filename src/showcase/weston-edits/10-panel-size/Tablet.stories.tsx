import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { Screen } from '../../pos/screen-helpers';
import { adjustedParty, openParty, sheetWithPanel } from '../tablet-scenarios';
import { PANEL_WIDTHS } from '../../../pos/state/pos-store';

/**
 * Weston Edits / 10 · Panel Size / Tablet
 *
 * Weston, on the third call: "I wonder if it should take up more space. Just because I feel
 * like that's like, especially with it being touch… I don't know if we need to collapse the tee
 * sheet. I get the context, you don't lose the context, but I think it's more important to have
 * this bigger than to show more of the tee sheet."
 *
 * He asked to feel the difference rather than pick from a description, so all three are built.
 * The trade is the same one every time — room to work against how much of the day you can see:
 *
 * | | Panel | Tee sheet | What survives |
 * |---|---|---|---|
 * | **640** | 640 | 726 with the rail collapsed | Both nines, the time gutter, the now line |
 * | **820** | 820 | 546 | About one nine |
 * | **Cover** | the whole frame | none | Nothing — one ✕ back to where you were |
 *
 * 640 is what the prototype ships. The other two are a click away here.
 *
 * Two things are worth watching as the panel grows. The tee sheet **narrows** rather than
 * scrolling sideways, so no tee time ever hides under the panel. And the rate editor gets
 * roomier: at 640 the tiles wrap to three or four rows, at 820 they sit in two, which is the
 * argument for the wider panel if the counter spends its day changing rates.
 */
const meta = {
  title: 'Weston Edits/10 · Panel Size/Tablet',
  parameters: { layout: 'fullscreen' },
  globals: { viewport: { value: 'counterTerminal', isRotated: false } },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/**
 * **640 — what the prototype ships.** Wider than the 480 Weston was reacting to, and with the
 * order rail collapsed the sheet still shows both nines. The safest step up: more room to
 * operate without giving up the day.
 */
export const SixForty: Story = {
  render: () => (
    <Screen
      edition="weston"
      initialState={sheetWithPanel(openParty(), 'players', {
        panel: { width: 'standard' },
        leftPanelCollapsed: true,
      })}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const panel = await canvas.findByRole('complementary', { name: /Reservation/ });
    await expect(panel).toBeTruthy();
    // The sheet is still there beside it — that is the whole point of a slide-over.
    await expect(canvas.getAllByText(/Championship/).length).toBeGreaterThan(0);
  },
};

/**
 * **820 — room for the rate tiles.** The player rows get a second column of breathing space and
 * the rate grid stops wrapping so hard. The sheet drops to roughly one nine: you keep your
 * place, but not the whole morning.
 */
export const EightTwenty: Story = {
  render: () => (
    <Screen
      edition="weston"
      initialState={sheetWithPanel(adjustedParty(), 'players', {
        panel: { width: 'wide' },
        leftPanelCollapsed: true,
      })}
    />
  ),
};

/**
 * **Cover — the panel takes the sheet.** Maximum room, and still not a screen change: there is
 * one ✕ and you are back exactly where you were, which was Weston's objection to the old
 * full-screen editor ("it's just a little jarring — you have to click to go back").
 *
 * The tee sheet stops narrowing here. Squeezing it to nothing would collapse its own layout on
 * the way, so the panel simply covers it.
 */
export const Cover: Story = {
  render: () => (
    <Screen
      edition="weston"
      initialState={sheetWithPanel(adjustedParty(), 'players', {
        panel: { width: 'cover' },
        leftPanelCollapsed: true,
      })}
    />
  ),
};

/**
 * The same booking at 640 with the order rail **expanded**, which is the real comparison: the
 * rail costs the sheet 320px, and collapsing it is what buys the panel its extra width without
 * the day disappearing. Weston: "on the tee sheet we always want to maximise the space we have."
 */
export const SixFortyWithTheRail: Story = {
  render: () => (
    <Screen
      edition="weston"
      initialState={sheetWithPanel(openParty(), 'players', {
        panel: { width: 'standard' },
        leftPanelCollapsed: false,
      })}
    />
  ),
};

/** The three widths as numbers, so the doc above cannot drift from what the app uses. */
export const Widths: Story = {
  render: () => (
    <div style={{ padding: 24, fontFamily: 'system-ui', fontSize: 14 }}>
      <h3 style={{ margin: '0 0 12px' }}>Panel widths</h3>
      <table style={{ borderCollapse: 'collapse' }}>
        <tbody>
          {(
            [
              ['standard', '640 — ships in the prototype'],
              ['wide', '820 — room for the rate tiles'],
              ['cover', 'the whole frame'],
            ] as const
          ).map(([key, note]) => (
            <tr key={key}>
              <td style={{ padding: '4px 16px 4px 0', fontWeight: 700 }}>{key}</td>
              <td style={{ padding: '4px 16px 4px 0' }}>
                {PANEL_WIDTHS[key] === 0 ? '100%' : `${PANEL_WIDTHS[key]}px`}
              </td>
              <td style={{ padding: '4px 0', color: '#666' }}>{note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ),
};
