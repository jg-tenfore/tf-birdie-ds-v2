import { useState } from 'react';
import type { ReactNode } from 'react';
import { Box, Button, ButtonBase, Chip, Typography } from '@mui/material';
import CheckBox from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlank from '@mui/icons-material/CheckBoxOutlineBlank';
import RadioButtonChecked from '@mui/icons-material/RadioButtonChecked';
import RadioButtonUnchecked from '@mui/icons-material/RadioButtonUnchecked';
import ChevronRight from '@mui/icons-material/ChevronRight';
import DirectionsCarOutlined from '@mui/icons-material/DirectionsCarOutlined';
import DirectionsWalk from '@mui/icons-material/DirectionsWalk';
import ElectricScooterOutlined from '@mui/icons-material/ElectricScooterOutlined';
import PersonSearchOutlined from '@mui/icons-material/PersonSearchOutlined';
import { md3, mobile, playerAccents, radius } from '../../../../theme/tokens';
import { CATALOG } from '../../../data/catalog';
import * as cartLogic from '../../../logic/cart';
import { usePos } from '../../../state/PosProvider';
import type { CatalogItem, Transport } from '../../../types';
import { deltaMoney } from '../../../components/primitives';
import { Stack } from '../../../components/Stack';
import { BottomActionBar, MobileScreen, TopAppBar } from '../../chrome';
import { useMobileNav } from '../../navigation';
import type { ScreenProps } from '../types';
import { SeatAvatar, Subheader, isNamedSeat, seatName } from './parts';

/**
 * One player on a round — pushed from their row on the order; back returns to the order.
 *
 * This is the terminal's modifier picker and its Guest Details button merged into one
 * drill-down, because on a phone "this player" is the natural unit: who they are, how
 * they're getting round, and what rate they pay. Changes apply as they're made (the MD3
 * settings-screen convention), so there is nothing to save and back never loses work.
 *
 * The three groups are the pricing precedence, and each uses the control that says so:
 * transport is a segmented button (exactly one), rate overrides are radios (at most one),
 * discounts are checkboxes (they stack).
 *
 * Other seats are one tap away in a chip row under the bar, so working through a
 * foursome doesn't mean back-and-forth to the order.
 */

const MODS = CATALOG['MODIFIERS'].items;
const RATES = MODS.filter((m) => !m.isDiscount && !m.isTransport);
const DISCOUNTS = MODS.filter((m) => m.isDiscount);
const TRANSPORT: Array<{ mode: Transport; label: string; mod?: CatalogItem; icon: ReactNode }> = [
  { mode: 'walking', label: 'Walking', icon: <DirectionsWalk fontSize="small" /> },
  { mode: 'cart', label: 'Cart', mod: MODS.find((m) => m.n === 'Riding Cart'), icon: <DirectionsCarOutlined fontSize="small" /> },
  { mode: 'push', label: 'Push', mod: MODS.find((m) => m.n === 'Push Cart'), icon: <ElectricScooterOutlined fontSize="small" /> },
];

export function PlayerModifiersScreen({ route }: ScreenProps<'playerModifiers'>) {
  const { state, dispatch } = usePos();
  const nav = useMobileNav();
  const [seat, setSeat] = useState(route.playerIdx);
  const itemIdx = route.itemIdx;
  const item = state.cart[itemIdx];
  const players = item?.players ?? [];
  const player = players[seat];

  if (!item || !player) {
    return (
      <MobileScreen topBar={<TopAppBar title="Player" />}>
        <Typography sx={{ p: 2, color: md3.onSurfaceVariant }}>This player is no longer on the order.</Typography>
      </MobileScreen>
    );
  }

  const unit = item.unitPrice ?? 0;
  const b = cartLogic.playerBreakdown(unit, player);
  const applied = new Set(player.modifierTags.map((t) => t.name));
  const currentTransport = player.modifierTags.find((t) => t.isTransport);
  const transportMode: Transport =
    currentTransport?.name === 'Riding Cart' ? 'cart' : currentTransport?.name === 'Push Cart' ? 'push' : currentTransport ? 'cart' : 'walking';
  const currentRate = player.modifierTags.find((t) => !t.isTransport && !t.isDiscount)?.name ?? null;
  const name = seatName(player, seat);

  const toggle = (modName: string) =>
    dispatch({ type: 'togglePlayerModifier', itemIndex: itemIdx, playerIndex: seat, modName });

  const setTransport = (mode: Transport) => {
    if (mode === transportMode) return;
    const target = TRANSPORT.find((t) => t.mode === mode)?.mod;
    if (target) toggle(target.n);
    // Walking has no modifier — remove whatever transport is on.
    else if (currentTransport) toggle(currentTransport.name);
    dispatch({ type: 'updatePlayer', itemIndex: itemIdx, playerIndex: seat, patch: { transport: mode } });
  };

  const setRate = (modName: string | null) => {
    if (modName === currentRate) return;
    if (modName) toggle(modName);
    else if (currentRate) toggle(currentRate);
  };

  return (
    <MobileScreen
      topBar={
        <TopAppBar title={name} subtitle={`Player ${seat + 1} of ${players.length} · ${item.name}`}>
          {players.length > 1 && (
            <Stack direction="row" gap={1} sx={{ px: 2, pb: 1.5, overflowX: 'auto', '&::-webkit-scrollbar': { display: 'none' } }}>
              {players.map((p, i) => (
                <Chip
                  key={i}
                  label={seatName(p, i)}
                  onClick={() => setSeat(i)}
                  variant={i === seat ? 'filled' : 'outlined'}
                  sx={{
                    flexShrink: 0,
                    bgcolor: i === seat ? mobile.secondaryContainer : 'transparent',
                    color: i === seat ? mobile.onSecondaryContainer : md3.onSurfaceVariant,
                    borderColor: md3.outlineVariant,
                    '&::before': {
                      content: '""',
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: playerAccents[i % playerAccents.length],
                      ml: 1.5,
                    },
                  }}
                />
              ))}
            </Stack>
          )}
        </TopAppBar>
      }
      bottomBar={
        <BottomActionBar
          summary={
            <Stack direction="row" justifyContent="space-between" alignItems="baseline">
              <Typography variant="body2" sx={{ color: md3.onSurfaceVariant }}>
                Green fee {cartLogic.money(b.fee)} · Transport {cartLogic.money(b.transport)}
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {cartLogic.money(b.total)}
              </Typography>
            </Stack>
          }
        >
          <Button variant="contained" size="large" fullWidth onClick={() => nav.pop()}>
            Done
          </Button>
        </BottomActionBar>
      }
    >
      <Subheader>Golfer</Subheader>
      <ButtonBase
        onClick={() => nav.push({ name: 'golferPicker', target: { itemIdx, playerIdx: seat } })}
        sx={{ width: '100%', justifyContent: 'flex-start', gap: 2, px: 2, minHeight: mobile.listItem.two }}
      >
        <SeatAvatar name={name} index={seat} />
        <Box sx={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
          <Typography variant="body1" noWrap>
            {isNamedSeat(player, seat) ? name : 'Attach a golfer'}
          </Typography>
          <Typography variant="body2" noWrap sx={{ color: md3.onSurfaceVariant }}>
            {isNamedSeat(player, seat) ? (player.phone ?? 'Change golfer') : 'Search People, or leave as a guest seat'}
          </Typography>
        </Box>
        {isNamedSeat(player, seat) ? <ChevronRight sx={{ color: md3.onSurfaceVariant }} /> : <PersonSearchOutlined sx={{ color: md3.primary }} />}
      </ButtonBase>

      <Subheader>Transport</Subheader>
      <Stack
        direction="row"
        sx={{ mx: 2, height: 48, borderRadius: `${radius.xl}px`, border: `1px solid ${md3.outline}`, overflow: 'hidden' }}
        role="radiogroup"
        aria-label="Transport"
      >
        {TRANSPORT.map((t, i) => {
          const on = t.mode === transportMode;
          return (
            <ButtonBase
              key={t.mode}
              role="radio"
              aria-checked={on}
              onClick={() => setTransport(t.mode)}
              sx={{
                flex: 1,
                gap: 0.75,
                fontSize: 14,
                fontWeight: 500,
                borderLeft: i ? `1px solid ${md3.outline}` : 'none',
                bgcolor: on ? mobile.secondaryContainer : 'transparent',
                color: on ? mobile.onSecondaryContainer : md3.onSurface,
              }}
            >
              {t.icon}
              {t.label}
              {t.mod && (
                <Box component="span" sx={{ fontSize: 12, color: md3.onSurfaceVariant }}>
                  +{cartLogic.moneyShort(t.mod.p)}
                </Box>
              )}
            </ButtonBase>
          );
        })}
      </Stack>

      <Subheader sx={{ mt: 1 }}>Rate</Subheader>
      <OptionRow
        kind="radio"
        on={!currentRate}
        primary={`${item.name} — standard`}
        secondary={cartLogic.money(unit)}
        onClick={() => setRate(null)}
      />
      {RATES.map((m) => (
        <OptionRow
          key={m.n}
          kind="radio"
          on={currentRate === m.n}
          primary={m.n}
          secondary={m.isOverride ? 'Sets the green fee to $0.00' : `${cartLogic.money(m.p)} · ${deltaMoney(m.p - unit)} vs standard`}
          tagColor={m.tagColor}
          onClick={() => setRate(m.n)}
        />
      ))}

      <Subheader sx={{ mt: 1 }}>Discounts · these stack</Subheader>
      {DISCOUNTS.map((m) => (
        <OptionRow
          key={m.n}
          kind="check"
          on={applied.has(m.n)}
          primary={m.n}
          secondary={m.desc}
          tagColor={m.tagColor}
          trailing={deltaMoney(m.p)}
          onClick={() => toggle(m.n)}
        />
      ))}
      <Box sx={{ height: 16 }} />
    </MobileScreen>
  );
}

function OptionRow({
  kind,
  on,
  primary,
  secondary,
  trailing,
  tagColor,
  onClick,
}: {
  kind: 'radio' | 'check';
  on: boolean;
  primary: string;
  secondary?: string;
  trailing?: string;
  tagColor?: string;
  onClick: () => void;
}) {
  return (
    <ButtonBase
      onClick={onClick}
      role={kind === 'radio' ? 'radio' : 'checkbox'}
      aria-checked={on}
      sx={{ width: '100%', justifyContent: 'flex-start', gap: 2, pl: 2, pr: 2, minHeight: mobile.listItem.two }}
    >
      <Box sx={{ display: 'flex', color: on ? md3.primary : md3.onSurfaceVariant }}>
        {kind === 'radio' ? (
          on ? <RadioButtonChecked /> : <RadioButtonUnchecked />
        ) : on ? (
          <CheckBox />
        ) : (
          <CheckBoxOutlineBlank />
        )}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
        <Stack direction="row" alignItems="center" gap={1}>
          {tagColor && <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: tagColor, flexShrink: 0 }} />}
          <Typography variant="body1" noWrap>
            {primary}
          </Typography>
        </Stack>
        {secondary && (
          <Typography variant="body2" noWrap sx={{ color: md3.onSurfaceVariant }}>
            {secondary}
          </Typography>
        )}
      </Box>
      {trailing && (
        <Typography variant="subtitle2" sx={{ color: trailing.startsWith('-') ? md3.error : md3.onSurface }}>
          {trailing}
        </Typography>
      )}
    </ButtonBase>
  );
}
