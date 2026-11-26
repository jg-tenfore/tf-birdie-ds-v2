import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Box, FormControlLabel, FormGroup, Switch as MuiSwitch, Typography } from '@mui/material';

/**
 * Native MUI Switch — for a binary on/off setting that applies at once, such as the tee sheet's
 * "Compact rows" (Settings › Tee sheet on the tablet, Tee sheet & courses on the handheld).
 */
function SwitchDemo() {
  const [compact, setCompact] = useState(true);
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-start' }}>
      <FormControlLabel
        control={<MuiSwitch checked={compact} onChange={(e) => setCompact(e.target.checked)} />}
        label="Compact rows"
      />

      <FormGroup>
        <FormControlLabel control={<MuiSwitch defaultChecked />} label="On" />
        <FormControlLabel control={<MuiSwitch />} label="Off" />
        <FormControlLabel control={<MuiSwitch defaultChecked disabled />} label="Disabled (on)" />
        <FormControlLabel control={<MuiSwitch disabled />} label="Disabled (off)" />
      </FormGroup>

      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Small
        </Typography>
        <MuiSwitch size="small" defaultChecked />
        <Typography variant="body2" color="text.secondary">
          Medium
        </Typography>
        <MuiSwitch defaultChecked />
      </Box>
    </Box>
  );
}

const meta = {
  title: 'Design System/Components/Forms/Switch',
  id: 'components-forms-switch',
  component: SwitchDemo,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Native MUI `Switch` for a binary on/off setting that applies at once — for example the tee sheet\'s **Compact rows** (Settings › Tee sheet). ' +
          'Toggle the first switch to see it work; the rest show the on / off, disabled, and small / medium variants. For a segmented multi-option choice use **Toggle** instead.',
      },
    },
  },
} satisfies Meta<typeof SwitchDemo>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Switch: Story = {};
