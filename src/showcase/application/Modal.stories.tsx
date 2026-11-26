import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';
import { md3 } from '../../theme/tokens';
import { PosProvider } from '../../pos/state/PosProvider';
import { FilledButton, ModalFrame, OutlineButton } from '../../pos/modals/ModalFrame';

const meta = {
  title: 'Design System/Components/Feedback & Status/Dialog',
  id: 'components-feedback-status-dialog',
  component: Dialog,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'MUI `Dialog` — a modal overlay that interrupts the work to confirm an action or collect a short input. ' +
          'In Birdie every tablet dialog is `ModalFrame` (see **In Birdie**), which wraps this; the handheld has no centred dialogs. ' +
          'The plain MUI compositions below are for reference.',
      },
    },
  },
  args: { open: false },
} satisfies Meta<typeof Dialog>;
export default meta;
type Story = StoryObj<typeof meta>;

/** A button that opens a basic Dialog with a title, body, and action buttons. */
function PlaygroundDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="contained" onClick={() => setOpen(true)}>
        Check in party
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Check in all 3 players?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Checking in doesn&apos;t take payment. To settle a balance, use Check in &amp; pay on the booking.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => setOpen(false)}>
            Check in
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export const Playground: Story = {
  render: () => <PlaygroundDemo />,
};

/** A destructive confirmation with a warning body and an emphasized error action. */
function AlertDialogDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outlined" color="error" onClick={() => setOpen(true)}>
        Clear order
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} aria-labelledby="clear-title">
        <DialogTitle id="clear-title">Clear this order?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Removes 3 lines and the customer. The booking stays on the tee sheet. This can&apos;t be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Keep order</Button>
          <Button variant="contained" color="error" onClick={() => setOpen(false)}>
            Clear order
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export const AlertDialog: Story = {
  render: () => <AlertDialogDemo />,
  parameters: {
    docs: { description: { story: 'A confirm/alert dialog for a destructive action.' } },
  },
};

/** A Dialog that collects input via a TextField before confirming. */
function FormDialogDemo() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  return (
    <>
      <Button variant="contained" onClick={() => setOpen(true)}>
        Rename register
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Rename register</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            The name prints on receipts and shows in Orders &amp; Tips.
          </DialogContentText>
          <Stack spacing={2}>
            <TextField
              autoFocus
              fullWidth
              label="Register name"
              placeholder="Pro Shop 1"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => setOpen(false)}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export const FormDialog: Story = {
  render: () => <FormDialogDemo />,
  parameters: {
    docs: { description: { story: 'A Dialog containing a form field for quick edits.' } },
  },
};

/** Birdie's destructive confirm, built as `ConfirmDialog` builds it: ModalFrame, 440px, red icon. */
function BirdieConfirmDemo() {
  const [open, setOpen] = useState(false);
  return (
    <PosProvider>
      <OutlineButton destructive onClick={() => setOpen(true)}>
        Clear 9:12 AM
      </OutlineButton>
      {open && (
        <ModalFrame
          width={440}
          title="Clear 9:12 AM?"
          icon="warning"
          iconColor={md3.error}
          onClose={() => setOpen(false)}
          actions={
            <>
              <OutlineButton onClick={() => setOpen(false)}>Cancel</OutlineButton>
              <FilledButton destructive onClick={() => setOpen(false)}>
                Clear time
              </FilledButton>
            </>
          }
        >
          <Typography sx={{ fontSize: 13, lineHeight: 1.55, color: md3.onSurfaceVariant }}>
            6 tee times across all courses will be removed and the slots released.
          </Typography>
        </ModalFrame>
      )}
    </PosProvider>
  );
}

/**
 * **In Birdie · tablet.** `ModalFrame` as the confirm uses it: icon tile, the question as the title,
 * the consequence with a count, Cancel and a red button that repeats the verb. Open it, then Cancel.
 */
export const InBirdie: Story = {
  name: 'In Birdie · tablet confirm',
  render: () => <BirdieConfirmDemo />,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Clear 9:12 AM' }));
    const dialog = within(await screen.findByRole('dialog'));
    await expect(dialog.getByText('Clear 9:12 AM?')).toBeTruthy();
    await userEvent.click(dialog.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  },
};
