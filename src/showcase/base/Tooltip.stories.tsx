import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, IconButton, Stack, Tooltip } from '@mui/material';
import PersonOff from '@mui/icons-material/PersonOff';

const meta = {
  title: 'Design System/Components/Typography & Content/Tooltip',
  id: 'components-typography-content-tooltip',
  parameters: { layout: 'centered' },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Tooltip_: Story = {
  name: 'Tooltip',
  render: () => (
    <Stack direction="row" spacing={3} sx={{ alignItems: 'center' }}>
      <Tooltip title="Out with Garcia, L. · 6:00 AM" placement="top">
        <Button variant="outlined" sx={{ textDecoration: 'line-through' }}>
          14
        </Button>
      </Tooltip>
      <Tooltip title="Mark no-show">
        <IconButton>
          <PersonOff />
        </IconButton>
      </Tooltip>
    </Stack>
  ),
};
