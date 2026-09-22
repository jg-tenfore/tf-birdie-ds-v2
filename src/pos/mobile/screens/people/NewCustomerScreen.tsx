import { useState } from 'react';
import { Box, TextField } from '@mui/material';
import { memberTypes } from '../../../../theme/tokens';
import type { MemberTypeKey } from '../../../../theme/tokens';
import { usePos } from '../../../state/PosProvider';
import { buildCustomer, nextCustomerId } from '../../../logic/customers';
import { useGolferRoster } from '../../../state/PosProvider';
import { Stack } from '../../../components/Stack';
import { DialogTopBar, MobileScreen } from '../../chrome';
import { useMobileNav } from '../../navigation';
import type { ScreenProps } from '../types';
import { FieldRow, FormSection, PickerField, SegmentedButton } from './parts';
import { displayName, tierShort } from './people-utils';
import { attachGolfer } from './pick-golfer';

/**
 * Create a customer record.
 *
 * A full-screen dialog (✕ + Save): it's a form that can be abandoned, and MD3 replaces
 * centred dialogs with this on phones. It opens from two places and closes back to each:
 *
 *  - People's FAB → Save creates the record and swaps this dialog for their detail page,
 *    so back lands on the list with them already in it.
 *  - The golfer picker's "Add new customer" row → Save also attaches the new person to
 *    the picker's target and closes the picker too, landing back on the order.
 *
 * Either way the record goes into `addedGolfers`, the session roster every People list,
 * search and lookup reads, on the phone and at the counter.
 */
export function NewCustomerScreen(_: ScreenProps<'newCustomer'>) {
  const nav = useMobileNav();
  const { state, dispatch, toast } = usePos();
  const roster = useGolferRoster();
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [kind, setKind] = useState<'Guest' | 'Member'>('Guest');
  const [tier, setTier] = useState<MemberTypeKey>('annual');
  const [hcp, setHcp] = useState('');
  const [notes, setNotes] = useState('');

  // The screen under this one decides where Save lands.
  const below = nav.stack[nav.stack.length - 2];
  const fromPicker = below?.name === 'golferPicker' ? below : null;

  const save = () => {
    const golfer = buildCustomer(nextCustomerId(state.addedGolfers, roster), {
      first,
      last,
      phone,
      email,
      memberType: kind === 'Member' ? tier : null,
      hcp,
      notes,
    });
    dispatch({ type: 'addGolfer', golfer });
    const name = displayName(golfer.name);
    if (fromPicker) {
      attachGolfer(dispatch, fromPicker.target, golfer, state.bookings);
      nav.pop(2);
      toast(`${name} created and added`);
    } else if (below?.name === 'people') {
      nav.replace({ name: 'golferDetail', golferId: golfer.id });
      toast(`${name} created`);
    } else {
      nav.pop();
      toast(`${name} created`);
    }
  };

  return (
    <MobileScreen
      topBar={
        <DialogTopBar
          title="New customer"
          confirmLabel={fromPicker ? 'Save & add' : 'Save'}
          onConfirm={save}
          confirmDisabled={!first.trim() && !last.trim()}
        />
      }
    >
      <FormSection title="Name">
        <FieldRow>
          <TextField label="First name" value={first} onChange={(e) => setFirst(e.target.value)} autoFocus />
          <TextField label="Last name" value={last} onChange={(e) => setLast(e.target.value)} />
        </FieldRow>
      </FormSection>

      <FormSection title="Contact">
        <Stack gap={2}>
          <TextField
            label="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(555) 000-0000"
            slotProps={{ htmlInput: { inputMode: 'tel' } }}
          />
          <TextField
            label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@email.com"
            slotProps={{ htmlInput: { inputMode: 'email' } }}
          />
        </Stack>
      </FormSection>

      <FormSection title="Customer type">
        <Stack gap={2}>
          <SegmentedButton
            ariaLabel="Customer type"
            value={kind}
            onChange={setKind}
            options={[
              { label: 'Guest', value: 'Guest' },
              { label: 'Member', value: 'Member' },
            ]}
          />
          {kind === 'Member' && (
            <PickerField
              label="Membership tier"
              value={tier}
              onChange={setTier}
              options={(Object.keys(memberTypes) as MemberTypeKey[]).map((k) => ({
                label: memberTypes[k].label,
                value: k,
                supporting: tierShort(k) === 'Senior' ? '65 and over' : tierShort(k) === 'Student' ? 'Under 25' : undefined,
              }))}
            />
          )}
          <TextField
            label="Handicap"
            value={hcp}
            onChange={(e) => setHcp(e.target.value.replace(/[^\d.]/g, ''))}
            slotProps={{ htmlInput: { inputMode: 'decimal' } }}
            sx={{ maxWidth: 160 }}
          />
        </Stack>
      </FormSection>

      <FormSection title="Notes">
        <TextField
          multiline
          sx={{ '& .MuiOutlinedInput-root': { p: 0 } }}
          minRows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Preferences, accessibility needs…"
          slotProps={{ htmlInput: { 'aria-label': 'Notes' } }}
        />
      </FormSection>
      <Box sx={{ height: 32 }} />
    </MobileScreen>
  );
}
