import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Alert, Box, Button, IconButton, Snackbar } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

/**
 * Native MUI `Snackbar` — a brief, non-blocking message that appears at the
 * edge of the screen and auto-dismisses. Birdie's toast is one of these, owned
 * by the store: "{name} · marked paid", "Payment approved · $154.98".
 */
function SnackbarDemo() {
  const [open, setOpen] = useState(false);
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
      <Button variant="contained" onClick={() => setOpen(true)}>
        Mark paid
      </Button>
      <Snackbar
        open={open}
        autoHideDuration={4000}
        onClose={() => setOpen(false)}
        message="Garcia, L. · marked paid"
        action={
          <IconButton size="small" color="inherit" onClick={() => setOpen(false)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        }
      />
    </Box>
  );
}

/**
 * Snackbar with an **Undo** action. MUI supports it; Birdie's toast does not
 * (it is text only, and Undo lives in the screen's toolbar instead).
 */
function SnackbarUndoDemo() {
  const [open, setOpen] = useState(false);
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
      <Button variant="contained" onClick={() => setOpen(true)}>
        Move booking
      </Button>
      <Snackbar
        open={open}
        autoHideDuration={5000}
        onClose={() => setOpen(false)}
        message="Bay 1 · moved to 11:00 AM"
        action={
          <>
            <Button color="secondary" size="small" onClick={() => setOpen(false)}>
              Undo
            </Button>
            <IconButton size="small" color="inherit" onClick={() => setOpen(false)}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </>
        }
      />
    </Box>
  );
}

/**
 * Severity variants — a styled `Alert` inside the `Snackbar`. Not used in
 * Birdie: errors are said in place, with a Callout.
 */
function SnackbarSeverityDemo() {
  const [severity, setSeverity] = useState<'success' | 'error' | 'warning' | 'info' | null>(null);
  const messages = {
    success: 'Payment approved · $154.98',
    error: 'Card declined',
    warning: 'Table 10 has asked for its check',
    info: 'Receipt printed',
  } as const;
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
        <Button color="success" variant="outlined" onClick={() => setSeverity('success')}>
          Success
        </Button>
        <Button color="error" variant="outlined" onClick={() => setSeverity('error')}>
          Error
        </Button>
        <Button color="warning" variant="outlined" onClick={() => setSeverity('warning')}>
          Warning
        </Button>
        <Button color="info" variant="outlined" onClick={() => setSeverity('info')}>
          Info
        </Button>
      </Box>
      <Snackbar open={severity !== null} autoHideDuration={4000} onClose={() => setSeverity(null)}>
        {severity ? (
          <Alert severity={severity} variant="filled" onClose={() => setSeverity(null)} sx={{ width: '100%' }}>
            {messages[severity]}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
}

/**
 * Anchored to the top-centre. Birdie keeps its toast at the bottom centre, inside
 * the device frame; shown for reference.
 */
function SnackbarAnchorDemo() {
  const [open, setOpen] = useState(false);
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
      <Button variant="contained" onClick={() => setOpen(true)}>
        Show at the top
      </Button>
      <Snackbar
        open={open}
        autoHideDuration={4000}
        onClose={() => setOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="info" variant="filled" onClose={() => setOpen(false)} sx={{ width: '100%' }}>
          Note saved
        </Alert>
      </Snackbar>
    </Box>
  );
}

const meta = {
  title: 'Design System/Components/Feedback & Status/Snackbar',
  id: 'components-feedback-status-snackbar',
  component: SnackbarDemo,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Native MUI `Snackbar` — a brief, non-blocking message shown at the edge of the screen that auto-dismisses. ' +
          'Birdie renders exactly one per surface (PosApp, MobileApp), fed by `toast()` from the store: text only, bottom centre, 2.2 seconds. ' +
          'The Undo, severity and anchor stories show what MUI can do and Birdie chooses not to.',
      },
    },
  },
} satisfies Meta<typeof SnackbarDemo>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Interactive — press **Mark paid** to show a toast that auto-hides after 4 seconds. */
export const Playground: Story = {
  render: () => <SnackbarDemo />,
};

/** A confirmation with an **Undo** action. Not a Birdie pattern; see the page. */
export const WithUndoAction: Story = {
  parameters: {
    docs: { description: { story: 'Snackbar with an Undo action button and a close icon.' } },
  },
  render: () => <SnackbarUndoDemo />,
};

/** Colour-coded feedback using an `Alert` inside the `Snackbar`. */
export const SeverityVariants: Story = {
  parameters: {
    docs: { description: { story: 'Success, error, warning, and info severities via a filled Alert.' } },
  },
  render: () => <SnackbarSeverityDemo />,
};

/** Positioned at the top-centre. Not a Birdie pattern. */
export const AnchorOrigin: Story = {
  parameters: {
    docs: { description: { story: 'A custom anchorOrigin (top-centre). Birdie keeps toasts bottom centre.' } },
  },
  render: () => <SnackbarAnchorDemo />,
};
