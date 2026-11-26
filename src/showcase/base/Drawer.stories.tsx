import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import {
  Box,
  Button,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Toolbar,
  Typography,
} from '@mui/material';
import Menu from '@mui/icons-material/Menu';
import Tag from '@mui/icons-material/Tag';
import Inventory2 from '@mui/icons-material/Inventory2';
import Settings from '@mui/icons-material/Settings';
import ReceiptLong from '@mui/icons-material/ReceiptLong';

const meta = {
  title: 'Design System/Components/Navigation/Drawer',
  id: 'components-navigation-drawer',
  component: Drawer,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'MUI `Drawer`, shown for reference. Birdie builds its side panels (the reservation slide-over, the day summary, the ' +
          'main navigation sheet, the order rail) as siblings inside the terminal frame instead, because a `Drawer` portals to ' +
          'the page and positions itself against the browser window. Set `anchor` to place it on either edge.',
      },
    },
  },
  argTypes: {
    anchor: {
      control: 'inline-radio',
      options: ['left', 'right'],
      description: 'Edge the drawer slides in from.',
      table: { defaultValue: { summary: 'left' } },
    },
  },
  args: {
    anchor: 'left',
  },
} satisfies Meta<typeof Drawer>;
export default meta;
type Story = StoryObj<typeof meta>;

const navItems = [
  { label: 'Order Lookup', icon: <ReceiptLong /> },
  { label: 'Time Clock', icon: <Tag /> },
  { label: 'Inventory', icon: <Inventory2 /> },
  { label: 'Settings', icon: <Settings /> },
];

function DrawerContent() {
  return (
    <Box sx={{ width: 260 }} role="presentation">
      <List
        subheader={<ListSubheader disableSticky>Operations</ListSubheader>}
      >
        {navItems.map((item) => (
          <ListItemButton key={item.label}>
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );
}

type DrawerAnchor = 'left' | 'right' | 'top' | 'bottom';

function TemporaryDrawerDemo({ anchor }: { anchor?: DrawerAnchor }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outlined" startIcon={<Menu />} onClick={() => setOpen(true)}>
        Open the drawer
      </Button>
      <Drawer anchor={anchor} open={open} onClose={() => setOpen(false)}>
        <Box onClick={() => setOpen(false)}>
          <DrawerContent />
        </Box>
      </Drawer>
    </>
  );
}

/** Fully interactive — open the temporary drawer and switch its `anchor` in the **Controls** panel. */
export const Playground: Story = {
  render: (args) => <TemporaryDrawerDemo anchor={args.anchor} />,
};

/** Temporary drawers from either edge. Birdie's right-hand panels (the reservation, the day summary) are built in the frame instead. */
export const AnchorLeftAndRight: Story = {
  parameters: {
    docs: { description: { story: 'The same drawer anchored left and right. Temporary drawers overlay the page and dismiss on backdrop click.' } },
  },
  render: () => (
    <Box sx={{ display: 'flex', gap: 2 }}>
      <TemporaryDrawerDemo anchor="left" />
      <TemporaryDrawerDemo anchor="right" />
    </Box>
  ),
};

/** A `permanent` drawer pinned as a fixed rail — the shape of Birdie's order rail, which is built without MUI. */
export const Permanent: Story = {
  parameters: {
    docs: { description: { story: 'A permanent-variant drawer rendered inline as a fixed rail beside the content.' } },
  },
  render: () => (
    <Box sx={{ display: 'flex', height: 340, border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
      <Drawer
        variant="permanent"
        sx={{
          width: 260,
          flexShrink: 0,
          '& .MuiDrawer-paper': { width: 260, position: 'relative' },
        }}
      >
        <Toolbar sx={{ px: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            The Dunes of Delgado
          </Typography>
        </Toolbar>
        <Divider />
        <DrawerContent />
      </Drawer>
      <Box sx={{ flex: 1, p: 3 }}>
        <Typography variant="body2" color="text.secondary">
          Screen content
        </Typography>
      </Box>
    </Box>
  ),
};
