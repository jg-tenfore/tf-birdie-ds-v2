import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, ButtonGroup, Stack } from '@mui/material';

const meta = {
  title: 'Design System/Components/Actions/Button Group',
  id: 'components-actions-button-group',
  component: ButtonGroup,
  tags: ['autodocs'],
} satisfies Meta<typeof ButtonGroup>;
export default meta;
type Story = StoryObj<typeof meta>;

export const ButtonGroup_: Story = {
  name: 'Button Group',
  render: () => (
    <Stack spacing={2}>
      <ButtonGroup variant="contained">
        <Button>Print</Button>
        <Button>Email</Button>
        <Button>Void</Button>
      </ButtonGroup>
      <ButtonGroup variant="outlined">
        <Button>Move</Button>
        <Button>Delete</Button>
        <Button>Close</Button>
      </ButtonGroup>
    </Stack>
  ),
};
