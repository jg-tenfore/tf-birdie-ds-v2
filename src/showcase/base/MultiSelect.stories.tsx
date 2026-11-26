import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Box, Chip, FormControl, InputLabel, MenuItem, OutlinedInput, Select } from '@mui/material';
import { ModalSection, PillGroup } from '../../pos/modals/ModalFrame';

const OPTIONS = ['Grill', 'Fry', 'Cold', 'Beverage', 'Packaging', 'Expo'];

function MultiSelectDemo() {
  const [value, setValue] = useState<string[]>(['Grill', 'Expo']);
  return (
    <FormControl sx={{ width: 320 }}>
      <InputLabel id="stations-label">Stations</InputLabel>
      <Select
        labelId="stations-label"
        multiple
        value={value}
        onChange={(e) => setValue(e.target.value as string[])}
        input={<OutlinedInput label="Stations" />}
        renderValue={(selected) => (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {selected.map((v) => (
              <Chip key={v} label={v} size="small" />
            ))}
          </Box>
        )}
      >
        {OPTIONS.map((o) => (
          <MenuItem key={o} value={o}>
            {o}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

const meta = {
  title: 'Design System/Components/Forms/Multi-Select',
  id: 'components-forms-multi-select',
  component: MultiSelectDemo,
  parameters: { layout: 'centered' },
} satisfies Meta<typeof MultiSelectDemo>;
export default meta;
type Story = StoryObj<typeof meta>;

/** A booking's tags (`BookingNotes` in `src/pos/components/BookingTabs.tsx`). */
const ALL_TAGS = ['VIP', 'Rain check', 'Accessibility', 'Birthday', 'Corporate'];

function BirdieTags() {
  const [tags, setTags] = useState<string[]>(['VIP']);
  return (
    <Box sx={{ width: 440, p: 2.5, bgcolor: '#fff', borderRadius: 2 }}>
      <ModalSection title="Tags" sx={{ mb: 0 }}>
        <PillGroup
          multi
          value={tags}
          options={ALL_TAGS.map((t) => ({ label: t, value: t }))}
          onChange={(t) => setTags(tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t])}
        />
      </ModalSection>
    </Box>
  );
}

/**
 * **In Birdie:** several-of as visible chips — `PillGroup` with `multi`
 * (`src/pos/modals/ModalFrame.tsx`), as a booking's Tags use it. A check marks each chosen pill.
 * This is what Birdie does instead of the dropdown below.
 */
export const InBirdie: Story = {
  name: 'In Birdie',
  render: () => <BirdieTags />,
};

/** MUI's multiple `Select`. Documented to avoid: no Birdie screen uses it. */
export const MultiSelect: Story = {};
