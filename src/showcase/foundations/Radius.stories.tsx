import type { ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useTheme } from '@mui/material/styles';
import { md3, radius } from '../../theme/tokens';
import { PayBadge } from '../../pos/components/primitives';
import { Card, Group, Sheet, Table, mono } from './foundation-parts';

/**
 * Design System › Styles › Radius.
 *
 * The four corner tokens in `src/theme/tokens.ts` (`radius.sm` … `radius.xl`), plus the circle,
 * each shown on the thing that uses it. The write-up is
 * `src/showcase/ds-docs/content/foundations-radius.tsx`.
 */

const outline = `1.5px solid ${md3.outlineVariant}`;

function RadiusSheet() {
  const t = useTheme();
  const steps: { token: string; value: string; sample: ReactNode; tablet: string; handheld: string }[] = [
    {
      token: 'radius.sm / 2',
      value: `${radius.sm / 2}px`,
      sample: <PayBadge pay="paid" />,
      tablet: 'PayBadge and other small status tags',
      handheld: 'Status tags',
    },
    {
      token: 'radius.sm',
      value: `${radius.sm}px`,
      sample: <span style={{ display: 'inline-block', width: 120, padding: '4px 8px', borderRadius: radius.sm, background: md3.primary, border: `1.5px solid ${md3.primary}`, color: '#fff', fontSize: 9, fontWeight: 800 }}>REED, M.</span>,
      tablet: 'Tee-sheet chips, tooltips, toasts, small tags and notes',
      handheld: 'Chips (MD3 filter and assist chips have 8dp corners)',
    },
    {
      token: 'radius.md · theme.shape',
      value: `${radius.md}px`,
      sample: <span style={{ display: 'inline-flex', alignItems: 'flex-end', width: 120, height: 48, padding: 8, borderRadius: radius.md, background: '#c0392b', color: '#fff', fontSize: 10, fontWeight: 700 }}>GOLF BALLS</span>,
      tablet: `The default (theme.shape.borderRadius = ${t.shape.borderRadius}px): inputs, Paper, toggle groups, category and product tiles, wells`,
      handheld: 'Cards on a list, grouped panels',
    },
    {
      token: 'radius.lg',
      value: `${radius.lg}px`,
      sample: <span style={{ display: 'inline-block', width: 120, height: 48, borderRadius: radius.lg, border: outline, background: '#fff' }} />,
      tablet: 'Cards (MuiCard), dialogs (MuiDialog), menus (MuiMenu)',
      handheld: 'The FAB: MD3 FABs are rounded squares (MuiFab in mobile-theme.ts)',
    },
    {
      token: 'radius.xl',
      value: `${radius.xl}px`,
      sample: <span style={{ display: 'inline-flex', alignItems: 'center', height: 34, padding: '0 16px', borderRadius: radius.xl, background: md3.onSurface, color: '#fff', fontSize: 13, fontWeight: 600 }}>Check in & pay</span>,
      tablet: 'Every pill: buttons (MuiButton), chips (MuiChip), toolbar and host buttons, search fields',
      handheld: 'Buttons are 999 (a full pill, the same shape); search bars and bottom-sheet tops are 24–28dp, typed as literals',
    },
    {
      token: '50%',
      value: 'circle',
      sample: (
        <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
          <span style={{ width: 28, height: 28, borderRadius: '50%', background: md3.primary, color: '#fff', fontSize: 11, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>FA</span>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#7c3aed' }} />
          <span style={{ width: 34, height: 34, borderRadius: '50%', border: outline }} />
        </span>
      ),
      tablet: 'Avatars, membership dots, icon buttons, the add-player buttons on the grid',
      handheld: 'Avatars, dots, icon buttons',
    },
  ];
  return (
    <Sheet>
      <Group title="The corners" intro="Four tokens and the circle. The bigger the thing, the softer its corner, and anything you press with a label on it is a full pill.">
        <Table
          head={['Token', 'Value', 'Sample', 'Tablet', 'Handheld']}
          widths={[150, 70, 170, 'auto', 'auto']}
          rows={steps.map((s) => [
            <span key="t" style={{ fontFamily: mono, fontSize: 12 }}>{s.token}</span>,
            <span key="v" style={{ fontFamily: mono, fontSize: 12 }}>{s.value}</span>,
            <span key="s">{s.sample}</span>,
            <span key="tb" style={{ fontSize: 12.5 }}>{s.tablet}</span>,
            <span key="hh" style={{ fontSize: 12.5 }}>{s.handheld}</span>,
          ])}
        />
      </Group>
      <Group title="Where the handheld differs" intro="mobile-theme.ts follows MD3's shapes where they differ from the counter's.">
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <Card style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8, width: 220 }}>
            <span style={{ fontSize: 12, color: md3.onSurfaceVariant }}>Chip · tablet pill, handheld 8dp</span>
            <span style={{ display: 'flex', gap: 8 }}>
              <span style={{ height: 28, padding: '0 10px', display: 'inline-flex', alignItems: 'center', borderRadius: radius.xl, border: outline, fontSize: 12, fontWeight: 700 }}>Front 9</span>
              <span style={{ height: 32, padding: '0 12px', display: 'inline-flex', alignItems: 'center', borderRadius: radius.sm, border: `1px solid ${md3.outline}`, fontSize: 14, fontWeight: 500 }}>Front 9</span>
            </span>
          </Card>
          <Card style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8, width: 220 }}>
            <span style={{ fontSize: 12, color: md3.onSurfaceVariant }}>Text field · tablet 12px, handheld 4dp</span>
            <span style={{ display: 'flex', gap: 8 }}>
              <span style={{ width: 90, height: 34, borderRadius: radius.md, border: outline }} />
              <span style={{ width: 90, height: 48, borderRadius: 4, border: outline }} />
            </span>
          </Card>
        </div>
      </Group>
    </Sheet>
  );
}

const meta = {
  title: 'Design System/Styles/Radius',
  id: 'foundations-radius',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Radius_: Story = {
  name: 'Radius',
  render: () => <RadiusSheet />,
  parameters: { docs: { description: { story: 'Each corner token on the component that uses it, per surface.' } } },
};
