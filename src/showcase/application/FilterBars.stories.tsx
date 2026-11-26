import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Box,
  Chip,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  TextField,
} from '@mui/material';
import Search from '@mui/icons-material/Search';

const meta = {
  title: 'Design System/Components/Navigation/Filter Bars',
  id: 'components-navigation-filter-bars',
  parameters: { layout: 'centered' },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const FilterBars: Story = {
  render: () => (
    <Paper variant="outlined" sx={{ p: 2, width: 560 }}>
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap' }} useFlexGap>
        <TextField
          size="small"
          placeholder="Search name, confirmation, or phone"
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
        <TextField size="small" select label="Course" defaultValue="all" sx={{ minWidth: 140 }}>
          {['all', 'Front 9', 'Back 9'].map((s) => (
            <MenuItem key={s} value={s}>
              {s}
            </MenuItem>
          ))}
        </TextField>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip label="Unpaid" onDelete={() => {}} size="small" />
          <Chip label="Has a note" onDelete={() => {}} size="small" />
        </Box>
      </Stack>
    </Paper>
  ),
};
