import { useState, type ReactNode } from 'react';
import { Box, ButtonBase, InputBase, Switch, Typography } from '@mui/material';
import { md3, radius } from '../../../theme/tokens';
import { formatTimeLabel } from '../../data/courses';
import { SEAT_RANGE, type FloorElement, type Room, type SeatOrientation, type TableShape } from '../../data/floor';
import {
  ROTATION_STEP,
  TABLE_SHAPES,
  bookedOn,
  deleteRefusal,
  effectiveSeatAxis,
  hasSeatOrientation,
  outOfServiceRefusal,
  rotateBy,
  validateTableNumber,
  withRotation,
  withSeats,
  withShape,
} from '../../logic/floor-editor';
import { openTabOn, tableLabel, type DiningReservation, type Tab } from '../../logic/restaurant';
import { Callout } from '../../modals/ModalFrame';
import { Icon, SectionLabel } from '../primitives';
import { Stack } from '../Stack';

/**
 * Table Chart's inspector: everything about the one selected thing (V1 → V2, Wave 2).
 *
 * v1 floated a toolbar over the selection — its reasoning was that the hand is already on the
 * table. It was 526px wide at a fixed position, so near the top of the room it covered the row it
 * was editing, and it had room for a number, seats, shape and orientation but nothing else. The
 * full editor needs more — rotation, out of service, the text of a label — and a panel beside the
 * canvas can hold all of it without ever covering the floor. The canvas keeps the direct part
 * (drag, resize, rotate); this keeps the exact part.
 *
 * ## The rules it enforces, and says out loud
 *
 * - **Table numbers are unique across the building.** A clash is refused as it is typed, with the
 *   room that already has it, and the table keeps the number it had until the field holds a free
 *   one. v1 accepted anything, including a second "5".
 * - **A table with an open tab cannot be removed**, or taken out of service — people are eating at
 *   it. The refusal names the tab, and says what would make it possible.
 * - **A table with booked reservations can be removed**, after a warning that names them. Save
 *   unassigns them; until then the deletion can be undone and nothing has happened to a booking.
 */
export function TableChartInspector({
  el,
  room,
  rooms,
  tabs,
  reservations,
  onChange,
  onDuplicate,
  onDelete,
}: {
  el: FloorElement | null;
  room: Room;
  rooms: Room[];
  tabs: Tab[];
  reservations: DiningReservation[];
  /** `key` coalesces undo steps — see `push` in `floor-editor.ts`. */
  onChange: (el: FloorElement, key?: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  return (
    <Box
      data-floor-inspector
      sx={{ width: 300, flexShrink: 0, bgcolor: '#fff', borderLeft: `1px solid ${md3.outlineVariant}`, display: 'flex', flexDirection: 'column', minHeight: 0 }}
    >
      {el ? (
        <ElementInspector
          // A fresh inspector per element, so a half-typed number or an open warning never
          // carries over to the next thing tapped.
          key={el.id}
          el={el}
          room={room}
          rooms={rooms}
          tabs={tabs}
          reservations={reservations}
          onChange={onChange}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
        />
      ) : (
        <RoomSummary room={room} />
      )}
    </Box>
  );
}

function RoomSummary({ room }: { room: Room }) {
  const tables = room.elements.filter((e) => e.kind === 'table');
  const seats = tables.reduce((n, t) => n + (t.seats ?? 0), 0);
  return (
    <Box sx={{ p: 2.5 }}>
      <Typography sx={{ fontSize: 17, fontWeight: 800 }}>{room.name}</Typography>
      <Typography sx={{ fontSize: 13, color: md3.onSurfaceVariant, mt: 0.25 }} data-room-summary>
        {tables.length} {tables.length === 1 ? 'table' : 'tables'} · {seats} {seats === 1 ? 'seat' : 'seats'}
      </Typography>
      <Stack gap={1.25} sx={{ mt: 3, color: md3.onSurfaceVariant }}>
        <Hint icon="touch_app">Tap anything on the floor to change it.</Hint>
        <Hint icon="open_with">Drag it to move it. It snaps to the grid.</Hint>
        <Hint icon="add">Add tables and items from the left.</Hint>
        <Hint icon="save">Nothing reaches the live floor until you save.</Hint>
      </Stack>
    </Box>
  );
}

const Hint = ({ icon, children }: { icon: string; children: ReactNode }) => (
  <Stack direction="row" gap={1} alignItems="center">
    <Icon name={icon} size={18} color={md3.outline} />
    <Typography sx={{ fontSize: 12.5 }}>{children}</Typography>
  </Stack>
);

const KIND_TITLE: Record<FloorElement['kind'], string> = { table: 'Table', barrier: 'Barrier', region: 'Region', label: 'Label' };

function ElementInspector({
  el,
  room,
  rooms,
  tabs,
  reservations,
  onChange,
  onDuplicate,
  onDelete,
}: {
  el: FloorElement;
  room: Room;
  rooms: Room[];
  tabs: Tab[];
  reservations: DiningReservation[];
  onChange: (el: FloorElement, key?: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const [numDraft, setNumDraft] = useState<string | null>(null);
  const [numError, setNumError] = useState<string | null>(null);
  const [pending, setPending] = useState<'refused' | 'confirm' | null>(null);

  const isTable = el.kind === 'table';
  const tab = isTable ? openTabOn(el.id, tabs) : undefined;
  const booked = isTable ? bookedOn([el.id], reservations) : [];
  const oosRefusal = outOfServiceRefusal(el, tabs);

  // The number the table had when editing began. A number is applied as it is typed, so the floor
  // shows it at once; while the field holds one that is refused, the table goes back to this
  // rather than keeping whatever valid prefix was typed on the way ("P" on the way to a taken
  // "P3"). One undo step either way — the pushes share a key.
  const [numAtStart, setNumAtStart] = useState(el.num);
  const typeNumber = (v: string) => {
    const check = validateTableNumber(v, el.id, rooms);
    const apply = (num: string | undefined) => num !== el.num && onChange({ ...el, num }, `num:${el.id}`);
    if (check.ok) {
      setNumDraft(null);
      setNumError(null);
      apply(check.num);
    } else {
      setNumDraft(v);
      setNumError(check.error);
      apply(numAtStart);
    }
  };

  const askDelete = () => {
    if (deleteRefusal(el, tabs)) setPending('refused');
    else if (booked.length) setPending('confirm');
    else onDelete();
  };

  const rotation = el.rotation ?? 0;

  return (
    <>
      <Stack direction="row" alignItems="center" gap={1.25} sx={{ p: '16px 20px 12px', borderBottom: `1px solid ${md3.outlineVariant}` }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 17, fontWeight: 800 }} noWrap data-inspector-title>
            {isTable ? tableLabel(el) : KIND_TITLE[el.kind]}
          </Typography>
          <Typography sx={{ fontSize: 12, color: md3.onSurfaceVariant }} noWrap>
            {tab ? `Seated · ${tab.name}` : el.outOfService ? `Out of service · ${room.name}` : room.name}
          </Typography>
        </Box>
      </Stack>

      <Box sx={{ flex: 1, overflowY: 'auto', p: '14px 20px', minHeight: 0 }}>
        {isTable && (
          <>
            <Row label="Number">
              <TextInput
                label="Table number"
                value={numDraft ?? el.num ?? ''}
                invalid={Boolean(numError)}
                onChange={typeNumber}
                onFocus={() => setNumAtStart(el.num)}
                onBlur={() => {
                  setNumDraft(null);
                  setNumError(null);
                }}
              />
              {numError && (
                <Typography role="alert" data-number-error sx={{ fontSize: 11.5, color: md3.error, mt: 0.5, lineHeight: 1.35 }}>
                  {numError}
                </Typography>
              )}
            </Row>

            <Row label="Seats">
              <Stepper
                label="seats"
                value={String(el.seats ?? SEAT_RANGE.min)}
                canDown={(el.seats ?? 1) > SEAT_RANGE.min}
                canUp={(el.seats ?? 1) < SEAT_RANGE.max}
                onDown={() => onChange(withSeats(el, (el.seats ?? 1) - 1))}
                onUp={() => onChange(withSeats(el, (el.seats ?? 1) + 1))}
              />
            </Row>

            <Row label="Shape">
              <Stack direction="row" gap={0.5}>
                {TABLE_SHAPES.map((s) => (
                  <Choice key={s} label={SHAPE_NAMES[s]} active={el.shape === s} onClick={() => onChange(withShape(el, s))}>
                    <ShapeIcon shape={s} />
                  </Choice>
                ))}
              </Stack>
            </Row>

            {hasSeatOrientation(el.shape) && (
              <Row label="Seats along">
                <Stack direction="row" gap={0.5}>
                  {(['horizontal', 'vertical'] as SeatOrientation[]).map((axis) => (
                    <Choice
                      key={axis}
                      label={axis === 'horizontal' ? 'Seats top and bottom' : 'Seats left and right'}
                      active={effectiveSeatAxis(el) === axis}
                      onClick={() => onChange({ ...el, seatOrientation: axis })}
                      wide
                    >
                      <SeatAxisIcon axis={axis} />
                      <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{axis === 'horizontal' ? 'Top & bottom' : 'Sides'}</Typography>
                    </Choice>
                  ))}
                </Stack>
              </Row>
            )}
          </>
        )}

        {(el.kind === 'label' || el.kind === 'region') && (
          <Row label="Text">
            <TextInput label={`${KIND_TITLE[el.kind]} text`} value={el.text ?? ''} onChange={(v) => onChange({ ...el, text: v }, `text:${el.id}`)} />
          </Row>
        )}

        <Row label="Rotation">
          <Stepper
            label="rotation"
            value={`${rotation}°`}
            canDown
            canUp
            onDown={() => onChange(rotateBy(el, -ROTATION_STEP))}
            onUp={() => onChange(rotateBy(el, ROTATION_STEP))}
            downIcon="rotate_left"
            upIcon="rotate_right"
            aside={
              rotation !== 0 && (
                <ButtonBase
                  onClick={() => onChange(withRotation(el, 0))}
                  sx={{ minHeight: 44, px: 1.25, borderRadius: `${radius.md}px`, fontSize: 12.5, fontWeight: 700, color: md3.primary }}
                >
                  Straighten
                </ButtonBase>
              )
            }
          />
        </Row>

        {isTable && (
          <Row label="Service">
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ minHeight: 44, px: 1.25, border: `1.5px solid ${md3.outlineVariant}`, borderRadius: `${radius.md}px` }}
            >
              <Typography sx={{ fontSize: 13, fontWeight: 600 }}>Out of service</Typography>
              <Switch
                checked={Boolean(el.outOfService)}
                disabled={Boolean(oosRefusal)}
                onChange={(_, v) => onChange({ ...el, outOfService: v || undefined })}
                slotProps={{ input: { 'aria-label': 'Out of service' } }}
              />
            </Stack>
            <Typography sx={{ fontSize: 11, color: oosRefusal ? md3.error : md3.outline, mt: 0.5, lineHeight: 1.4 }}>
              {oosRefusal ?? 'Stays on the floor, greyed out, and is never offered to a party.'}
            </Typography>
          </Row>
        )}

      </Box>

      {/* Beside the button that asked, not at the bottom of a scrolling list where it could land
          out of sight. */}
      {pending && (
        <Box sx={{ px: 2.5, pt: 1.5, borderTop: `1px solid ${md3.outlineVariant}` }}>
          {pending === 'refused' && (
            <Box data-delete-refused>
              <Callout tone="danger" icon="block">
                <b>Can’t remove {tableLabel(el)}.</b> {deleteRefusal(el, tabs)}
              </Callout>
            </Box>
          )}
          {pending === 'confirm' && (
            <Box data-delete-warning>
              <Callout tone="warning">
                <b>
                  {booked.length} booked {booked.length === 1 ? 'reservation is' : 'reservations are'} assigned to {tableLabel(el)}
                </b>
                {booked.map((r) => (
                  <Box key={r.id}>
                    {r.name} · {formatTimeLabel(r.timeMin)} · party of {r.partySize}
                  </Box>
                ))}
                <Box sx={{ mt: 0.5 }}>Removing the table unassigns {booked.length === 1 ? 'it' : 'them'} when you save — the host picks a table when they arrive.</Box>
                <Stack direction="row" gap={1} sx={{ mt: 1 }}>
                  <PanelButton destructive onClick={onDelete}>
                    Remove anyway
                  </PanelButton>
                  <PanelButton onClick={() => setPending(null)}>Keep it</PanelButton>
                </Stack>
              </Callout>
            </Box>
          )}
        </Box>
      )}
      <Stack direction="row" gap={1} sx={{ p: '12px 20px', borderTop: pending ? 'none' : `1px solid ${md3.outlineVariant}` }}>
        <PanelButton icon="content_copy" onClick={onDuplicate}>
          Duplicate
        </PanelButton>
        <PanelButton icon="delete" destructive onClick={askDelete}>
          Delete
        </PanelButton>
      </Stack>
    </>
  );
}

// ─── Pieces ─────────────────────────────────────────────────────────────────

const SHAPE_NAMES: Record<TableShape, string> = {
  circle: 'Round',
  square: 'Square',
  rectangle: 'Long',
  oval: 'Oval',
  diamond: 'Diamond',
};

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <Box sx={{ mb: 2 }}>
    <SectionLabel color={md3.outline} sx={{ mb: 0.5 }}>
      {label}
    </SectionLabel>
    {children}
  </Box>
);

function TextInput({
  label,
  value,
  onChange,
  onFocus,
  onBlur,
  invalid,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  invalid?: boolean;
}) {
  return (
    <InputBase
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={onFocus}
      onBlur={onBlur}
      inputProps={{ 'aria-label': label, 'aria-invalid': invalid || undefined }}
      sx={{
        width: '100%',
        minHeight: 44,
        px: 1.25,
        fontSize: 15,
        fontWeight: 600,
        border: `1.5px solid ${invalid ? md3.error : md3.outlineVariant}`,
        borderRadius: `${radius.md}px`,
        '&.Mui-focused': { borderColor: invalid ? md3.error : md3.primary },
      }}
    />
  );
}

function Stepper({
  label,
  value,
  canDown,
  canUp,
  onDown,
  onUp,
  downIcon = 'remove',
  upIcon = 'add',
  aside,
}: {
  label: string;
  value: string;
  canDown: boolean;
  canUp: boolean;
  onDown: () => void;
  onUp: () => void;
  downIcon?: string;
  upIcon?: string;
  aside?: ReactNode;
}) {
  const btn = { width: 44, height: 44, borderRadius: `${radius.md}px`, color: md3.onSurface, '&.Mui-disabled': { opacity: 0.35 } } as const;
  return (
    <Stack direction="row" alignItems="center" gap={0.5}>
      <Stack direction="row" alignItems="center" sx={{ border: `1.5px solid ${md3.outlineVariant}`, borderRadius: `${radius.md}px` }}>
        <ButtonBase aria-label={`Decrease ${label}`} disabled={!canDown} onClick={onDown} sx={btn}>
          <Icon name={downIcon} size={20} />
        </ButtonBase>
        <Typography data-stepper-value={label} sx={{ minWidth: 48, textAlign: 'center', fontSize: 15, fontWeight: 700 }}>
          {value}
        </Typography>
        <ButtonBase aria-label={`Increase ${label}`} disabled={!canUp} onClick={onUp} sx={btn}>
          <Icon name={upIcon} size={20} />
        </ButtonBase>
      </Stack>
      {aside}
    </Stack>
  );
}

function Choice({ label, active, onClick, wide, children }: { label: string; active: boolean; onClick: () => void; wide?: boolean; children: ReactNode }) {
  return (
    <ButtonBase
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      sx={{
        minWidth: 44,
        height: 44,
        flex: wide ? 1 : 'none',
        gap: 0.75,
        px: wide ? 1 : 0,
        borderRadius: `${radius.md}px`,
        border: `1.5px solid ${active ? md3.primary : md3.outlineVariant}`,
        bgcolor: active ? md3.primaryContainer : '#fff',
        color: active ? md3.onPrimaryContainer : md3.onSurfaceVariant,
      }}
    >
      {children}
    </ButtonBase>
  );
}

function PanelButton({
  icon,
  destructive,
  onClick,
  children,
}: {
  icon?: string;
  destructive?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <ButtonBase
      onClick={onClick}
      sx={{
        flex: 1,
        minHeight: 44,
        gap: 0.75,
        px: 1.5,
        borderRadius: `${radius.xl}px`,
        border: `1.5px solid ${destructive ? md3.error : md3.outlineVariant}`,
        color: destructive ? md3.error : md3.onSurface,
        bgcolor: '#fff',
        fontSize: 13,
        fontWeight: 700,
        whiteSpace: 'nowrap',
      }}
    >
      {icon && <Icon name={icon} size={18} />}
      {children}
    </ButtonBase>
  );
}

/** Each shape's outline, from v1's shape switcher. */
function ShapeIcon({ shape }: { shape: TableShape }) {
  const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 2 } as const;
  return (
    <Box component="svg" width={22} height={22} viewBox="0 0 22 22" sx={{ display: 'block' }} aria-hidden>
      {shape === 'circle' && <circle cx={11} cy={11} r={8} {...s} />}
      {shape === 'square' && <rect x={3} y={3} width={16} height={16} rx={2} {...s} />}
      {shape === 'rectangle' && <rect x={2} y={6} width={18} height={10} rx={2} {...s} />}
      {shape === 'oval' && <ellipse cx={11} cy={11} rx={9} ry={6} {...s} />}
      {shape === 'diamond' && <rect x={4} y={4} width={14} height={14} rx={2} transform="rotate(45 11 11)" {...s} />}
    </Box>
  );
}

/** Seat marks on the top and bottom edges, or on the sides — v1's. */
function SeatAxisIcon({ axis }: { axis: SeatOrientation }) {
  return (
    <Box component="svg" width={22} height={22} viewBox="0 0 22 22" sx={{ display: 'block' }} aria-hidden>
      <rect x={5} y={5} width={12} height={12} rx={2} fill="none" stroke="currentColor" strokeWidth={1.8} />
      {axis === 'horizontal' ? (
        <>
          <rect x={8} y={1} width={6} height={2.4} rx={1} fill="currentColor" />
          <rect x={8} y={18.6} width={6} height={2.4} rx={1} fill="currentColor" />
        </>
      ) : (
        <>
          <rect x={1} y={8} width={2.4} height={6} rx={1} fill="currentColor" />
          <rect x={18.6} y={8} width={2.4} height={6} rx={1} fill="currentColor" />
        </>
      )}
    </Box>
  );
}
