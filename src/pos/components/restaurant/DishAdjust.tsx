import { Box, ButtonBase, Typography } from '@mui/material';
import { md3, radius } from '../../../theme/tokens';
import { money } from '../../logic/cart';
import { dishUnitPrice } from '../../logic/restaurant';
import { tabById, type DishTarget } from '../../state/restaurant';
import { usePos } from '../../state/PosProvider';
import type { CartItem } from '../../types';
import { Stack } from '../Stack';

/**
 * Seat and price for one plate: **Move**, **Split** and **Discount** (V1 → V2, Wave 2).
 *
 * v1 kept these in each line's ⋮ menu, beside Fire, Edit and Delete — every action on every line,
 * whether or not it applied. The first cut of this wave kept v1's principle of offering only what
 * applies and, in doing so, lost these three altogether.
 *
 * None of them touches the food, so none is stopped by the kitchen lock: moving a fired plate from
 * seat 2 to seat 3 changes who pays, not what the cook makes. So this opens on sent and unsent plates
 * alike — only a voided one has nothing left to adjust. And each part appears only where it means
 * something: seats only on a tab, a split only on a line of two or more.
 */
const DISCOUNTS = [0, 10, 25, 50, 100];

export function DishAdjust({ line, target }: { line: CartItem; target: DishTarget }) {
  const { state, dispatch, toast } = usePos();
  const dish = line.dish!;
  const tab = target === 'cart' ? undefined : tabById(state, target.tabId);
  const seats = tab ? Array.from({ length: tab.guests }, (_, i) => i + 1) : [];
  const full = dishUnitPrice({ ...dish, discountPct: 0 });
  const seatLabel = (s: number | null) => (s ? `Seat ${s}` : 'Shared');

  return (
    <Box
      data-dish-adjust={dish.lineId}
      sx={{ mt: 1, p: '10px 12px', borderRadius: `${radius.md}px`, bgcolor: '#fff', border: `1px solid ${md3.outlineVariant}` }}
    >
      {tab && (
        <Row label="Move to">
          {[...seats, null].map((s) => (
            <Pick
              key={s ?? 'shared'}
              label={seatLabel(s)}
              active={(dish.seat ?? null) === s}
              onClick={() => {
                dispatch({ type: 'moveDish', target, lineId: dish.lineId, seat: s });
                toast(`${line.name} → ${seatLabel(s)}`);
              }}
            />
          ))}
        </Row>
      )}

      {tab && line.qty >= 2 && (
        <Row label={`Split one of ${line.qty} to`}>
          {[...seats, null]
            .filter((s) => s !== (dish.seat ?? null))
            .map((s) => (
              <Pick
                key={s ?? 'shared'}
                label={seatLabel(s)}
                onClick={() => {
                  dispatch({ type: 'splitDish', target, lineId: dish.lineId, seat: s });
                  toast(`One ${line.name} → ${seatLabel(s)}`);
                }}
              />
            ))}
        </Row>
      )}

      <Row label="Discount">
        {DISCOUNTS.map((pct) => (
          <Pick
            key={pct}
            label={pct === 0 ? 'None' : pct === 100 ? 'Comp' : `${pct}%`}
            active={(dish.discountPct ?? 0) === pct}
            onClick={() => {
              dispatch({ type: 'discountDish', target, lineId: dish.lineId, pct });
              toast(pct ? `${line.name}: ${pct === 100 ? 'comped' : `${pct}% off`}` : `${line.name}: full price`);
            }}
          />
        ))}
        {dish.discountPct ? (
          <Typography sx={{ fontSize: 11.5, color: md3.onSurfaceVariant, ml: 0.5 }}>
            {money(full)} → {money(line.price)}
          </Typography>
        ) : null}
      </Row>
    </Box>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box sx={{ mb: 0.75, '&:last-child': { mb: 0 } }}>
      <Typography sx={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.05em', color: md3.onSurfaceVariant, mb: 0.5, textTransform: 'uppercase' }}>
        {label}
      </Typography>
      <Stack direction="row" gap={0.5} alignItems="center" sx={{ flexWrap: 'wrap' }}>
        {children}
      </Stack>
    </Box>
  );
}

function Pick({ label, active, onClick }: { label: string; active?: boolean; onClick: () => void }) {
  return (
    <ButtonBase
      onClick={onClick}
      aria-pressed={active}
      sx={{
        minHeight: 40,
        px: 1.5,
        borderRadius: `${radius.xl}px`,
        border: `1.5px solid ${active ? md3.primary : md3.outlineVariant}`,
        bgcolor: active ? md3.primaryContainer : '#fff',
        fontSize: 12.5,
        fontWeight: 600,
      }}
    >
      {label}
    </ButtonBase>
  );
}
