import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Box, TextField, Typography } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { Field } from '../../pos/modals/ModalFrame';
import { mobileTheme } from '../../theme/mobile-theme';

const meta = {
  title: 'Design System/Components/Forms/Textarea',
  id: 'components-forms-textarea',
  component: TextField,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Multi-line text field — a MUI `TextField` with `multiline` enabled. Use it for free-form notes such as order/kitchen notes or a manager memo. ' +
          '`minRows` sets the starting height and it grows with content up to `maxRows`. ' +
          'Edit the props in the **Controls** panel to preview it live.',
      },
    },
  },
  argTypes: {
    label: { control: 'text', description: 'Field label.' },
    placeholder: { control: 'text', description: 'Ghost text shown while empty.' },
    helperText: { control: 'text', description: 'Assistive text shown beneath the field.' },
    minRows: { control: { type: 'number', min: 1, max: 12 }, description: 'Starting number of visible rows.' },
    maxRows: { control: { type: 'number', min: 1, max: 20 }, description: 'Max rows before it scrolls.' },
    variant: { control: 'inline-radio', options: ['outlined', 'filled', 'standard'], description: 'Visual style.' },
    error: { control: 'boolean', description: 'Invalid / error state.' },
    disabled: { control: 'boolean', description: 'Disables interaction.' },
  },
  args: {
    label: 'Notes',
    placeholder: 'Order notes…',
    helperText: '',
    multiline: true,
    minRows: 3,
    maxRows: 8,
    variant: 'outlined',
    error: false,
    disabled: false,
  },
} satisfies Meta<typeof TextField>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Fully interactive — change any prop in the **Controls** panel. */
export const Textarea: Story = { render: (args) => <TextField {...args} sx={{ width: 360 }} /> };

/**
 * Notes as the product writes them. Tablet: `Field multiline` (`src/pos/modals/ModalFrame.tsx`),
 * three rows to start, growing with the text. Handheld: `TextField multiline` under `mobileTheme`,
 * with the root's padding cleared — the theme already pads the textarea 16px, and without the
 * `sx` the note sits inside two paddings.
 */
function InBirdieNotes() {
  const [note, setNote] = useState('');
  const [kitchen, setKitchen] = useState('');
  return (
    <Box sx={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'flex-start' }}>
      <Box sx={{ width: 360, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Typography variant="overline">Tablet · Field multiline</Typography>
        <Field value={note} onChange={setNote} placeholder="Lightning hold — resume when cleared" multiline />
        <Field label="Note for the kitchen" value={kitchen} onChange={setKitchen} placeholder="Gluten-free bread, sauce on the side…" multiline />
      </Box>
      <ThemeProvider theme={mobileTheme}>
        <Box sx={{ width: 328, display: 'flex', flexDirection: 'column', gap: 2, p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
          <Typography variant="overline">Handheld · TextField multiline</Typography>
          <TextField
            multiline
            minRows={3}
            placeholder="Lightning hold — resume when cleared"
            sx={{ '& .MuiOutlinedInput-root': { p: 0 } }}
            slotProps={{ htmlInput: { 'aria-label': 'Note' } }}
          />
        </Box>
      </ThemeProvider>
    </Box>
  );
}

/** Birdie's notes: the tablet's `Field multiline` and the handheld's `TextField multiline`. */
export const InBirdie: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "What the product renders: the tablet's time note and kitchen note (`Field multiline`), and the handheld's note field (`TextField multiline`, root padding cleared).",
      },
    },
  },
  render: () => <InBirdieNotes />,
};
