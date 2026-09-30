import { useState } from 'react';
import { Box, ButtonBase, Typography } from '@mui/material';
import { md3, radius } from '../../theme/tokens';
import { CUSTOMER_TYPES, EMAIL_DOMAINS, normalizePhone } from '../data/customers';
import { liveCustomer } from '../data/roster';
import { customerDraftProblem, customerDraftStatus, plainName, withEmailDomain } from '../logic/customer-search';
import type { OperationsModal } from '../state/operations';
import { usePos } from '../state/PosProvider';
import { Icon } from '../components/primitives';
import { Stack } from '../components/Stack';
import { Field, FilledButton, ModalFrame, ModalSection, OutlineButton } from './ModalFrame';

/**
 * New customer, or edit one's details (V1 → V2, Wave 3).
 *
 * ## What v1 did
 *
 * `tf-birdie-ds-v1/app/src/screens/new-customer.tsx`: six filled fields, six one-tap email domains,
 * and all eighteen customer types as a four-column grid of checkboxes.
 *
 * ## What was wrong with it
 *
 * - **The rule was a secret.** A last name is required, and so is a phone number *or* an email. The
 *   device said so only after Save, by badging three fields and floating one tooltip that explained
 *   two of them.
 * - **The domain chips appended.** Tapping @GMAIL.COM after `sam@yahoo.com` made
 *   `sam@yahoo.com@gmail.com`.
 * - **The type was baked into the name** once saved ("Sam Quill - Senior").
 *
 * ## What this does
 *
 * - **The rule is the first thing on the form**, and each half ticks off as it is met. Save says
 *   what is still missing instead of being a button that fails.
 * - **Domain chips replace** the domain (`withEmailDomain`).
 * - **Types are chips**, the common few shown and the rest behind "All types"; the saved name is
 *   only the name.
 *
 * With an `id` it edits that customer's contact details and types, through `patchCustomer`, as the
 * customer record's Save does.
 */
export function CustomerFormDialog({ m }: { m: Extract<OperationsModal, { kind: 'customerForm' }> }) {
  const { state, dispatch, toast } = usePos();
  const existing = m.id ? liveCustomer(m.id, state.customerEdits) : null;
  const [firstName, setFirstName] = useState(existing?.firstName ?? '');
  const [lastName, setLastName] = useState(existing?.lastName ?? '');
  const [email, setEmail] = useState(existing?.email ?? '');
  const [phone, setPhone] = useState(existing?.phone ?? '');
  const [birthday, setBirthday] = useState(existing?.birthday ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [types, setTypes] = useState<string[]>(existing?.customerTypes ?? []);
  const [allTypes, setAllTypes] = useState(false);

  const draft = { firstName, lastName, email, phone };
  const status = customerDraftStatus(draft);
  const problem = customerDraftProblem(draft);

  const toggleType = (t: string) => setTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  // The common few first; the rest are there, one tap away, not a wall of eighteen checkboxes.
  const shownTypes = allTypes ? CUSTOMER_TYPES : CUSTOMER_TYPES.filter((t, i) => i < 6 || types.includes(t));

  const save = () => {
    if (problem) return;
    const input = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim() || undefined,
      phone: normalizePhone(phone) || undefined,
      birthday: birthday.trim() || undefined,
      notes: notes.trim() || undefined,
      types,
    };
    if (existing) {
      const renamed = input.firstName !== existing.firstName || input.lastName !== existing.lastName;
      const { types: _types, ...fields } = input;
      void _types;
      dispatch({
        type: 'patchCustomer',
        customerId: existing.id,
        patch: {
          ...fields,
          email: fields.email ?? '',
          customerTypes: types,
          // A renamed record takes the plain name; an untouched one keeps what the other editions print.
          ...(renamed && { displayName: `${input.firstName} ${input.lastName}`.trim() }),
        },
      });
      toast(`${input.firstName} ${input.lastName} saved`.trim());
    } else {
      // `createCustomer` opens the new record on Customer Search, so it is there when the dialog closes.
      dispatch({ type: 'createCustomer', input });
      toast(`Added ${`${input.firstName} ${input.lastName}`.trim()}`);
    }
    dispatch({ type: 'closeModal' });
  };

  return (
    <ModalFrame
      width={640}
      title={existing ? `Edit ${plainName(existing)}` : 'New customer'}
      subtitle={existing ? `Customer ID ${existing.id}` : 'Added to the roster when you save'}
      icon={existing ? 'edit' : 'person_add'}
      actions={
        <>
          {problem && (
            <Typography data-customer-form-problem sx={{ fontSize: 12, color: md3.onSurfaceVariant, fontWeight: 600, mr: 'auto' }}>
              {problem}
            </Typography>
          )}
          <OutlineButton onClick={() => dispatch({ type: 'closeModal' })}>Cancel</OutlineButton>
          <FilledButton disabled={Boolean(problem)} onClick={save}>
            {existing ? 'Save' : 'Add customer'}
          </FilledButton>
        </>
      }
    >
      {/* The rule, before the fields — v1 made you fail Save to learn it. */}
      <Stack
        data-contact-rule
        direction="row"
        alignItems="center"
        gap={2}
        sx={{ p: '10px 12px', mb: 2, borderRadius: `${radius.md}px`, bgcolor: md3.surfaceContainer, flexWrap: 'wrap' }}
      >
        <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>To save, a customer needs</Typography>
        <Rule met={status.hasLastName} data-rule="last-name">
          a last name
        </Rule>
        <Rule met={status.hasContact} data-rule="contact">
          a phone number or an email — either will do
        </Rule>
      </Stack>

      <Stack gap={1.5}>
        <Stack direction="row" gap={1.25}>
          <Field autoFocus label="First name" value={firstName} onChange={setFirstName} />
          <Field label="Last name" value={lastName} onChange={setLastName} />
        </Stack>
        <Box>
          <Field
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="name@example.com"
            hint={status.emailInvalid ? 'That is missing part of the address.' : undefined}
          />
          {/* One tap puts the domain on — replacing whatever domain was typed, never adding a second. */}
          <Stack direction="row" gap={0.75} sx={{ mt: 0.75, flexWrap: 'wrap' }}>
            {EMAIL_DOMAINS.map((d) => (
              <ButtonBase
                key={d}
                data-email-domain={d}
                onClick={() => setEmail(withEmailDomain(email, d))}
                sx={{
                  height: 36,
                  px: 1.25,
                  borderRadius: `${radius.xl}px`,
                  border: `1.5px solid ${md3.outlineVariant}`,
                  fontSize: 12,
                  fontWeight: 600,
                  color: md3.onSurfaceVariant,
                  '&:hover': { bgcolor: md3.surfaceContainer },
                }}
              >
                {d}
              </ButtonBase>
            ))}
          </Stack>
        </Box>
        <Stack direction="row" gap={1.25}>
          <Field
            label="Phone"
            type="tel"
            value={phone}
            onChange={setPhone}
            placeholder="(555) 234-1234"
            hint={status.phoneInvalid ? 'A phone number is ten digits.' : undefined}
          />
          <Field label="Birthday" value={birthday} onChange={setBirthday} placeholder="MM/DD/YYYY" hint="Optional" />
        </Stack>
        <Field label="Notes" value={notes} onChange={setNotes} placeholder="Optional — anything the counter should know" multiline />
      </Stack>

      <ModalSection title="Customer types" hint={types.length ? `${types.length} chosen` : 'Optional'} sx={{ mt: 2, mb: 0 }}>
        <Stack direction="row" gap={0.75} sx={{ flexWrap: 'wrap' }}>
          {shownTypes.map((t) => {
            const on = types.includes(t);
            return (
              <ButtonBase
                key={t}
                data-customer-type={t}
                aria-pressed={on}
                onClick={() => toggleType(t)}
                sx={{
                  height: 36,
                  px: 1.25,
                  gap: 0.5,
                  borderRadius: `${radius.xl}px`,
                  border: `1.5px solid ${on ? md3.primary : md3.outlineVariant}`,
                  bgcolor: on ? md3.primaryContainer : '#fff',
                  color: on ? md3.onPrimaryContainer : md3.onSurfaceVariant,
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {on && <Icon name="check" size={13} />}
                {t}
              </ButtonBase>
            );
          })}
          <ButtonBase
            onClick={() => setAllTypes(!allTypes)}
            sx={{ height: 36, px: 1.25, borderRadius: `${radius.xl}px`, fontSize: 12, fontWeight: 700, color: md3.primary }}
          >
            {allTypes ? 'Fewer types' : `All types (${CUSTOMER_TYPES.length})`}
          </ButtonBase>
        </Stack>
      </ModalSection>
    </ModalFrame>
  );
}

function Rule({ met, children, ...rest }: { met: boolean; children: React.ReactNode } & Record<`data-${string}`, string>) {
  return (
    <Stack {...rest} data-met={met ? 'yes' : 'no'} direction="row" alignItems="center" gap={0.5}>
      <Icon name={met ? 'check_circle' : 'info'} size={15} color={met ? '#16a34a' : md3.outline} />
      <Typography sx={{ fontSize: 12.5, color: met ? '#166534' : md3.onSurfaceVariant, fontWeight: met ? 700 : 500 }}>{children}</Typography>
    </Stack>
  );
}
