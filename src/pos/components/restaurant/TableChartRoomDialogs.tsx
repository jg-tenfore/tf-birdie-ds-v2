import { useState } from 'react';
import { Box, InputBase, Typography } from '@mui/material';
import { md3, radius } from '../../../theme/tokens';
import type { Room } from '../../data/floor';
import { validateRoomName } from '../../logic/floor-editor';
import { Callout, FilledButton, ModalFrame, OutlineButton } from '../../modals/ModalFrame';

/**
 * Table Chart's two room dialogs: naming a room, and removing one (V1 → V2, Wave 2).
 *
 * v1 had neither. Its rooms were a fixed list the device shipped with — eleven of them, eight
 * empty — and the editor could only lay out the ones that existed. A room is now something the
 * operator adds, names and removes, like everything else on the floor.
 *
 * These are the only dialogs the editor opens. Everything else is inline and undoable; removing a
 * room is too, until Save, but it takes every table in the room with it, so it is said out loud
 * first. Local to the editor rather than routed through the store's `Modal`: the working copy
 * lives in the editor, so the dialogs that change it do too.
 */

export function RoomNameDialog({
  title,
  confirmLabel,
  initial,
  roomId,
  rooms,
  onConfirm,
  onClose,
}: {
  title: string;
  confirmLabel: string;
  initial: string;
  /** The room being renamed, so its own name is not a clash. */
  roomId: string;
  rooms: Room[];
  onConfirm: (name: string) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(initial);
  const check = validateRoomName(value, roomId, rooms);
  const submit = () => check.ok && onConfirm(check.name);

  return (
    <ModalFrame
      title={title}
      icon="layers"
      width={420}
      onClose={onClose}
      actions={
        <>
          <OutlineButton onClick={onClose}>Cancel</OutlineButton>
          <FilledButton onClick={submit} disabled={!check.ok}>
            {confirmLabel}
          </FilledButton>
        </>
      }
    >
      <InputBase
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        onFocus={(e) => e.target.select()}
        inputProps={{ 'aria-label': 'Room name' }}
        sx={{
          width: '100%',
          minHeight: 48,
          px: 1.5,
          fontSize: 16,
          fontWeight: 600,
          border: `1.5px solid ${check.ok ? md3.outlineVariant : md3.error}`,
          borderRadius: `${radius.md}px`,
        }}
      />
      {!check.ok && (
        <Typography role="alert" sx={{ fontSize: 12, color: md3.error, mt: 0.75 }}>
          {check.error}
        </Typography>
      )}
    </ModalFrame>
  );
}

export function DeleteRoomDialog({
  room,
  refusal,
  bookedCount,
  onConfirm,
  onClose,
}: {
  room: Room;
  /** Why it cannot be removed; the dialog then only explains. */
  refusal: string | null;
  bookedCount: number;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const tables = room.elements.filter((e) => e.kind === 'table').length;
  const others = room.elements.length - tables;

  if (refusal) {
    return (
      <ModalFrame title={`${room.name} can’t be removed`} icon="block" iconColor={md3.error} width={440} onClose={onClose} actions={<FilledButton onClick={onClose}>OK</FilledButton>}>
        <Typography sx={{ fontSize: 13.5, lineHeight: 1.5 }}>{refusal}</Typography>
      </ModalFrame>
    );
  }

  return (
    <ModalFrame
      title={`Remove ${room.name}?`}
      icon="delete"
      iconColor={md3.error}
      width={440}
      onClose={onClose}
      actions={
        <>
          <OutlineButton onClick={onClose}>Keep it</OutlineButton>
          <FilledButton destructive onClick={onConfirm}>
            Remove room
          </FilledButton>
        </>
      }
    >
      <Typography sx={{ fontSize: 13.5, lineHeight: 1.5 }}>
        {tables || others
          ? `Its ${tables} ${tables === 1 ? 'table' : 'tables'}${others ? ` and ${others} other ${others === 1 ? 'item' : 'items'}` : ''} go with it.`
          : 'It is empty.'}{' '}
        You can undo this until you save.
      </Typography>
      {bookedCount > 0 && (
        <Box sx={{ mt: 1.5 }}>
          <Callout tone="warning">
            {bookedCount} booked {bookedCount === 1 ? 'reservation is' : 'reservations are'} assigned to its tables. Saving unassigns{' '}
            {bookedCount === 1 ? 'it' : 'them'} — the host picks a table when they arrive.
          </Callout>
        </Box>
      )}
    </ModalFrame>
  );
}
