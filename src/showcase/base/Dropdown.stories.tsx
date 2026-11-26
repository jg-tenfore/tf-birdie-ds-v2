import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import {
  Box,
  Button,
  Divider,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
} from '@mui/material';
import KeyboardArrowDown from '@mui/icons-material/KeyboardArrowDown';
import ManageAccountsOutlined from '@mui/icons-material/ManageAccountsOutlined';
import ReceiptLongOutlined from '@mui/icons-material/ReceiptLongOutlined';
import PersonAddOutlined from '@mui/icons-material/PersonAddOutlined';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import Check from '@mui/icons-material/Check';
import { expect, userEvent, waitFor } from 'storybook/test';
import { MenuPopover } from '../../pos/components/TeeSheetGrid';

const meta = {
  title: 'Design System/Components/Navigation/Menu',
  id: 'components-navigation-menu',
  component: Menu,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'MUI `Menu` — a temporary surface of actions anchored to the element that opened it, built from `MenuItem`s. ' +
          'Birdie uses it for plain lists (the order rail’s settings cog, Change walk-in time, More menus). The tee sheet’s ' +
          'heavier menus, with a header and sections, are Birdie’s own: see **In Birdie: the course menu**.',
      },
    },
  },
  args: { open: false },
} satisfies Meta<typeof Menu>;
export default meta;
type Story = StoryObj<typeof meta>;

/** A button that opens a Menu of plain text actions anchored beneath it. */
function PlaygroundDemo() {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const close = () => setAnchor(null);
  return (
    <>
      <Button
        variant="outlined"
        endIcon={<KeyboardArrowDown />}
        onClick={(e) => setAnchor(e.currentTarget)}
      >
        Actions
      </Button>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={close}>
        <MenuItem onClick={close}>Load into register</MenuItem>
        <MenuItem onClick={close}>Booking details</MenuItem>
        <MenuItem onClick={close}>Move players</MenuItem>
        <MenuItem onClick={close}>Issue rain check</MenuItem>
      </Menu>
    </>
  );
}

export const Playground: Story = {
  render: () => <PlaygroundDemo />,
};

/** Menu items with leading icons, a Divider, and the destructive action last in red — the order’s ⋮ on the handheld. */
function WithIconsDemo() {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const close = () => setAnchor(null);
  return (
    <>
      <Button
        variant="outlined"
        endIcon={<KeyboardArrowDown />}
        onClick={(e) => setAnchor(e.currentTarget)}
      >
        Order options
      </Button>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={close}>
        <MenuItem onClick={close}>
          <ListItemIcon>
            <PersonAddOutlined fontSize="small" />
          </ListItemIcon>
          <ListItemText>Add player</ListItemText>
        </MenuItem>
        <MenuItem onClick={close}>
          <ListItemIcon>
            <ManageAccountsOutlined fontSize="small" />
          </ListItemIcon>
          <ListItemText>Change customer</ListItemText>
        </MenuItem>
        <MenuItem onClick={close}>
          <ListItemIcon>
            <ReceiptLongOutlined fontSize="small" />
          </ListItemIcon>
          <ListItemText>Tax exempt</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={close} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <DeleteOutlined fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Clear order</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}

export const WithIcons: Story = {
  render: () => <WithIconsDemo />,
  parameters: {
    docs: {
      description: {
        story:
          'Iconed rows via `ListItemIcon` / `ListItemText`, the destructive action last and red — the handheld order screen’s ⋮ menu. Clear order then asks to confirm in a bottom sheet.',
      },
    },
  },
};

/** The current choice checked and selected, and an unavailable one shown disabled — like Change walk-in time. */
function SelectionDemo() {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const [time, setTime] = useState('6:48 AM · Front 9');
  const close = () => setAnchor(null);
  const pick = (value: string) => {
    setTime(value);
    close();
  };
  const options = ['6:48 AM · Front 9', '7:04 AM · Back 9', '7:12 AM · Front 9'];
  return (
    <>
      <Button
        variant="outlined"
        endIcon={<KeyboardArrowDown />}
        onClick={(e) => setAnchor(e.currentTarget)}
      >
        Walk-in · {time}
      </Button>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={close}>
        {options.map((o) => (
          <MenuItem key={o} selected={time === o} onClick={() => pick(o)}>
            <ListItemText>{o}</ListItemText>
            <ListItemIcon sx={{ justifyContent: 'flex-end' }}>{time === o ? <Check fontSize="small" /> : null}</ListItemIcon>
          </MenuItem>
        ))}
        <Divider />
        <MenuItem disabled>
          <ListItemText>7:20 AM · Back 9 (course locked)</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}

export const SelectedAndDisabled: Story = {
  render: () => <SelectionDemo />,
  parameters: {
    docs: {
      description: {
        story:
          'The current choice is `selected` with a check; an unavailable one is `disabled` and says why. The tablet’s Change walk-in time menu works this way.',
      },
    },
  },
};

/**
 * **In Birdie: the course menu.** The tee sheet's per-course ⋮, rendered by Birdie's own `MenuPopover`
 * (`src/pos/components/TeeSheetGrid.tsx`), not MUI's Menu: labelled sections, two-line items that say what each does,
 * and the destructive item last in red. Click the ⋮ to open it. It hangs off its own button — it used to open at the
 * far right of the sheet header (Oct 1 proposal 12).
 */
export const InBirdieCourseMenu: Story = {
  name: 'In Birdie: the course menu',
  parameters: { layout: 'padded' },
  render: () => {
    const noop = () => {};
    return (
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, height: 520, pt: 1, pl: 26 }}>
        <Box sx={{ fontSize: 13, fontWeight: 700 }}>Championship · Front 9</Box>
        <MenuPopover
          icon="more_vert"
          items={[
            { section: 'Course' },
            { icon: 'lock', label: 'Lock course', sub: 'Prevent new bookings', run: noop },
            { icon: 'sticky_note_2', label: 'Add note', sub: 'No note set', run: noop },
            { icon: 'schedule', label: 'Time settings', sub: '8 min · 6:00 AM–7:00 PM', run: noop },
            { icon: 'sell', label: 'Tee time prices', sub: 'By time band & rate', run: noop },
            { section: 'View' },
            { icon: 'bar_chart', label: 'Course summary', sub: 'Stats & bookings panel', run: noop },
            { icon: 'fullscreen', label: 'Focus this course', sub: 'Hide other courses', run: noop },
            { section: 'Danger' },
            { icon: 'visibility_off', label: 'Hide course', sub: 'Remove from tee sheet', destructive: true, run: noop },
          ]}
        />
      </Box>
    );
  },
  play: async ({ canvasElement }) => {
    const trigger = canvasElement.querySelector<HTMLElement>('[data-menu-popover] button')!;
    await userEvent.click(trigger);
    await waitFor(() => expect(canvasElement.textContent).toContain('Lock course'));
    await expect(canvasElement.textContent).toContain('Hide course');
  },
};
