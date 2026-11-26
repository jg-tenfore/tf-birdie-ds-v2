import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box, Fab } from '@mui/material';
import Add from '@mui/icons-material/Add';
import Edit from '@mui/icons-material/Edit';
import Navigation from '@mui/icons-material/Navigation';

const meta = {
  title: 'Design System/Components/Actions/Floating Action Button',
  id: 'components-actions-floating-action-button',
  component: Fab,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'MUI `Fab`: a floating, elevated button for the one action a screen exists to start. In Birdie it is handheld only and ' +
          'always `extended` (icon + label): **New customer** on People, **New tab** and **Add items** in the restaurant, passed ' +
          'through `MobileScreen`’s `fab` slot. These stories render in the tablet theme, so they are circles; the handheld theme ' +
          'makes them 16px rounded squares. Set the props in the **Controls** panel to preview each combination.',
      },
    },
  },
  argTypes: {
    color: {
      control: 'inline-radio',
      options: ['default', 'primary', 'secondary', 'success', 'error', 'info', 'warning'],
      description: 'Theme color.',
      table: { defaultValue: { summary: 'default' } },
    },
    size: {
      control: 'inline-radio',
      options: ['small', 'medium', 'large'],
      description: 'Button size.',
      table: { defaultValue: { summary: 'large' } },
    },
    variant: {
      control: 'inline-radio',
      options: ['circular', 'extended'],
      description: 'Icon-only (circular) or icon + label (extended).',
      table: { defaultValue: { summary: 'circular' } },
    },
    disabled: { control: 'boolean', description: 'Disables the button.' },
  },
  args: {
    color: 'primary',
    size: 'large',
    variant: 'circular',
    disabled: false,
    'aria-label': 'add',
    children: <Add />,
  },
} satisfies Meta<typeof Fab>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Fully interactive — change color, size, or variant in the **Controls** panel. */
export const Playground: Story = {};

/** The theme color options. */
export const Colors: Story = {
  parameters: { docs: { description: { story: 'Fab in each semantic theme color.' } } },
  render: (args) => (
    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
      <Fab {...args} color="default" aria-label="add">
        <Add />
      </Fab>
      <Fab {...args} color="primary" aria-label="add">
        <Add />
      </Fab>
      <Fab {...args} color="secondary" aria-label="edit">
        <Edit />
      </Fab>
      <Fab {...args} color="success" aria-label="add">
        <Add />
      </Fab>
      <Fab {...args} color="error" aria-label="add">
        <Add />
      </Fab>
    </Box>
  ),
};

/** Small, medium, and large sizes. */
export const Sizes: Story = {
  parameters: { docs: { description: { story: 'The three Fab sizes side by side.' } } },
  render: (args) => (
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      <Fab {...args} size="small" aria-label="add">
        <Add />
      </Fab>
      <Fab {...args} size="medium" aria-label="add">
        <Add />
      </Fab>
      <Fab {...args} size="large" aria-label="add">
        <Add />
      </Fab>
    </Box>
  ),
};

/** Extended Fabs pair an icon with a text label. */
export const Extended: Story = {
  parameters: { docs: { description: { story: 'The `extended` variant shows a label. It is the only variant Birdie uses: every FAB says what it creates.' } } },
  render: (args) => (
    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
      <Fab {...args} variant="extended" color="primary">
        <Add sx={{ mr: 1 }} />
        New tab
      </Fab>
      <Fab {...args} variant="extended" color="secondary">
        <Edit sx={{ mr: 1 }} />
        Add items
      </Fab>
    </Box>
  ),
};

/** Different icons for different actions. */
export const IconOptions: Story = {
  parameters: { docs: { description: { story: 'Any icon can sit inside a Fab — Add, Edit, or Navigation shown here.' } } },
  render: (args) => (
    <Box sx={{ display: 'flex', gap: 2 }}>
      <Fab {...args} aria-label="add">
        <Add />
      </Fab>
      <Fab {...args} aria-label="edit">
        <Edit />
      </Fab>
      <Fab {...args} aria-label="navigate">
        <Navigation />
      </Fab>
    </Box>
  ),
};
