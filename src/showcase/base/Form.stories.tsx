import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  MenuItem,
  Stack as MuiStack,
  TextField,
  Typography,
} from '@mui/material';
import { md3, radius } from '../../theme/tokens';
import { Icon } from '../../pos/components/primitives';
import { Stack } from '../../pos/components/Stack';
import { customerDraftProblem, customerDraftStatus } from '../../pos/logic/customer-search';
import { Field, FilledButton, OutlineButton } from '../../pos/modals/ModalFrame';

const meta = {
  title: 'Design System/Components/Forms/Form',
  id: 'components-forms-form',
  parameters: { layout: 'centered' },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

/** One half of the rule, ticking off as it is met. Redrawn here: the customer form's own `Rule` isn't exported. */
function Rule({ met, children }: { met: boolean; children: string }) {
  return (
    <Stack direction="row" alignItems="center" gap={0.5}>
      <Icon name={met ? 'check_circle' : 'info'} size={15} color={met ? md3.primary : md3.outline} />
      <Typography sx={{ fontSize: 12.5, color: met ? md3.onSurface : md3.onSurfaceVariant, fontWeight: met ? 700 : 500 }}>
        {children}
      </Typography>
    </Stack>
  );
}

/** The customer form's body and footer, built from the product's own parts and rules. */
function BirdieForm() {
  const [firstName, setFirstName] = useState('Sam');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const draft = { firstName, lastName, email, phone };
  const status = customerDraftStatus(draft);
  const problem = customerDraftProblem(draft);
  return (
    <Box sx={{ width: 560, bgcolor: '#fff', borderRadius: `${radius.lg}px`, border: `1px solid ${md3.outlineVariant}` }}>
      <Box sx={{ p: '16px 20px 14px', borderBottom: `1px solid ${md3.outlineVariant}` }}>
        <Typography sx={{ fontSize: 17, fontWeight: 800 }}>New customer</Typography>
        <Typography sx={{ fontSize: 12, color: md3.onSurfaceVariant }}>Added to the roster when you save</Typography>
      </Box>
      <Box sx={{ p: '16px 20px' }}>
        <Stack direction="row" alignItems="center" gap={2} sx={{ p: '10px 12px', mb: 2, borderRadius: `${radius.md}px`, bgcolor: md3.surfaceContainer, flexWrap: 'wrap' }}>
          <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>To save, a customer needs</Typography>
          <Rule met={status.hasLastName}>a last name</Rule>
          <Rule met={status.hasContact}>a phone number or an email — either will do</Rule>
        </Stack>
        <Stack gap={1.5}>
          <Stack direction="row" gap={1.25}>
            <Field label="First name" value={firstName} onChange={setFirstName} />
            <Field label="Last name" value={lastName} onChange={setLastName} />
          </Stack>
          <Stack direction="row" gap={1.25}>
            <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="name@example.com" hint={status.emailInvalid ? 'That is missing part of the address.' : undefined} />
            <Field label="Phone" type="tel" value={phone} onChange={setPhone} placeholder="(555) 234-1234" hint={status.phoneInvalid ? 'A phone number is ten digits.' : undefined} />
          </Stack>
        </Stack>
      </Box>
      <Stack direction="row" alignItems="center" justifyContent="flex-end" gap={1} sx={{ p: '12px 20px', borderTop: `1px solid ${md3.outlineVariant}` }}>
        {problem && <Typography sx={{ fontSize: 12, color: md3.onSurfaceVariant, fontWeight: 600, mr: 'auto' }}>{problem}</Typography>}
        <OutlineButton>Cancel</OutlineButton>
        <FilledButton disabled={Boolean(problem)}>Add customer</FilledButton>
      </Stack>
    </Box>
  );
}

/**
 * **In Birdie:** a tablet form as the customer form draws it (`src/pos/modals/CustomerFormDialog.tsx`)
 * — the rule stated first and ticking off, `Field`s from `ModalFrame.tsx`, and **Add customer**
 * disabled with the reason beside it, from the same `customerDraftStatus` / `customerDraftProblem`
 * the product uses. Type a last name and a phone to watch it clear.
 */
export const InBirdie: Story = {
  name: 'In Birdie',
  render: () => <BirdieForm />,
};

/** MUI's own form parts, themed. Birdie composes its forms from `ModalFrame`'s parts instead. */
export const Form: Story = {
  render: () => (
    <Box component="form" sx={{ width: 360, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="h6">Register setup</Typography>
      <TextField label="Register name" defaultValue="Register 1" />
      <TextField label="Printer" select defaultValue="pro-shop">
        {[
          ['pro-shop', 'Pro Shop Printer'],
          ['service', 'Service Printer'],
        ].map(([v, l]) => (
          <MenuItem key={v} value={v}>
            {l}
          </MenuItem>
        ))}
      </TextField>
      <TextField label="Location" placeholder="Pro shop counter" />
      <FormControlLabel control={<Checkbox defaultChecked />} label="Print a receipt after a sale" />
      <MuiStack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
        <Button variant="text">Cancel</Button>
        <Button variant="contained">Save</Button>
      </MuiStack>
    </Box>
  ),
};
