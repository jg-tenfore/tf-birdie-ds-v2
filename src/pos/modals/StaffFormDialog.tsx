import { useState } from 'react';
import { Box } from '@mui/material';
import type { StaffRole } from '../data/staff';
import { usePos } from '../state/PosProvider';
import { ROLE_NAMES, STAFF_ROLES, canManageStaff, staffProblem, type SettingsModal } from '../state/settings';
import { Callout, Field, FilledButton, ModalFrame, ModalSection, OutlineButton, PillGroup } from './ModalFrame';

/**
 * Add someone to the staff list, or change their name, role or PIN (V1 → V2, Settings). Managers
 * only — the Staff section shows no way here to anyone else, and the reducer refuses them anyway.
 * A PIN is four digits and no two people who can sign in share one; the dialog says which rule a
 * draft breaks before Save, rather than after.
 */
export function StaffFormDialog({ m }: { m: SettingsModal }) {
  const { state, dispatch, toast } = usePos();
  const existing = m.id ? state.staffRoster.find((x) => x.id === m.id) : undefined;
  const [name, setName] = useState(existing?.name ?? '');
  const [role, setRole] = useState<StaffRole>(existing?.role ?? 'server');
  const [pin, setPin] = useState(existing?.pin ?? '');
  const close = () => dispatch({ type: 'closeModal' });
  if (!canManageStaff(state)) return null;

  const draft = { id: existing?.id, name, pin, role };
  const problem = staffProblem(state.staffRoster, draft);
  const touched = name !== (existing?.name ?? '') || pin !== (existing?.pin ?? '') || role !== (existing?.role ?? 'server');

  const save = () => {
    if (problem) return;
    dispatch({ type: 'saveStaff', member: draft });
    close();
    toast(existing ? `${name.trim()} updated` : `${name.trim()} added · PIN ${pin}`);
  };

  return (
    <ModalFrame
      width={480}
      title={existing ? `Edit ${existing.name}` : 'Add staff'}
      icon="badge"
      actions={
        <>
          <OutlineButton onClick={close}>Cancel</OutlineButton>
          <FilledButton disabled={Boolean(problem)} onClick={save}>
            {existing ? 'Save' : 'Add'}
          </FilledButton>
        </>
      }
    >
      <ModalSection title="Name">
        <Field value={name} onChange={setName} placeholder="First and last name" autoFocus />
      </ModalSection>
      <ModalSection title="Role">
        <PillGroup value={role} options={STAFF_ROLES.map((r) => ({ label: ROLE_NAMES[r], value: r }))} onChange={setRole} />
      </ModalSection>
      <ModalSection title="PIN" hint="Four digits, their own">
        <Field value={pin} onChange={(v) => setPin(v.replace(/\D/g, '').slice(0, 4))} placeholder="0000" />
      </ModalSection>
      {problem && touched && (
        <Box data-staff-problem>
          <Callout tone="warning">{problem}</Callout>
        </Box>
      )}
    </ModalFrame>
  );
}
