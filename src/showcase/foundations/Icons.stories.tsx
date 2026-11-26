import type { Meta, StoryObj } from '@storybook/react-vite';
import GolfCourse from '@mui/icons-material/GolfCourse';
import GolfCourseOutlined from '@mui/icons-material/GolfCourseOutlined';
import PointOfSale from '@mui/icons-material/PointOfSale';
import PointOfSaleOutlined from '@mui/icons-material/PointOfSaleOutlined';
import Group from '@mui/icons-material/Group';
import GroupOutlined from '@mui/icons-material/GroupOutlined';
import { ICONS } from '../../pos/icons';
import { Icon } from '../../pos/components/primitives';
import { md3, mobile } from '../../theme/tokens';
import { Card, Group as Section, Sheet, Table, mono } from './foundation-parts';

/**
 * Design System › Styles › Icons.
 *
 * The tablet's whole icon vocabulary is the registry in `src/pos/icons.ts`: Material Symbols
 * ligature names resolved to `@mui/icons-material` components. This sheet renders every entry,
 * read from the registry, so it can't list a glyph the product doesn't have. The write-up is
 * `src/showcase/ds-docs/content/foundations-icons.tsx`.
 */

const NAMES = Object.keys(ICONS).sort();

function Registry() {
  return (
    <Sheet>
      <Section
        title={`The registry · ${NAMES.length} names in src/pos/icons.ts`}
        intro={"Write an icon by its ligature name: <Icon name=\"how_to_reg\" />. The name is the vocabulary the ported data files use (settings menus, transport, shifts, context menus). A name that isn't here renders a neutral dot, so icons.test.ts fails the build instead."}
      >
        <div style={{ display: 'grid', gap: 6, gridTemplateColumns: 'repeat(auto-fill, minmax(118px, 1fr))' }}>
          {NAMES.map((n) => (
            <div key={n} title={n} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '10px 4px 8px', borderRadius: 10, border: `1px solid ${md3.surfaceHigh}` }}>
              <Icon name={n} size={22} color={md3.onSurface} />
              <span style={{ fontFamily: mono, fontSize: 10, color: md3.onSurfaceVariant, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n}</span>
            </div>
          ))}
        </div>
      </Section>
    </Sheet>
  );
}

const TABLET_SIZES: { size: number; glyph: string; where: string }[] = [
  { size: 13, glyph: 'lock', where: 'Inline with 11–12px text: "Sent 11:18 AM", hints, chip meta' },
  { size: 14, glyph: 'schedule', where: 'InfoRow and other icon · value rows (12px text)' },
  { size: 16, glyph: 'how_to_reg', where: 'The default (Icon size = 16). Toolbar and list icons beside 13px text' },
  { size: 18, glyph: 'send', where: 'Icons in buttons: Send, Add, Void, dialog actions' },
  { size: 20, glyph: 'sports_golf', where: 'Register category tiles; panel headers' },
  { size: 38, glyph: 'search_off', where: 'EmptyState: an empty cart, grid or result list' },
];

function Sizes() {
  return (
    <Sheet>
      <Section title="Sizes on the tablet" intro="Set in pixels, matched to the text beside it (Icon takes size, not MUI's fontSize scale). The icon sits a little larger than its text's x-height.">
        <Table
          head={['Size', 'Sample', 'Where']}
          widths={[70, 150, 'auto']}
          rows={TABLET_SIZES.map((s) => [
            <span key="s" style={{ fontFamily: mono, fontSize: 12 }}>{s.size}px</span>,
            <span key="g" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: Math.max(11, s.size - 4) }}>
              <Icon name={s.glyph} size={s.size} color={md3.onSurfaceVariant} />
              <span style={{ fontFamily: mono, fontSize: 11, color: md3.onSurfaceVariant }}>{s.glyph}</span>
            </span>,
            <span key="w" style={{ fontSize: 12.5 }}>{s.where}</span>,
          ])}
        />
      </Section>
      <Section title="On the handheld" intro={`MD3 icons at 24dp in a ${mobile.touchTarget}dp target. Outlined when at rest, filled when active: the navigation bar swaps each destination's outlined glyph for its filled one, on the active pill.`}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {[
            { label: 'Tee Sheet', on: GolfCourse, off: GolfCourseOutlined, active: true },
            { label: 'Register', on: PointOfSale, off: PointOfSaleOutlined, active: false },
            { label: 'People', on: Group, off: GroupOutlined, active: false },
          ].map(({ label, on: On, off: Off, active }) => {
            const Ico = active ? On : Off;
            return (
              <Card key={label} style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: 110 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 32, borderRadius: 16, background: active ? mobile.secondaryContainer : 'transparent' }}>
                  <Ico sx={{ fontSize: 24, color: active ? mobile.onSecondaryContainer : md3.onSurfaceVariant }} />
                </span>
                <span style={{ fontSize: 12, fontWeight: active ? 700 : 500 }}>{label}</span>
                <span style={{ fontFamily: mono, fontSize: 10, color: md3.onSurfaceVariant }}>{active ? 'filled · active' : 'outlined'}</span>
              </Card>
            );
          })}
        </div>
      </Section>
    </Sheet>
  );
}

const meta = {
  title: 'Design System/Styles/Icons',
  id: 'foundations-icons',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Icons: Story = {
  render: () => <Registry />,
  parameters: { docs: { description: { story: 'Every name in the registry, rendered through the Icon primitive.' } } },
};

export const SizesAndStyles: Story = {
  name: 'Sizes and styles',
  render: () => <Sizes />,
  parameters: { docs: { description: { story: 'The tablet sizes and what each sits beside; the handheld outlined and filled pair.' } } },
};
