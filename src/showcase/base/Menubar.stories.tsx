import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { AppBar, Box, Button, Divider, Menu, MenuItem, Toolbar } from '@mui/material';

/**
 * MUI (`@mui/material` v9) does not ship a native `Menubar` component, so this composes one
 * from an `AppBar`/`Toolbar` of trigger `Button`s, each opening a `Menu` of `MenuItem`s —
 * the desktop-app menubar pattern (File / Edit / View / Help). Birdie avoids it; see the page.
 */
const meta = {
  title: 'Design System/Components/Navigation/Menubar',
  id: 'components-navigation-menubar',
  component: AppBar,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A desktop menubar composed from MUI primitives — MUI does not export a native `Menubar`. Each title opens a `Menu` ' +
          'of commands. Birdie avoids it: a screen’s commands are on the screen, in a toolbar of pills, and the rare ones sit in a ' +
          '⋮ menu beside what they act on. Shown here so the pattern is recognisable.',
      },
    },
  },
} satisfies Meta<typeof AppBar>;
export default meta;
type Story = StoryObj<typeof meta>;

type MenuKey = 'board' | 'tickets' | 'counts' | 'settings';
// Keys kept as they were; the titles are what a menubar on the tee sheet would hold.

const menus: Record<MenuKey, { label: string; items: string[] }> = {
  board: { label: 'View', items: ['Calendar', 'List', 'Compact rows'] },
  tickets: { label: 'Booking', items: ['Check in', 'Move players', 'Delete booking'] },
  counts: { label: 'Day', items: ['Today', 'Day summary', 'Go to date…'] },
  settings: { label: 'Settings', items: ['Tee sheet', 'Printers', 'Card reader'] },
};

function MenubarDemo() {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [openMenu, setOpenMenu] = useState<MenuKey | null>(null);

  const handleOpen = (key: MenuKey) => (e: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(e.currentTarget);
    setOpenMenu(key);
  };
  const handleClose = () => {
    setAnchorEl(null);
    setOpenMenu(null);
  };

  return (
    <Box sx={{ width: 520 }}>
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar variant="dense" sx={{ gap: 0.5 }}>
          {(Object.keys(menus) as MenuKey[]).map((key) => (
            <Button
              key={key}
              color="inherit"
              size="small"
              onClick={handleOpen(key)}
              sx={{ textTransform: 'none' }}
            >
              {menus[key].label}
            </Button>
          ))}
        </Toolbar>
      </AppBar>

      {(Object.keys(menus) as MenuKey[]).map((key) => (
        <Menu
          key={key}
          anchorEl={anchorEl}
          open={openMenu === key}
          onClose={handleClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        >
          {menus[key].items.map((item, i) =>
            item === 'Delete booking' ? (
              <Box key={item}>
                <Divider />
                <MenuItem onClick={handleClose} sx={{ color: 'error.main' }}>
                  {item}
                </MenuItem>
              </Box>
            ) : (
              <MenuItem key={item + i} onClick={handleClose}>
                {item}
              </MenuItem>
            ),
          )}
        </Menu>
      ))}
    </Box>
  );
}

/** Fully interactive — click each top-level menu to open its command list. */
export const Playground: Story = {
  render: () => <MenubarDemo />,
};

/** The menubar above a screen. Compare the tee sheet's toolbar, where every command is visible without opening anything. */
export const InContext: Story = {
  parameters: {
    docs: { description: { story: 'The composed menubar pinned above a screen’s content: commands are invisible until a title is opened.' } },
  },
  render: () => (
    <Box sx={{ width: 520, border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
      <MenubarDemo />
      <Box sx={{ p: 4, color: 'text.secondary' }}>Screen content</Box>
    </Box>
  ),
};
