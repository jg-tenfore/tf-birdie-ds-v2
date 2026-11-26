import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Box, FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import { Stack } from '../../pos/components/Stack';
import { SelectField } from '../../pos/modals/ModalFrame';
import { TIMES } from '../../pos/data/courses';

function SelectDemo() {
  const [value, setValue] = useState('grill');
  return (
    <FormControl sx={{ minWidth: 220 }}>
      <InputLabel id="station-label">Station</InputLabel>
      <Select
        labelId="station-label"
        label="Station"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      >
        <MenuItem value="grill">Grill</MenuItem>
        <MenuItem value="fry">Fry</MenuItem>
        <MenuItem value="cold">Cold</MenuItem>
        <MenuItem value="beverage">Beverage</MenuItem>
        <MenuItem value="expo">Expo</MenuItem>
      </Select>
    </FormControl>
  );
}

const meta = {
  title: 'Design System/Components/Forms/Select',
  id: 'components-forms-select',
  component: SelectDemo,
  parameters: { layout: 'centered' },
} satisfies Meta<typeof SelectDemo>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Move players' destination, as the tablet draws it. */
function BirdieSelectFields() {
  const [course, setCourse] = useState('front');
  const [timeMin, setTimeMin] = useState(TIMES[0]?.totalMin ?? 360);
  return (
    <Box sx={{ width: 420, p: 2.5, bgcolor: '#fff', borderRadius: 2 }}>
      <Stack direction="row" gap={1.5}>
        <SelectField
          label="Course"
          value={course}
          options={[
            { label: 'Championship · Front 9', value: 'front' },
            { label: 'Championship · Back 9', value: 'back' },
          ]}
          onChange={setCourse}
        />
        <SelectField
          label="Time"
          value={timeMin}
          options={TIMES.slice(0, 40).map((t) => ({ label: t.label, value: t.totalMin }))}
          onChange={setTimeMin}
        />
      </Stack>
    </Box>
  );
}

/**
 * **In Birdie:** the tablet's `SelectField` (`src/pos/modals/ModalFrame.tsx`) — the browser's own
 * select with a bound label, as Move players uses it for the destination course and time. This is
 * what product screens use; MUI's `Select` below is themed but unused.
 */
export const InBirdie: Story = {
  name: 'In Birdie',
  render: () => <BirdieSelectFields />,
};

/** MUI's `Select`, themed by `src/theme/theme.ts`. No Birdie screen imports it. */
export const Select_: Story = { name: 'Select' };
