import type { ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box, Button, Stack, ThemeProvider, Typography } from '@mui/material';
import Inbox from '@mui/icons-material/Inbox';
import CreditCardOutlined from '@mui/icons-material/CreditCardOutlined';
import RestaurantMenuOutlined from '@mui/icons-material/RestaurantMenuOutlined';
import { expect, within } from 'storybook/test';
import { md3 } from '../../theme/tokens';
import { mobileTheme } from '../../theme/mobile-theme';
import { EmptyState as BirdieEmptyState } from '../../pos/components/primitives';
import { Empty } from '../../pos/mobile/screens/restaurant/parts';

const meta = {
  title: 'Design System/Components/Feedback & Status/Empty State',
  id: 'components-feedback-status-empty-state',
  parameters: { layout: 'centered' },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

/** The three-part empty state (title, next step, one action) that Birdie's fullest ones follow. */
export const EmptyState: Story = {
  render: () => (
    <Box sx={{ textAlign: 'center', maxWidth: 340, p: 4 }}>
      <Inbox sx={{ fontSize: 64, color: 'text.disabled' }} />
      <Typography variant="h6" sx={{ mt: 1 }}>
        No open tabs
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        Seat a table, or open a tab for the bar.
      </Typography>
      <Button variant="outlined" sx={{ mt: 2 }}>
        New bar tab
      </Button>
    </Box>
  ),
};

const Pane = ({ title, children }: { title: string; children: ReactNode }) => (
  <Stack spacing={0.75}>
    <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: '.05em', textTransform: 'uppercase', color: 'text.secondary' }}>
      {title}
    </Typography>
    <Box sx={{ width: 260, height: 170, bgcolor: '#fff', borderRadius: 3, boxShadow: `inset 0 0 0 1px ${md3.outlineVariant}` }}>{children}</Box>
  </Stack>
);

/**
 * **In Birdie · tablet.** The real `EmptyState` from `primitives.tsx` in its three jobs: nothing yet,
 * nothing matches, nothing selected. Icon over one 13px label, centred in its pane.
 */
export const InBirdie: Story = {
  name: 'In Birdie · tablet',
  render: () => (
    <Stack direction="row" spacing={2}>
      <Pane title="Nothing yet">
        <BirdieEmptyState icon="shopping_cart" label="No items added yet" />
      </Pane>
      <Pane title="Nothing matches">
        <BirdieEmptyState icon="search_off" label="No tee times match these filters" />
      </Pane>
      <Pane title="Nothing selected">
        <BirdieEmptyState icon="receipt_long" label="Pick an order to see what was in it" />
      </Pane>
    </Stack>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('No items added yet')).toBeTruthy();
  },
};

/**
 * **In Birdie · handheld.** The restaurant's `Empty`: a title, the next step, and room for an action.
 * The pattern the tablet's EmptyState should grow into.
 */
export const InBirdieHandheld: Story = {
  name: 'In Birdie · handheld',
  render: () => (
    <ThemeProvider theme={mobileTheme}>
      <Stack direction="row" spacing={2}>
        {[
          <Empty key="tabs" icon={<CreditCardOutlined sx={{ fontSize: 48 }} />} title="No open tabs" body="Seat a table, or open a tab for the bar." />,
          <Empty
            key="tab"
            icon={<RestaurantMenuOutlined sx={{ fontSize: 48 }} />}
            title="Nothing ordered yet"
            body="3 seats ready. Add items seat by seat, or as shared plates."
          />,
        ].map((e) => (
          <Box key={e.key} sx={{ width: 300, height: 320, bgcolor: md3.surface, borderRadius: 3, boxShadow: `inset 0 0 0 1px ${md3.outlineVariant}` }}>
            {e}
          </Box>
        ))}
      </Stack>
    </ThemeProvider>
  ),
};
