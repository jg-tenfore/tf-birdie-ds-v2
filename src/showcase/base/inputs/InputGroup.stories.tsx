import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Box, InputAdornment, TextField, Typography } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { Field } from '../../../pos/modals/ModalFrame';
import { MoneyField, SearchBar } from '../../../pos/mobile/screens/people/parts';
import { mobileTheme } from '../../../theme/mobile-theme';
import Search from '@mui/icons-material/Search';
import AttachMoney from '@mui/icons-material/AttachMoney';

const meta = {
  title: 'Design System/Components/Forms/Input Group',
  id: 'components-forms-input-group',
  component: TextField,
  tags: ['autodocs'],
} satisfies Meta<typeof TextField>;
export default meta;
type Story = StoryObj<typeof meta>;

export const InputGroup: Story = {
  render: () => (
    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
      <TextField
        label="Search"
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" />
              </InputAdornment>
            ),
          },
        }}
      />
      <TextField
        label="Amount"
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <AttachMoney fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: <InputAdornment position="end">USD</InputAdornment>,
          },
        }}
      />
    </Box>
  ),
};

/**
 * Fields with something attached, as the product draws them. Tablet: `Field` with `prefix="$"`
 * (`src/pos/modals/ModalFrame.tsx`). Handheld: `MoneyField` (a `$` start adornment, decimal
 * keyboard) and `SearchBar` (the MD3 56dp search pill), both in `src/pos/mobile/screens/people/parts.tsx`.
 */
function InBirdieGroups() {
  const [fee, setFee] = useState('');
  const [walk, setWalk] = useState('');
  const [query, setQuery] = useState('');
  return (
    <Box sx={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'flex-start' }}>
      <Box sx={{ width: 320, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Typography variant="overline">Tablet · Field with a prefix</Typography>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Field label="Green fee" prefix="$" value={fee} onChange={setFee} />
          <Field label="Walking" prefix="$" value={walk} onChange={setWalk} />
        </Box>
      </Box>
      <ThemeProvider theme={mobileTheme}>
        <Box sx={{ width: 360, display: 'flex', flexDirection: 'column', gap: 2, py: 2, bgcolor: 'background.default', borderRadius: 2 }}>
          <Typography variant="overline" sx={{ px: 2 }}>Handheld · SearchBar and MoneyField</Typography>
          <SearchBar value={query} onChange={setQuery} placeholder="Search name or phone" />
          <Box sx={{ px: 2 }}>
            <MoneyField label="Green fee" value={fee} onChange={setFee} placeholder="Published" />
          </Box>
        </Box>
      </ThemeProvider>
    </Box>
  );
}

/** Birdie's grouped fields: the tablet's `$` prefix, the handheld's `MoneyField` and `SearchBar`. */
export const InBirdie: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "What the product renders: the tablet's `Field` with a `$` prefix (price override, events, tips), and the handheld's `SearchBar` and `MoneyField` (People, price override).",
      },
    },
  },
  render: () => <InBirdieGroups />,
};
