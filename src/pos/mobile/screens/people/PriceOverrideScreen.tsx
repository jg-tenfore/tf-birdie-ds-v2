import { useMemo, useState } from 'react';
import { Box, Button, IconButton, ListItemIcon, ListItemText, TextField } from '@mui/material';
import Close from '@mui/icons-material/Close';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import SellOutlined from '@mui/icons-material/SellOutlined';
import { md3, mobile, noteColors } from '../../../../theme/tokens';
import { formatTimeLabel } from '../../../data/courses';
import { moneyShort } from '../../../logic/cart';
import { timeRange } from '../../../logic/bookings';
import { timeRowKey } from '../../../state/pos-store';
import { usePos } from '../../../state/PosProvider';
import { Stack } from '../../../components/Stack';
import { DialogTopBar, MobileScreen } from '../../chrome';
import { useMobileNav } from '../../navigation';
import type { ScreenProps } from '../types';
import { FieldRow, FormSection, MoneyField, TimeRangeFields } from './parts';
import { moneyOrNull, shortDate } from './people-utils';

/**
 * Override the price of a row or a span of rows.
 *
 * Full-screen dialog, same exits as the other row operations. Four independent prices
 * because the club prices a round and its transport separately — a blank field keeps the
 * published rate rather than meaning "free". Overrides already set today are listed at
 * the foot so they can be seen and cleared without finding their rows.
 */
export function PriceOverrideScreen({ route }: ScreenProps<'priceOverride'>) {
  const nav = useMobileNav();
  const { state, dispatch, toast } = usePos();
  const existing = state.timePrices[timeRowKey(state.currentDate, route.timeMin)];

  const [start, setStart] = useState(route.timeMin);
  const [mode, setMode] = useState<'single' | 'range'>(
    existing?.rangeEnd && existing.rangeEnd !== route.timeMin ? 'range' : 'single',
  );
  const [end, setEnd] = useState(existing?.rangeEnd ?? route.timeMin);
  const [label, setLabel] = useState(existing?.label ?? '');
  const str = (n: number | null | undefined) => (n == null ? '' : String(n));
  const [fee, setFee] = useState(str(existing?.fee));
  const [walking, setWalking] = useState(str(existing?.walking));
  const [cart, setCart] = useState(str(existing?.cart));
  const [walkingCart, setWalkingCart] = useState(str(existing?.walkingCart));

  const targets = timeRange(start, mode === 'range' ? Math.max(end, start) : start);
  const prices = { fee: moneyOrNull(fee), walking: moneyOrNull(walking), cart: moneyOrNull(cart), walkingCart: moneyOrNull(walkingCart) };
  const anySet = Object.values(prices).some((v) => v != null);

  const prefix = `${state.currentDate.getFullYear()}-${state.currentDate.getMonth() + 1}-${state.currentDate.getDate()}_`;
  const today = useMemo(
    () =>
      Object.entries(state.timePrices)
        .filter(([k, v]) => k.startsWith(prefix) && v.rangeEnd != null)
        .map(([k, v]) => ({ key: k, startMin: Number(k.slice(prefix.length)), entry: v }))
        .sort((a, b) => a.startMin - b.startMin),
    [state.timePrices, prefix],
  );

  const save = () => {
    const rangeEnd = targets[targets.length - 1];
    targets.forEach((t) =>
      dispatch({
        type: 'setTimePrice',
        key: timeRowKey(state.currentDate, t),
        price: t === start ? { label: label.trim() || undefined, ...prices, rangeEnd } : { ...prices },
      }),
    );
    nav.pop();
    toast(`Price override · ${formatTimeLabel(start)}${rangeEnd !== start ? ` – ${formatTimeLabel(rangeEnd)}` : ''}`);
  };

  const clearRange = (anchor: number, rangeEnd: number) =>
    timeRange(anchor, rangeEnd).forEach((t) =>
      dispatch({ type: 'setTimePrice', key: timeRowKey(state.currentDate, t), price: null }),
    );

  return (
    <MobileScreen
      topBar={<DialogTopBar title={existing ? 'Edit price override' : 'Price override'} onConfirm={save} confirmDisabled={!anySet} />}
    >
      <FormSection title="Applies to" hint={shortDate(state.currentDate)}>
        <TimeRangeFields
          startMin={start}
          onStartChange={setStart}
          mode={mode}
          onModeChange={setMode}
          endMin={end}
          onEndChange={setEnd}
        />
      </FormSection>

      <FormSection title="Prices" hint="Leave blank to keep the published rate">
        <Stack gap={2}>
          <FieldRow>
            <MoneyField label="Green fee" value={fee} onChange={setFee} placeholder="Published" />
            <MoneyField label="Walking" value={walking} onChange={setWalking} placeholder="Published" />
          </FieldRow>
          <FieldRow>
            <MoneyField label="Riding cart" value={cart} onChange={setCart} placeholder="Published" />
            <MoneyField label="Walk + cart" value={walkingCart} onChange={setWalkingCart} placeholder="Published" />
          </FieldRow>
        </Stack>
      </FormSection>

      <FormSection title="Label" hint="Optional — shown on the banner above the rows">
        <TextField label="Label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Shoulder-season rate" slotProps={{ inputLabel: { shrink: true } }} />
      </FormSection>

      {today.length > 0 && (
        <FormSection title={`Overrides today · ${today.length}`}>
          <Box sx={{ mx: -2 }}>
            {today.map((o) => (
              <Stack key={o.key} direction="row" alignItems="center" sx={{ pl: 2, pr: 1, minHeight: mobile.listItem.two }}>
                <ListItemIcon>
                  <SellOutlined sx={{ color: noteColors.green.dot }} />
                </ListItemIcon>
                <ListItemText
                  primary={`${formatTimeLabel(o.startMin)}${o.entry.rangeEnd !== o.startMin ? ` – ${formatTimeLabel(o.entry.rangeEnd ?? o.startMin)}` : ''}`}
                  secondary={[o.entry.label, o.entry.fee != null ? `Green fee ${moneyShort(o.entry.fee)}` : null].filter(Boolean).join(' · ') || 'Custom prices'}
                />
                <IconButton aria-label="Remove override" onClick={() => clearRange(o.startMin, o.entry.rangeEnd ?? o.startMin)}>
                  <Close />
                </IconButton>
              </Stack>
            ))}
          </Box>
        </FormSection>
      )}

      {existing && (
        <Box sx={{ px: 2, pt: 3 }}>
          <Button
            variant="outlined"
            startIcon={<DeleteOutlined />}
            onClick={() => {
              clearRange(route.timeMin, existing.rangeEnd ?? route.timeMin);
              nav.pop();
              toast('Override removed');
            }}
            sx={{ color: md3.error, borderColor: md3.outlineVariant }}
          >
            Remove override
          </Button>
        </Box>
      )}
      <Box sx={{ height: 32 }} />
    </MobileScreen>
  );
}
