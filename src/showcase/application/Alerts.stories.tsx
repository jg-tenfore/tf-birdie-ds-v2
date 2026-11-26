import type { Meta, StoryObj } from '@storybook/react-vite';
import { Alert, AlertTitle, Stack, ThemeProvider, Typography } from '@mui/material';
import WarningAmberRounded from '@mui/icons-material/WarningAmberRounded';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import CheckCircleOutline from '@mui/icons-material/CheckCircleOutlined';
import { expect, within } from 'storybook/test';
import { mobileTheme } from '../../theme/mobile-theme';
import { Callout } from '../../pos/modals/ModalFrame';
import { Callout as TeeCallout } from '../../pos/mobile/screens/tee/parts';
import { Callout as RegisterCallout } from '../../pos/mobile/screens/register/parts';

const meta = {
  title: 'Design System/Components/Feedback & Status/Alerts',
  id: 'components-feedback-status-alerts',
  component: Alert,
  tags: ['autodocs'],
} satisfies Meta<typeof Alert>;
export default meta;
type Story = StoryObj<typeof meta>;

/** MUI's Alert, for reference. Birdie doesn't use it; see the In Birdie stories for the Callout. */
export const Alerts: Story = {
  render: () => (
    <Stack spacing={2} sx={{ width: 420 }}>
      <Alert severity="success">Approved · card · 9:41 AM</Alert>
      <Alert severity="info">Table 10 already has a tab open: Farnsworth. A table carries one tab at a time.</Alert>
      <Alert severity="warning">Table 3 is held for Delgado, Ana (4) at 12:30 PM.</Alert>
      <Alert severity="error" variant="filled">
        <AlertTitle>Card expired</AlertTitle>
        This card has expired. Take a new card on the reader.
      </Alert>
    </Stack>
  ),
};

const Label = ({ children }: { children: string }) => (
  <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: '.05em', textTransform: 'uppercase', color: 'text.secondary', mt: 1 }}>
    {children}
  </Typography>
);

/**
 * **In Birdie · tablet.** The `Callout` from `ModalFrame.tsx`, in its four tones, with copy from the
 * product. It sits inline, next to what it is about, and is never dismissible.
 */
export const InBirdie: Story = {
  name: 'In Birdie · tablet',
  render: () => (
    <Stack spacing={1.25} sx={{ width: 440 }}>
      <Callout tone="info">
        Table 10 already has a tab open: <b>Farnsworth</b>. A table carries one tab at a time.
      </Callout>
      <Callout tone="warning" icon="point_of_sale">
        Another order is on the register. Finish or clear it there before paying this tab.
      </Callout>
      <Callout tone="danger" icon="block">
        Table 4 is out of service. Put it back in service on the floor first.
      </Callout>
      <Callout tone="success">Approved · card · 9:41 AM</Callout>
    </Stack>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText(/Another order is on the register/)).toBeTruthy();
  },
};

/**
 * **In Birdie · handheld.** The phone has two Callouts today: the Tee Sheet's (four tones, bordered,
 * from `noteColors`) and the Register's (three tones, no border, an icon node). The page's
 * Decisions say to merge them.
 */
export const InBirdieHandheld: Story = {
  name: 'In Birdie · handheld',
  render: () => (
    <ThemeProvider theme={mobileTheme}>
      <Stack spacing={1.25} sx={{ width: 360, p: 2, bgcolor: 'background.default' }}>
        <Label>Tee Sheet screens · tee/parts.tsx</Label>
        <TeeCallout tone="info" icon="info">
          Nothing movable at 9:12 AM. Blocks and leagues are edited from their own dialogs.
        </TeeCallout>
        <TeeCallout tone="warning" icon="warning">
          No time has room for every party on its own course. Untick a party, or pick one course.
        </TeeCallout>
        <TeeCallout tone="danger" icon="block">
          Nothing is open at this time any more. Close this and pick another slot.
        </TeeCallout>
        <TeeCallout tone="success" icon="paid">
          Weekday Non Resident · 2 players × $54.00 = <b>$108.00</b> · paid now
        </TeeCallout>
        <Label>Register and restaurant · register/parts.tsx</Label>
        <RegisterCallout tone="warning" icon={<WarningAmberRounded fontSize="small" />}>
          The register has another order on it. Pay or clear that order first, then pay this tab.
        </RegisterCallout>
        <RegisterCallout tone="info" icon={<InfoOutlined fontSize="small" />}>
          Next: take payment. The reservation is written as paid once the payment is approved.
        </RegisterCallout>
        <RegisterCallout tone="success" icon={<CheckCircleOutline fontSize="small" />}>
          Paid $154.98 by card at 9:41 AM.
        </RegisterCallout>
      </Stack>
    </ThemeProvider>
  ),
};
