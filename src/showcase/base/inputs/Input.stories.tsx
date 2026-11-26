import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Box, TextField, Typography } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { Field } from '../../../pos/modals/ModalFrame';
import { mobileTheme } from '../../../theme/mobile-theme';

const meta = {
  title: 'Design System/Components/Forms/Text Field',
  id: 'components-forms-text-field',
  component: TextField,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Single-line text field, built on MUI `TextField`. Use it for names, emails, ticket labels, and search — for multi-line notes use **Textarea**, and for on/off settings use **Switch**. ' +
          'It supports a label, placeholder, helper text, validation (`error`), sizing, and three visual `variant`s. ' +
          'Edit the props in the **Controls** panel below to preview every combination live, then **Show code** to copy the result.',
      },
    },
  },
  argTypes: {
    label: { control: 'text', description: 'Field label.' },
    placeholder: { control: 'text', description: 'Ghost text shown while empty.' },
    helperText: { control: 'text', description: 'Assistive text shown beneath the field.' },
    variant: {
      control: 'inline-radio',
      options: ['outlined', 'filled', 'standard'],
      description: 'Visual style.',
      table: { defaultValue: { summary: 'outlined' } },
    },
    size: {
      control: 'inline-radio',
      options: ['small', 'medium'],
      description: 'Control density.',
      table: { defaultValue: { summary: 'medium' } },
    },
    error: { control: 'boolean', description: 'Invalid / error state.' },
    required: { control: 'boolean', description: 'Marks the field as required.' },
    disabled: { control: 'boolean', description: 'Disables interaction.' },
    fullWidth: { control: 'boolean', description: 'Expand to the container width.' },
  },
  args: {
    label: 'Label',
    placeholder: 'Placeholder',
    helperText: '',
    variant: 'outlined',
    size: 'medium',
    error: false,
    required: false,
    disabled: false,
    fullWidth: false,
  },
} satisfies Meta<typeof TextField>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Fully interactive — change any prop in the **Controls** panel. */
export const Playground: Story = {};

/** The three MUI variants side by side. */
export const Variants: Story = {
  parameters: { docs: { description: { story: 'Outlined (default), filled, and standard styles.' } } },
  render: (args) => (
    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
      <TextField {...args} variant="outlined" label="Outlined" />
      <TextField {...args} variant="filled" label="Filled" />
      <TextField {...args} variant="standard" label="Standard" />
    </Box>
  ),
};

/** Helper text, error, disabled, and required states. */
export const States: Story = {
  parameters: { docs: { description: { story: 'Common field states: helper text, error, disabled, and required.' } } },
  render: (args) => (
    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
      <TextField {...args} label="With helper" helperText="Helper text" />
      <TextField {...args} label="Error" error helperText="Something's wrong" />
      <TextField {...args} label="Disabled" disabled />
      <TextField {...args} label="Required" required />
    </Box>
  ),
};

/**
 * The text fields the product really uses. The tablet's is Birdie's own `Field`
 * (`src/pos/modals/ModalFrame.tsx`): a small bold label above, a 1.5px outline, an optional `$`
 * prefix and a hint. No tablet screen uses MUI's `TextField`. The handheld's is the MUI
 * `TextField` under `mobileTheme`: outlined, 16px text, a floating label, 56dp tall.
 */
function InBirdieFields() {
  const [name, setName] = useState('');
  const [fee, setFee] = useState('54.00');
  const [mobileName, setMobileName] = useState('');
  return (
    <Box sx={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'flex-start' }}>
      <Box sx={{ width: 320, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Typography variant="overline">Tablet · Field</Typography>
        <Field label="Last name" value={name} onChange={setName} placeholder="Last, First" />
        <Field label="Green fee" prefix="$" value={fee} onChange={setFee} hint="Leave blank to keep the published rate" />
        <Field label="Register name" value="Register 1" onChange={() => {}} disabled />
      </Box>
      <ThemeProvider theme={mobileTheme}>
        <Box sx={{ width: 328, display: 'flex', flexDirection: 'column', gap: 2, p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
          <Typography variant="overline">Handheld · TextField</Typography>
          <TextField label="Last name" value={mobileName} onChange={(e) => setMobileName(e.target.value)} placeholder="Last, First" />
          <TextField label="Or enter a name" placeholder="Last, First" helperText="Books a walk-up with no customer record" />
        </Box>
      </ThemeProvider>
    </Box>
  );
}

/** Birdie's own fields, side by side: the tablet's `Field` and the handheld's themed `TextField`. */
export const InBirdie: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'What the product renders. Left: the tablet `Field` from `src/pos/modals/ModalFrame.tsx`, at the counter\'s density. Right: the handheld `TextField` under `mobileTheme`, at touch size.',
      },
    },
  },
  render: () => <InBirdieFields />,
};
