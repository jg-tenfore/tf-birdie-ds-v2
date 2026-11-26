import type { Meta, StoryObj } from '@storybook/react-vite';
import { elevation, md3, mobile, radius, reservationPanel } from '../../theme/tokens';
import { Group, Row, Sheet, Table, mono } from './foundation-parts';

/**
 * Design System › Styles › Effect Styles.
 *
 * Elevation (`elevation.e1`–`e3` in `src/theme/tokens.ts`), the scrims behind overlays, and the
 * motion tokens. Each is shown with the thing that uses it. The write-up is
 * `src/showcase/ds-docs/content/foundations-effect-styles.tsx`.
 */

const LEVELS: { token: keyof typeof elevation; use: string; example: string }[] = [
  { token: 'e1', use: 'Resting tiles you press: register category buttons and product tiles.', example: 'CategoryButton, item tiles (PosView)' },
  { token: 'e2', use: 'The one raised action: the order rail\'s Pay button at rest.', example: 'LeftPanel Pay' },
  { token: 'e3', use: 'Things that float over the screen: menus, popovers, search results, slide-overs, the day summary, toasts; and the hover lift on e1 and e2.', example: 'MuiMenu, MuiDialog, DatePickerPopover, ReservationPanel, TeeSheetSidebar, the toast' },
];

function EffectsSheet() {
  return (
    <Sheet style={{ background: md3.surface }}>
      <Group title="Elevation · elevation in tokens.ts" intro="Three levels, from MD3. Most surfaces are flat: white on the surface ground with a 1.5px outline. A shadow means the thing floats or is the main thing to press. theme.shadows maps 1–3 to these and caps everything above at e3.">
        <Row min={240} gap={20}>
          {LEVELS.map((l) => (
            <div key={l.token} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ height: 96, borderRadius: radius.md, background: '#fff', boxShadow: elevation[l.token], display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: mono, fontSize: 13, fontWeight: 700 }}>
                elevation.{l.token}
              </div>
              <div style={{ fontSize: 12.5, lineHeight: '18px' }}>{l.use}</div>
              <div style={{ fontSize: 11.5, color: md3.onSurfaceVariant }}>{l.example}</div>
            </div>
          ))}
        </Row>
      </Group>

      <Group title="Scrims" intro="The dim behind an overlay. It says the screen behind is paused. The tablet uses three strengths today; the handheld uses MD3's 32%.">
        <Row min={200} gap={16}>
          {[
            { a: 0.7, where: 'Reservation slide-over (ReservationPanel)' },
            { a: 0.6, where: 'Court and bay booking panel (ResourcePanel)' },
            { a: 0.5, where: 'Day summary (TeeSheetSidebar)' },
            { a: 0.32, where: 'Handheld bottom sheets (chrome.tsx)' },
          ].map((s) => (
            <div key={s.a} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ position: 'relative', height: 90, borderRadius: radius.md, overflow: 'hidden', background: '#fff', border: `1.5px solid ${md3.outlineVariant}` }}>
                <div style={{ position: 'absolute', inset: 10, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
                  {Array.from({ length: 8 }, (_, i) => (
                    <span key={i} style={{ borderRadius: 4, background: i % 3 ? md3.primary : md3.primaryContainer }} />
                  ))}
                </div>
                <div style={{ position: 'absolute', inset: 0, background: `rgba(0,0,0,${s.a})` }} />
                <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: '45%', background: '#fff', boxShadow: elevation.e3 }} />
              </div>
              <span style={{ fontFamily: mono, fontSize: 12 }}>rgba(0,0,0,{s.a})</span>
              <span style={{ fontSize: 12.5 }}>{s.where}</span>
            </div>
          ))}
        </Row>
      </Group>

      <Group title="Motion" intro="Short and decelerating. The tablet's panel slides in with the sheet narrowing beside it; the handheld follows MD3's push, sheet and exit durations.">
        <Table
          head={['Token', 'Value', 'Use']}
          rows={[
            ['reservationPanel.motion', reservationPanel.motion, 'The reservation slide-over and the tee sheet narrowing beside it'],
            ['mobile.motion.easing', mobile.motion.easing, 'MD3 standard easing'],
            ['mobile.motion.emphasized', mobile.motion.emphasized, 'Entrances that should feel deliberate'],
            ['mobile.motion.push / sheet / exit', `${mobile.motion.push} / ${mobile.motion.sheet} / ${mobile.motion.exit}ms`, 'A page pushing in, a bottom sheet rising, anything leaving (shorter, accelerating out)'],
          ].map((r) => [<span key="t" style={{ fontFamily: mono, fontSize: 12 }}>{r[0]}</span>, <span key="v" style={{ fontFamily: mono, fontSize: 12 }}>{r[1]}</span>, r[2]])}
        />
      </Group>
    </Sheet>
  );
}

const meta = {
  title: 'Design System/Styles/Effect Styles',
  id: 'foundations-effect-styles',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const EffectStyles: Story = {
  name: 'Effect Styles',
  render: () => <EffectsSheet />,
  parameters: { docs: { description: { story: 'Elevation, scrims and motion, each with the thing that uses it.' } } },
};
