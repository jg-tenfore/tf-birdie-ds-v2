import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Box, ButtonBase, Divider, Typography } from '@mui/material';
import { grid as gridTokens, md3, radius } from '../../../theme/tokens';
import type { FloorElement, Room } from '../../data/floor';
import {
  addElement,
  bookedOn,
  changedRooms,
  duplicateElement,
  elementIds,
  historyOf,
  isDirty,
  live,
  newElement,
  nextId,
  nextRoomName,
  push,
  redo,
  removeElement,
  replaceElement,
  roomDeleteRefusal,
  settle,
  strandedReservations,
  strandedTabs,
  undo,
  type History,
  type PaletteKey,
} from '../../logic/floor-editor';
import { openTabOn, tableLabel } from '../../logic/restaurant';
import { usePos } from '../../state/PosProvider';
import { Icon } from '../primitives';
import { Stack } from '../Stack';
import { TableChartCanvas } from './TableChartCanvas';
import { TableChartInspector } from './TableChartInspector';
import { TableChartPalette } from './TableChartPalette';
import { DeleteRoomDialog, RoomNameDialog } from './TableChartRoomDialogs';

/**
 * Table Chart (V1 → V2, Wave 2) — the floor-plan editor. What it saves is what Tables shows.
 *
 * ## What v1 did
 *
 * `tf-birdie-ds-v1/app/src/screens/table-chart.tsx`: a shape palette, a gridded canvas, drag and
 * eight resize handles, undo/redo, per-room layouts, and an orange dot on SAVE for unsaved work
 * instead of a blocking dialog. Its structural win was that the editor finally **wrote back** —
 * before it, the editor and the live floor held separate layouts.
 *
 * ## What was wrong with it, by its own notes and by reading it
 *
 * - **Switching rooms threw work away.** The working copy was one room, reseeded from the saved
 *   layout whenever the room changed, so arranging the patio and then glancing at the bar lost
 *   the patio. Silently — the orange dot just went out.
 * - **Numbers collided.** A new table was numbered by counting the room's tables; Duplicate
 *   produced "5·2"; nothing checked uniqueness, in a room or across rooms.
 * - **Nothing knew about service.** A table with a party at it could be deleted, and the live
 *   floor lost them. v1 had no tabs on tables, so it had nothing to check against.
 * - **No rotation**, a fixed list of rooms nobody could add to or rename, and 12px handles.
 * - Save navigated away to the live floor, so fixing a second thing meant coming back.
 *
 * ## What this does
 *
 * - **The working copy is the whole floor** — every room — and lives here, in the component,
 *   until Save. Switching rooms keeps every edit; each room tab carries its own orange dot, and
 *   Save writes all of them at once with `saveFloor`. Discard returns to the saved floor, and is
 *   itself undoable, so it needs no confirm.
 * - **Undo and redo** step through snapshots of the whole floor (`floor-editor.ts`). A drag is
 *   one step, however many pixels it crossed; typing a number is one step, however many keys.
 * - **The canvas** draws with the live floor's own renderer and does the direct manipulation —
 *   move, resize, rotate — with finger-sized handles. **The inspector** does the exact part.
 * - **The rules of service are enforced here**, where the damage would be done: no deleting or
 *   closing a table with an open tab, no deleting a room with one, a warning before deleting a
 *   table someone has booked. Those reservations are unassigned at Save — not at Delete — so an
 *   undone deletion never touched a booking.
 * - **Rooms** are added, renamed and removed here. The room on screen is `state.floorRoomId`,
 *   shared with Tables, so moving between the two keeps your place.
 *
 * The frame is the terminal's fixed 1366 × 840: palette, canvas, inspector, side by side, with the
 * floor scaled to fit whatever width the canvas has.
 */

/** v1's unsaved dot. Orange, because it must not read as the green of a free table. */
const UNSAVED = '#ea580c';

type RoomDialog = { kind: 'add' } | { kind: 'rename'; roomId: string } | { kind: 'delete'; roomId: string };

export function TableChartView() {
  const { state, dispatch, toast } = usePos();
  const saved = state.floor;
  const [hist, setHist] = useState<History<Room[]>>(() => historyOf(saved));
  const rooms = hist.present;

  // The room shown. Held here as well as in the store because a room added in the working copy
  // is not in the saved floor yet, and `setFloorRoom` rightly refuses a room that does not exist.
  const [roomPick, setRoomPick] = useState(state.floorRoomId);
  const room = rooms.find((r) => r.id === roomPick) ?? rooms.find((r) => r.id === state.floorRoomId) ?? rooms[0];

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = room?.elements.find((e) => e.id === selectedId) ?? null;
  const [dialog, setDialog] = useState<RoomDialog | null>(null);

  const dirty = isDirty(rooms, saved);
  const changed = changedRooms(rooms, saved);
  const removedRooms = saved.filter((s) => !rooms.some((r) => r.id === s.id));

  const commit = (next: Room[], key?: string) => setHist((h) => push(h, next, key));

  // The working copy as a gesture found it. A ref, because the gesture's end handler was created
  // when it began and must see the value from then, not re-read state.
  const before = useRef<Room[] | null>(null);

  const pickRoom = (id: string) => {
    setRoomPick(id);
    setSelectedId(null);
    if (saved.some((r) => r.id === id)) dispatch({ type: 'setFloorRoom', roomId: id });
  };

  /** Ids nothing has ever pointed at: not the working copy, the saved floor, a tab or a booking. */
  const freshId = (prefix: string) =>
    nextId(prefix, [
      ...elementIds(rooms),
      ...elementIds(saved),
      ...rooms.map((r) => r.id),
      ...saved.map((r) => r.id),
      ...state.tabs.map((t) => t.tableId),
      ...state.diningReservations.map((r) => r.tableId),
    ]);

  const add = (key: PaletteKey) => {
    if (!room) return;
    const el = newElement(key, room, rooms, freshId('el'));
    commit(addElement(rooms, room.id, el));
    setSelectedId(el.id);
  };

  const change = (el: FloorElement, key?: string) => room && commit(replaceElement(rooms, room.id, el), key);

  const duplicate = () => {
    if (!room || !selected) return;
    const copy = duplicateElement(selected, room, rooms, freshId('el'));
    commit(addElement(rooms, room.id, copy));
    setSelectedId(copy.id);
  };

  const remove = () => {
    if (!room || !selected) return;
    commit(removeElement(rooms, room.id, selected.id));
    setSelectedId(null);
  };

  const save = () => {
    if (!dirty) return;
    // The editor refuses every edit that would strand a tab, so this is a backstop — for a tab
    // opened on another terminal while this one was editing, in a world with two terminals.
    const stranded = strandedTabs(rooms, state.tabs);
    if (stranded.length) {
      toast(`Can’t save: ${stranded.map((t) => t.name).join(', ')} would lose ${stranded.length === 1 ? 'its table' : 'their tables'}.`);
      return;
    }
    const unassign = strandedReservations(rooms, state.diningReservations);
    dispatch({ type: 'saveFloor', rooms });
    for (const r of unassign) dispatch({ type: 'patchReservation', id: r.id, patch: { tableId: undefined } });
    if (room) dispatch({ type: 'setFloorRoom', roomId: room.id });
    toast(
      unassign.length
        ? `Floor saved · ${unassign.length} ${unassign.length === 1 ? 'reservation' : 'reservations'} unassigned`
        : 'Floor saved — Tables shows it now',
    );
  };

  const discard = () => {
    commit(saved);
    setSelectedId(null);
  };

  const stepHistory = (fn: typeof undo) => {
    setHist((h) => fn(h));
  };

  // Desktop conveniences. The tablet has the buttons; nothing here depends on a keyboard.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        setHist((h) => (e.shiftKey ? redo(h) : undo(h)));
      } else if (e.key === 'Escape') {
        setSelectedId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!room) return null;

  const unsavedSummary = [
    ...rooms.filter((r) => changed.has(r.id)).map((r) => r.name),
    ...(removedRooms.length ? [`${removedRooms.length} removed`] : []),
  ].join(', ');

  const dialogRoom = dialog && dialog.kind !== 'add' ? rooms.find((r) => r.id === dialog.roomId) : undefined;

  return (
    <Stack data-restaurant-view="TableChartView" data-table-chart sx={{ flex: 1, minWidth: 0, height: '100%', bgcolor: md3.surface }}>
      {/* ── Rooms on the left; history and saving on the right. ── */}
      <Stack
        direction="row"
        alignItems="center"
        gap={0.75}
        sx={{ height: gridTokens.topbarH + 8, px: 1.75, bgcolor: '#fff', borderBottom: `1px solid ${md3.outlineVariant}`, flexShrink: 0 }}
      >
        <Typography sx={{ fontSize: 16, fontWeight: 800, mr: 0.5, whiteSpace: 'nowrap' }}>Table Chart</Typography>
        <Divider orientation="vertical" flexItem sx={{ my: 1.5 }} />

        <Stack direction="row" alignItems="center" gap={0.5} role="tablist" aria-label="Rooms" sx={{ minWidth: 0, overflowX: 'auto', flexShrink: 1 }}>
          {rooms.map((r) => (
            <RoomTab key={r.id} room={r} active={r.id === room.id} unsaved={changed.has(r.id)} onClick={() => pickRoom(r.id)} />
          ))}
        </Stack>
        <BarButton icon="add" label="Add a room" onClick={() => setDialog({ kind: 'add' })} />
        <BarButton icon="edit" label={`Rename ${room.name}`} onClick={() => setDialog({ kind: 'rename', roomId: room.id })} />
        <BarButton icon="delete" label={`Remove ${room.name}`} onClick={() => setDialog({ kind: 'delete', roomId: room.id })} />

        <Box sx={{ flex: 1 }} />

        <BarButton icon="undo" label="Undo" disabled={!hist.past.length} onClick={() => stepHistory(undo)} />
        <BarButton icon="redo" label="Redo" disabled={!hist.future.length} onClick={() => stepHistory(redo)} />
        <Divider orientation="vertical" flexItem sx={{ my: 1.5, mx: 0.5 }} />
        {dirty && (
          <Typography data-unsaved-summary sx={{ fontSize: 12, color: md3.onSurfaceVariant, maxWidth: 200, mr: 0.5 }} noWrap title={unsavedSummary}>
            Unsaved · {unsavedSummary || 'room order'}
          </Typography>
        )}
        <ButtonBase
          onClick={discard}
          disabled={!dirty}
          sx={{
            minHeight: 44,
            px: 2,
            borderRadius: `${radius.xl}px`,
            border: `1.5px solid ${md3.outlineVariant}`,
            fontSize: 13,
            fontWeight: 700,
            color: md3.onSurfaceVariant,
            '&.Mui-disabled': { opacity: 0.4 },
          }}
        >
          Discard
        </ButtonBase>
        <ButtonBase
          onClick={save}
          disabled={!dirty}
          data-floor-save={dirty ? 'unsaved' : 'saved'}
          sx={{
            position: 'relative',
            minHeight: 44,
            px: 2.25,
            gap: 0.75,
            borderRadius: `${radius.xl}px`,
            bgcolor: dirty ? md3.onSurface : md3.surfaceContainer,
            color: dirty ? '#fff' : md3.onSurfaceVariant,
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          <Icon name={dirty ? 'save' : 'check'} size={18} />
          {dirty ? 'Save' : 'Saved'}
          {dirty && <UnsavedDot sx={{ position: 'absolute', top: 2, right: 4 }} />}
        </ButtonBase>
      </Stack>

      <Stack direction="row" sx={{ flex: 1, minHeight: 0 }}>
        <TableChartPalette onAdd={add} />
        <TableChartCanvas
          key={room.id}
          room={room}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onBegin={() => {
            before.current = rooms;
          }}
          onLive={(el) => setHist((h) => live(h, replaceElement(h.present, room.id, el)))}
          onEnd={() => {
            const b = before.current;
            before.current = null;
            if (b) setHist((h) => settle(h, b));
          }}
          // The editor draws tables plain, as v1 did — service colours belong to the live floor.
          // Two exceptions, because they explain what the editor will and will not allow: out of
          // service is drawn as it is on the floor, and a table with an open tab carries a mark.
          statusOf={(el) => (el.kind === 'table' && el.outOfService ? 'blocked' : undefined)}
          badgeOf={(el) =>
            el.kind === 'table' && openTabOn(el.id, state.tabs) ? (
              <Box data-seated-mark aria-label={`${tableLabel(el)} is seated`} sx={{ mt: '2px', display: 'flex' }}>
                <Icon name="people" size={14} color={md3.primary} />
              </Box>
            ) : null
          }
        />
        <TableChartInspector
          el={selected}
          room={room}
          rooms={rooms}
          tabs={state.tabs}
          reservations={state.diningReservations}
          onChange={change}
          onDuplicate={duplicate}
          onDelete={remove}
        />
      </Stack>

      {dialog?.kind === 'add' && (
        <RoomNameDialog
          title="Add a room"
          confirmLabel="Add room"
          initial={nextRoomName(rooms)}
          roomId=""
          rooms={rooms}
          onClose={() => setDialog(null)}
          onConfirm={(name) => {
            const id = freshId('room');
            commit([...rooms, { id, name, elements: [] }]);
            setRoomPick(id);
            setSelectedId(null);
            setDialog(null);
          }}
        />
      )}
      {dialog?.kind === 'rename' && dialogRoom && (
        <RoomNameDialog
          title={`Rename ${dialogRoom.name}`}
          confirmLabel="Rename"
          initial={dialogRoom.name}
          roomId={dialogRoom.id}
          rooms={rooms}
          onClose={() => setDialog(null)}
          onConfirm={(name) => {
            commit(rooms.map((r) => (r.id === dialogRoom.id ? { ...r, name } : r)));
            setDialog(null);
          }}
        />
      )}
      {dialog?.kind === 'delete' && dialogRoom && (
        <DeleteRoomDialog
          room={dialogRoom}
          refusal={roomDeleteRefusal(dialogRoom, rooms, state.tabs)}
          bookedCount={bookedOn(dialogRoom.elements.map((e) => e.id), state.diningReservations).length}
          onClose={() => setDialog(null)}
          onConfirm={() => {
            const at = rooms.findIndex((r) => r.id === dialogRoom.id);
            const rest = rooms.filter((r) => r.id !== dialogRoom.id);
            commit(rest);
            pickRoom(rest[Math.min(at, rest.length - 1)].id);
            setDialog(null);
          }}
        />
      )}
    </Stack>
  );
}

function RoomTab({ room, active, unsaved, onClick }: { room: Room; active: boolean; unsaved: boolean; onClick: () => void }) {
  return (
    <ButtonBase
      role="tab"
      aria-selected={active}
      data-floor-room-tab={room.id}
      data-unsaved={unsaved || undefined}
      onClick={onClick}
      sx={{
        position: 'relative',
        minHeight: 44,
        px: 1.75,
        gap: 0.75,
        flexShrink: 0,
        borderRadius: `${radius.xl}px`,
        border: `1.5px solid ${active ? md3.primary : md3.outlineVariant}`,
        bgcolor: active ? md3.primaryContainer : '#fff',
        color: active ? md3.onPrimaryContainer : md3.onSurfaceVariant,
        fontSize: 13,
        fontWeight: active ? 800 : 600,
        whiteSpace: 'nowrap',
      }}
    >
      {room.name}
      {unsaved && <UnsavedDot />}
    </ButtonBase>
  );
}

const UnsavedDot = ({ sx }: { sx?: object }) => (
  <Box component="span" data-unsaved-dot aria-label="Unsaved changes" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: UNSAVED, flexShrink: 0, ...sx }} />
);

function BarButton({ icon, label, disabled, onClick }: { icon: string; label: string; disabled?: boolean; onClick: () => void }): ReactNode {
  return (
    <ButtonBase
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      sx={{ width: 44, height: 44, flexShrink: 0, borderRadius: `${radius.md}px`, color: md3.onSurfaceVariant, '&.Mui-disabled': { opacity: 0.35 } }}
    >
      <Icon name={icon} size={20} />
    </ButtonBase>
  );
}
