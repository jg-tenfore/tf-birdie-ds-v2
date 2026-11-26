import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Box, FormControl, FormControlLabel, FormLabel, Radio, RadioGroup, Typography } from '@mui/material';
import { Seg } from '../../pos/components/Touch';
import { Stack } from '../../pos/components/Stack';
import { PillGroup } from '../../pos/modals/ModalFrame';

const meta = {
  title: 'Design System/Components/Forms/Radio Buttons',
  id: 'components-forms-radio-buttons',
  parameters: { layout: 'centered' },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

type Transport = 'walking' | 'cart' | 'push';

/** One player's holes and transport, and a dialog's "When", as the tablet draws them. */
function BirdieOneOf() {
  const [holes, setHoles] = useState<9 | 18>(18);
  const [transport, setTransport] = useState<Transport>('cart');
  const [mode, setMode] = useState<'single' | 'range'>('single');
  return (
    <Stack gap={2.5} sx={{ width: 460, p: 2.5, bgcolor: '#fff', borderRadius: 2 }}>
      <Box>
        <Typography variant="overline" component="div" sx={{ mb: 1 }}>
          Player row · Seg
        </Typography>
        <Stack direction="row" gap={1}>
          <Seg
            label="Foster, A.: holes"
            value={holes}
            options={[
              { value: 9, label: '9' },
              { value: 18, label: '18' },
            ]}
            onChange={(h) => setHoles(h as 9 | 18)}
          />
          <Seg
            label="Foster, A.: transport"
            value={transport}
            options={[
              { value: 'walking' as Transport, label: 'Walk', icon: 'directions_walk' },
              { value: 'cart' as Transport, label: 'Ride', icon: 'directions_car' },
              { value: 'push' as Transport, label: 'Push', icon: 'shopping_cart' },
            ]}
            onChange={setTransport}
          />
        </Stack>
      </Box>
      <Box>
        <Typography variant="overline" component="div" sx={{ mb: 1 }}>
          Block time · PillGroup
        </Typography>
        <PillGroup
          value={mode}
          options={[
            { label: 'This time only', value: 'single' as const },
            { label: 'A range of times', value: 'range' as const },
          ]}
          onChange={setMode}
        />
      </Box>
    </Stack>
  );
}

/**
 * **In Birdie:** the tablet's one-of controls, imported from the product — `Seg`
 * (`src/pos/components/Touch.tsx`) for 9 | 18 and Walk · Ride · Push in a player row, and
 * `PillGroup` (`src/pos/modals/ModalFrame.tsx`) for a choice at the top of a dialog section. The
 * dish dialog's "Choose one" groups are the third; see the Design System page.
 */
export const InBirdie: Story = {
  name: 'In Birdie',
  render: () => <BirdieOneOf />,
};

/** MUI's `RadioGroup`, themed. The handheld uses `Radio` at the end of list rows. */
export const RadioButtons: Story = {
  render: () => (
    <FormControl>
      <FormLabel>Dining option</FormLabel>
      <RadioGroup defaultValue="dine-in">
        <FormControlLabel value="dine-in" control={<Radio />} label="Dine in" />
        <FormControlLabel value="pickup" control={<Radio />} label="Pickup" />
        <FormControlLabel value="delivery" control={<Radio />} label="Delivery" />
        <FormControlLabel value="cart" control={<Radio disabled />} label="Beverage cart (disabled)" />
      </RadioGroup>
    </FormControl>
  ),
};
