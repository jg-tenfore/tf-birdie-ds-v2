import { useState } from 'react';
import { Box, ButtonBase, Typography } from '@mui/material';
import { md3, radius } from '../../theme/tokens';
import { menuItem, missingRequired, priceWithModifiers, type AppliedModifier, type ModifierGroup } from '../data/menu';
import { money } from '../logic/cart';
import { chooseOption, groupsOf, isChosen, missingPrompt, ordered } from '../logic/dish-choice';
import { isSent } from '../logic/restaurant';
import { linesOf, tabById, type RestaurantModal } from '../state/restaurant';
import { usePos } from '../state/PosProvider';
import { Icon } from '../components/primitives';
import { Stack } from '../components/Stack';
import { Callout, Field, FilledButton, ModalFrame, OutlineButton } from './ModalFrame';

/**
 * Choose modifiers for a dish (V1 → V2, Wave 2) — adding one, or changing one not yet sent.
 *
 * ## What v1 did
 *
 * v1's item detail (`tf-birdie-ds-v1/app/src/screens/tab-item-detail.tsx`) replaced the menu with
 * one pane: a quantity, a free-text note, and ten modifier groups behind a horizontally scrolling
 * strip, so the last few were off-screen and, in v1's words, "a modifier nobody scrolls to is a
 * modifier nobody applies". Every option was drawn as a radio and toggled like a checkbox. Nothing
 * was required, so a burger could reach the kitchen with no temperature, and allergies were one
 * more tab of grey options.
 *
 * ## What this does
 *
 * - **Every group on one scrolling page**, in the menu's order, so nothing hides behind a tab.
 * - **A group is drawn as what it is.** `one` is a radio group — round marks, "Choose one", a tap
 *   replaces; `many` is a set of checkboxes — square marks, "Choose any", a tap toggles.
 *   See `logic/dish-choice.ts`.
 * - **Required groups are marked and block confirming** until answered, and the footer says in
 *   words what is still missing. A dish is complete before it is on the order, so Send never has
 *   to refuse one.
 * - **Allergies cannot be mistaken for a garnish**: a red-edged group with a warning mark, and a
 *   chosen allergy fills solid red — on the line and on the kitchen's ticket too.
 * - Quantity, the seat (on a tab), a note, and the **live price** of the whole line.
 *
 * Editing works on unsent lines only. The reducer refuses to edit a sent one, and this dialog is
 * never opened for one; if it were, it says so rather than offering changes it would throw away.
 */
export function DishDialog({ m }: { m: Extract<RestaurantModal, { kind: 'dish' }> }) {
  const { state, dispatch, toast } = usePos();
  const item = menuItem(m.menuItemId);
  const line = m.lineId ? linesOf(state, m.target).find((l) => l.dish?.lineId === m.lineId) : undefined;
  const tab = m.target === 'cart' ? undefined : tabById(state, m.target.tabId);

  const [mods, setMods] = useState<AppliedModifier[]>(line?.dish?.modifiers ?? []);
  const [qty, setQty] = useState(line?.qty ?? 1);
  const [seat, setSeat] = useState<number | undefined>(line ? line.dish?.seat : m.seat);
  const [note, setNote] = useState(line?.dish?.note ?? '');

  const close = () => dispatch({ type: 'closeModal' });

  if (!item || (m.lineId && (!line || isSent(line)))) {
    return (
      <ModalFrame title={item?.name ?? 'Dish'} icon="lock" onClose={close} actions={<FilledButton onClick={close}>Close</FilledButton>}>
        <Callout tone="warning">
          {line && isSent(line)
            ? 'This dish has gone to the kitchen, so it cannot be changed. Void it and ring it again.'
            : 'This dish is no longer on the order.'}
        </Callout>
      </ModalFrame>
    );
  }

  const groups = groupsOf(item);
  const missing = missingRequired(item, mods);
  const unit = priceWithModifiers(item.price, mods);
  const editing = Boolean(line);
  const seatWord = tab ? (seat ? `Seat ${seat}` : 'Shared') : null;

  const confirm = () => {
    if (missing.length) return;
    const modifiers = ordered(item, mods);
    if (line?.dish) {
      dispatch({ type: 'editDish', target: m.target, lineId: line.dish.lineId, patch: { modifiers, seat: seat ?? null, note, qty } });
      toast(`Updated: ${item.name}`);
    } else {
      dispatch({ type: 'addDish', target: m.target, menuItemId: item.id, modifiers, seat, note, qty });
      toast(`Added: ${item.name}${seatWord ? ` · ${seatWord}` : ''}`);
    }
    close();
  };

  return (
    <ModalFrame
      title={item.name}
      subtitle={`${item.description} · ${money(item.price)}`}
      icon="restaurant_menu"
      width={660}
      tall
      onClose={close}
      actions={
        <>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography data-dish-price sx={{ fontSize: 16, fontWeight: 800 }}>
              {money(unit * qty)}
            </Typography>
            <Typography
              data-dish-missing={missing.length || undefined}
              sx={{ fontSize: 11.5, fontWeight: 700, color: missing.length ? md3.error : md3.onSurfaceVariant }}
            >
              {missing.length ? missingPrompt(missing) : qty > 1 ? `${money(unit)} each` : 'Ready for the kitchen'}
            </Typography>
          </Box>
          <OutlineButton onClick={close}>Cancel</OutlineButton>
          <FilledButton onClick={confirm} disabled={missing.length > 0}>
            {editing ? 'Save changes' : seatWord ? `Add to ${seatWord}` : 'Add to order'}
          </FilledButton>
        </>
      }
    >
      {groups.map((g) => (
        <GroupBlock key={g.id} group={g} mods={mods} onChoose={(o) => setMods((cur) => chooseOption(cur, g, o))} />
      ))}

      <Stack direction="row" gap={2.5} flexWrap="wrap" sx={{ mb: 2 }}>
        <Box>
          <GroupTitle>Quantity</GroupTitle>
          <Stack direction="row" alignItems="center" gap={1}>
            <Round label="One fewer" disabled={qty <= 1} onClick={() => setQty((q) => Math.max(1, q - 1))}>
              −
            </Round>
            <Box data-dish-qty sx={{ minWidth: 28, textAlign: 'center', fontSize: 17, fontWeight: 800 }}>
              {qty}
            </Box>
            <Round label="One more" onClick={() => setQty((q) => q + 1)}>
              +
            </Round>
          </Stack>
        </Box>

        {tab && (
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <GroupTitle>Seat</GroupTitle>
            <Stack direction="row" gap={0.75} flexWrap="wrap" role="group" aria-label="Seat">
              {[...Array.from({ length: tab.guests }, (_, i) => i + 1), undefined].map((s) => {
                const on = s === seat;
                return (
                  <ButtonBase
                    key={s ?? 'shared'}
                    aria-pressed={on}
                    onClick={() => setSeat(s)}
                    sx={{
                      minWidth: 44,
                      minHeight: 44,
                      px: 1.5,
                      borderRadius: `${radius.xl}px`,
                      border: `1.5px solid ${on ? md3.primary : md3.outlineVariant}`,
                      bgcolor: on ? md3.primaryContainer : '#fff',
                      color: on ? md3.onPrimaryContainer : md3.onSurfaceVariant,
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    {s ? `Seat ${s}` : 'Shared'}
                  </ButtonBase>
                );
              })}
            </Stack>
          </Box>
        )}
      </Stack>

      <Field label="Note for the kitchen" value={note} onChange={setNote} placeholder="Gluten-free bread, sauce on the side…" multiline />
    </ModalFrame>
  );
}

function GroupTitle({ children }: { children: React.ReactNode }) {
  return <Typography sx={{ fontSize: 12, fontWeight: 800, color: md3.onSurfaceVariant, mb: 0.75 }}>{children}</Typography>;
}

/**
 * One modifier group. The mark says what a tap will do before it is tapped: a round mark with a
 * dot is one-of (radio), a square with a tick is any-of (checkbox), and the roles match, so a
 * screen reader hears the same distinction the eye sees.
 */
function GroupBlock({
  group,
  mods,
  onChoose,
}: {
  group: ModifierGroup;
  mods: AppliedModifier[];
  onChoose: (o: ModifierGroup['options'][number]) => void;
}) {
  const one = group.select === 'one';
  const answered = mods.some((m) => m.groupId === group.id);
  const alert = Boolean(group.alert);
  const accent = alert ? md3.error : md3.primary;

  return (
    <Box
      data-modifier-group={group.id}
      data-select={group.select}
      data-alert={alert || undefined}
      sx={{
        mb: 2,
        ...(alert && { p: 1.5, borderRadius: `${radius.md}px`, border: `2px solid ${md3.error}`, bgcolor: '#fff5f4' }),
      }}
    >
      <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 0.875 }}>
        {alert && <Icon name="warning_amber" size={18} color={md3.error} />}
        <Typography sx={{ fontSize: 14, fontWeight: 800, color: alert ? md3.error : md3.onSurface }}>{group.name}</Typography>
        <Typography sx={{ fontSize: 11.5, color: md3.onSurfaceVariant }}>
          {one ? 'Choose one' : 'Choose any'}
          {alert ? ' · the kitchen sees these in red' : ''}
        </Typography>
        <Box sx={{ flex: 1 }} />
        {group.required && (
          <Stack
            direction="row"
            alignItems="center"
            gap={0.375}
            data-required={answered ? 'answered' : 'missing'}
            sx={{
              px: 1,
              py: '3px',
              borderRadius: `${radius.xl}px`,
              fontSize: 11,
              fontWeight: 800,
              bgcolor: answered ? md3.primaryContainer : '#ffdad6',
              color: answered ? md3.onPrimaryContainer : md3.error,
            }}
          >
            {answered && <Icon name="check" size={13} />}
            Required
          </Stack>
        )}
      </Stack>
      <Box
        role={one ? 'radiogroup' : 'group'}
        aria-label={group.name}
        sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px' }}
      >
        {group.options.map((o) => {
          const on = isChosen(mods, o.id);
          const solid = alert && on;
          return (
            <ButtonBase
              key={o.id}
              role={one ? 'radio' : 'checkbox'}
              aria-checked={on}
              data-option={o.id}
              onClick={() => onChoose(o)}
              sx={{
                minHeight: 48,
                px: 1.5,
                gap: 1.25,
                justifyContent: 'flex-start',
                borderRadius: `${radius.md}px`,
                border: `1.5px solid ${on ? accent : md3.outlineVariant}`,
                bgcolor: solid ? md3.error : on ? `${accent}14` : '#fff',
                color: solid ? '#fff' : md3.onSurface,
                fontSize: 13,
                fontWeight: on ? 800 : 600,
                textAlign: 'left',
              }}
            >
              <Mark kind={one ? 'radio' : 'check'} on={on} color={solid ? '#fff' : accent} />
              <Box component="span" sx={{ flex: 1 }}>
                {o.name}
              </Box>
              {o.price ? (
                <Box component="span" sx={{ fontSize: 12, fontWeight: 700, color: solid ? '#fff' : md3.onSurfaceVariant }}>
                  +{money(o.price)}
                </Box>
              ) : null}
            </ButtonBase>
          );
        })}
      </Box>
    </Box>
  );
}

/** A radio dot or a checkbox tick, drawn rather than borrowed from an icon, so the two cannot be confused. */
function Mark({ kind, on, color }: { kind: 'radio' | 'check'; on: boolean; color: string }) {
  return (
    <Box
      aria-hidden
      sx={{
        width: 20,
        height: 20,
        flexShrink: 0,
        borderRadius: kind === 'radio' ? '50%' : '5px',
        border: `2px solid ${on ? color : md3.outline}`,
        bgcolor: kind === 'check' && on ? color : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {on && kind === 'radio' && <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color }} />}
      {on && kind === 'check' && <Icon name="check" size={15} color={color === '#fff' ? md3.error : '#fff'} />}
    </Box>
  );
}

function Round({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <ButtonBase
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      sx={{
        width: 44,
        height: 44,
        borderRadius: '50%',
        border: `1.5px solid ${md3.outlineVariant}`,
        bgcolor: '#fff',
        fontSize: 20,
        color: md3.onSurfaceVariant,
        '&.Mui-disabled': { opacity: 0.4 },
      }}
    >
      {children}
    </ButtonBase>
  );
}
