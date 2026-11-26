import type { Meta, StoryObj } from '@storybook/react-vite';
import { Checkbox, FormControlLabel, FormGroup } from '@mui/material';

const meta = {
  title: 'Design System/Components/Forms/Checkbox',
  id: 'components-forms-checkbox',
  component: Checkbox,
  tags: ['autodocs'],
} satisfies Meta<typeof Checkbox>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { args: { defaultChecked: true } };

export const States: Story = {
  render: () => (
    <FormGroup>
      <FormControlLabel control={<Checkbox defaultChecked />} label="Checked" />
      <FormControlLabel control={<Checkbox />} label="Unchecked" />
      <FormControlLabel control={<Checkbox indeterminate />} label="Indeterminate" />
      <FormControlLabel control={<Checkbox disabled />} label="Disabled" />
    </FormGroup>
  ),
};
