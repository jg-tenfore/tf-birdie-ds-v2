import { useState } from 'react';
import { Box, Button, ButtonBase, IconButton, InputBase, Typography } from '@mui/material';
import Close from '@mui/icons-material/Close';
import ExpandMore from '@mui/icons-material/ExpandMore';
import LunchDiningOutlined from '@mui/icons-material/LunchDiningOutlined';
import ReceiptLongOutlined from '@mui/icons-material/ReceiptLongOutlined';
import RestaurantMenuOutlined from '@mui/icons-material/RestaurantMenuOutlined';
import ScheduleOutlined from '@mui/icons-material/ScheduleOutlined';
import Search from '@mui/icons-material/Search';
import { md3, mobile, radius } from '../../../../theme/tokens';
import { demoNow } from '../../../data/bookings';
import { MENU_ITEMS, MENUS, menuItemsIn, modifierGroup, type MenuId, type MenuItem } from '../../../data/menu';
import {
  isMenuRunning,
  menuWindow,
  menusInOrder,
  notRunningReason,
  openingMenu,
  scheduledMenu,
  type ScheduledMenu,
} from '../../../data/menu-schedule';
import { money, orderTotals } from '../../../logic/cart';
import { unsent } from '../../../logic/restaurant';
import { taxRateOf } from '../../../state/operations';
import { linesOf, tabById, type DishTarget } from '../../../state/restaurant';
import { usePos } from '../../../state/PosProvider';
import { Stack } from '../../../components/Stack';
import { BottomSheet, MobileScreen, TopAppBar } from '../../chrome';
import { useMobileNav } from '../../navigation';
import type { ScreenProps } from '../types';
import { Callout } from '../register/parts';
import { MenuTile, Pill, ScrollRow } from './parts';
import { isRootRoute, seatColor, seatLabel } from './restaurant-helpers';

/**
 * The menu on the handheld (V1 → V2) — what a tab and Quick Order both sell from.
 *
 * The tablet's `MenuBrowser`, at 360dp. Same rules, so the two can't behave differently:
 *
 * - **Buck's menus by day and time** (`menu-schedule.ts`). The screen opens on the menu running at
 *   the demo's clock — a tab on the dining room's, the counter on the counter's — and every other
 *   menu is one tap away under the menu button, saying when it runs. A menu that is not running
 *   says so above its items, which still ring at their usual price.
 * - **Categories** stay on screen as one row of chips that scrolls sideways inside itself.
 * - **Search** looks across *both* menus, because a server looking for the Caesar should not have
 *   to know whose menu it is on.
 * - **Photos** on every tile, 1:1 on white (`menu-images.ts`), two tiles to a row.
 * - **Tapping sells.** An item with a *required* choice — a burger's temp, a sandwich's side —
 *   opens the dish dialog, because it can't be cooked without the answer; anything else is added
 *   at once and stays editable from its line. That is the tablet's rule, not a phone shortcut.
 *
 * On a tab, the **seat row** says where the next item goes and switches seat without leaving the
 * menu, so a whole table's order can be taken in one pass; the bottom bar goes back to the tab.
 * At the counter there are no seats, and the bottom bar opens the order being built.
 */
export function MenuScreen({ route }: ScreenProps<'menu'>) {
  return <MenuBody target={{ tabId: route.tabId }} initialSeat={route.seat ?? null} prefer="nineteenth" />;
}

/**
 * Quick Order — the counter: the menu, selling onto the register's own order (`'cart'`), as the
 * tablet's `QuickOrderView` does. While a tab is on the register being paid, the counter waits —
 * the store refuses counter dishes then — and the screen says so instead of letting a tap do nothing.
 */
export function QuickOrderScreen({ route }: ScreenProps<'quickOrder'>) {
  const nav = useMobileNav();
  return <MenuBody target="cart" initialSeat={null} prefer="counter" root={isRootRoute(nav, route)} />;
}

function MenuBody({
  target,
  initialSeat,
  prefer,
  root = false,
}: {
  target: DishTarget;
  initialSeat: number | null;
  prefer: MenuId;
  root?: boolean;
}) {
  const { state, dispatch, toast } = usePos();
  const nav = useMobileNav();
  const now = demoNow();
  const [menuId, setMenuId] = useState(() => openingMenu(prefer, now).id);
  const menu = scheduledMenu(menuId) ?? openingMenu(prefer, now);
  const [category, setCategory] = useState(menu.categories[0]);
  const [seat, setSeat] = useState<number | null>(initialSeat);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [menusOpen, setMenusOpen] = useState(false);

  const tab = target === 'cart' ? undefined : tabById(state, target.tabId);
  const lines = linesOf(state, target);
  const shown = menu.categories.includes(category) ? category : menu.categories[0];
  const q = query.trim().toLowerCase();
  const items: MenuItem[] = q
    ? MENU_ITEMS.filter((i) => i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q))
    : menuItemsIn(menu.set, shown);
  const offHours = notRunningReason(menu, now);
  const payingTab = target === 'cart' ? tabById(state, state.payingTabId) : undefined;
  const counts = new Map<string, number>();
  for (const l of lines) {
    if (!l.dish || l.dish.voided || (tab && (l.dish.seat ?? null) !== seat)) continue;
    counts.set(l.dish.menuItemId, (counts.get(l.dish.menuItemId) ?? 0) + l.qty);
  }

  const pickMenu = (m: ScheduledMenu) => {
    setMenuId(m.id);
    setCategory(m.categories[0]);
    setMenusOpen(false);
  };

  const sell = (item: MenuItem) => {
    const at = tab ? (seat ?? undefined) : undefined;
    if ((item.modifiers ?? []).some((g) => modifierGroup(g)?.required)) {
      nav.push({ name: 'dish', target, menuItemId: item.id, seat: at });
      return;
    }
    dispatch({ type: 'addDish', target, menuItemId: item.id, modifiers: [], seat: at });
    toast(`Added: ${item.name}${tab ? ` · ${seatLabel(seat)}` : ''}`);
  };

  const totals = orderTotals(lines, taxRateOf(state));
  const toSend = unsent(lines).length;

  return (
    <MobileScreen
      topBar={
        <TopAppBar
          title={tab ? `Add to ${tab.name}` : 'Quick Order'}
          subtitle={tab ? undefined : 'Selling onto the counter order'}
          leading={root ? 'none' : 'back'}
          actions={
            <IconButton
              aria-label={searching ? 'Close search' : 'Search the menus'}
              onClick={() => (searching ? (setSearching(false), setQuery('')) : setSearching(true))}
            >
              {searching ? <Close /> : <Search />}
            </IconButton>
          }
        >
          {searching && (
            <Box sx={{ px: 2, pb: 1 }}>
              <Stack direction="row" alignItems="center" gap={1} sx={{ height: 48, px: 2, borderRadius: 24, bgcolor: md3.surfaceHigh }}>
                <Search sx={{ color: md3.onSurfaceVariant }} />
                <InputBase
                  autoFocus
                  fullWidth
                  placeholder="Search both menus"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  inputProps={{ 'aria-label': 'Search both menus' }}
                  sx={{ fontSize: 16 }}
                />
              </Stack>
            </Box>
          )}
          {tab && (
            <ScrollRow label="Seat" sx={{ pb: 1 }}>
              {[...Array.from({ length: tab.guests }, (_, i) => (i + 1) as number | null), null].map((s) => (
                <Pill key={s ?? 'shared'} label={seatLabel(s)} swatch={seatColor(s)} active={s === seat} onClick={() => setSeat(s)} />
              ))}
            </ScrollRow>
          )}
          {!q && (
            // One row: the menu that is showing (a tap lists the others, with when they run), then
            // its categories. The row scrolls inside itself; the page never scrolls sideways.
            <ScrollRow label="Category" sx={{ pb: 1.25 }}>
              <ButtonBase
                data-menu-button={menu.id}
                aria-haspopup="dialog"
                aria-label={`Menu: ${menu.title}${offHours ? `, ${offHours}` : ', running now'}`}
                onClick={() => setMenusOpen(true)}
                sx={{
                  minHeight: 40,
                  px: 1.25,
                  gap: 0.5,
                  flexShrink: 0,
                  borderRadius: `${radius.sm}px`,
                  bgcolor: mobile.secondaryContainer,
                  color: mobile.onSecondaryContainer,
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                {menu.set === 'counter' ? <LunchDiningOutlined fontSize="small" /> : <RestaurantMenuOutlined fontSize="small" />}
                {menu.title}
                {offHours && <ScheduleOutlined sx={{ fontSize: 16 }} />}
                <ExpandMore fontSize="small" />
              </ButtonBase>
              <Box sx={{ width: '1px', alignSelf: 'stretch', my: 0.75, bgcolor: md3.outlineVariant, flexShrink: 0 }} />
              {menu.categories.map((c) => (
                <Pill key={c} label={c} active={c === shown} onClick={() => setCategory(c)} />
              ))}
            </ScrollRow>
          )}
        </TopAppBar>
      }
      bottomBar={
        tab ? (
          <Box sx={{ flexShrink: 0, px: 2, py: 1.5, bgcolor: md3.surfaceContainer, borderTop: `1px solid ${md3.outlineVariant}` }}>
            <Button
              variant="contained"
              size="large"
              fullWidth
              startIcon={<ReceiptLongOutlined />}
              onClick={() => nav.pop()}
              data-back-to-tab
            >
              {toSend ? `Review tab · ${toSend} not sent · ${money(totals.total)}` : `Review tab · ${money(totals.total)}`}
            </Button>
          </Box>
        ) : lines.length > 0 && !payingTab ? (
          <Box sx={{ flexShrink: 0, px: 2, py: 1.5, bgcolor: md3.surfaceContainer, borderTop: `1px solid ${md3.outlineVariant}` }}>
            <Button
              variant="contained"
              size="large"
              fullWidth
              startIcon={<ReceiptLongOutlined />}
              onClick={() => nav.push({ name: 'counterOrder' })}
              data-review-order
            >
              Review order · {lines.filter((l) => !l.isSubItem).length} · {money(totals.total)}
            </Button>
          </Box>
        ) : undefined
      }
    >
      {payingTab ? (
        <Box sx={{ p: 2 }} data-quick-order-busy>
          <Callout tone="warning">
            {payingTab.name} is on the register, being paid. Finish taking that payment, or clear it, before ringing up the counter —
            anything added now would be charged to their tab without ever being written onto it.
          </Callout>
        </Box>
      ) : (
        <>
          {offHours && !q && (
            <Stack
              direction="row"
              alignItems="center"
              gap={1}
              data-menu-off-hours
              sx={{ mx: 2, mt: 1, px: 1.5, py: 1, borderRadius: `${radius.sm}px`, bgcolor: '#fef3c7', color: '#92400e' }}
            >
              <ScheduleOutlined fontSize="small" />
              <Typography variant="body2" sx={{ color: '#92400e' }}>
                {menu.title} isn’t running now. Its items still ring at their usual price.
              </Typography>
            </Stack>
          )}
          {q && (
            <Typography variant="body2" sx={{ px: 2, pt: 1.5, color: md3.onSurfaceVariant }}>
              {items.length} on both menus
            </Typography>
          )}
          <Box data-menu-grid sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1, p: 2 }}>
            {items.map((item) => (
              <MenuTile key={item.id} item={item} count={counts.get(item.id)} onClick={() => sell(item)} />
            ))}
          </Box>
        </>
      )}

      <BottomSheet open={menusOpen} onClose={() => setMenusOpen(false)} title="Menus">
        <Box sx={{ pb: 1 }}>
          {menusInOrder(now).map((m) => {
            const live = isMenuRunning(m, now);
            const on = m.id === menu.id;
            return (
              <ButtonBase
                key={m.id}
                data-menu-option={m.id}
                aria-pressed={on}
                onClick={() => pickMenu(m)}
                sx={{
                  width: '100%',
                  minHeight: mobile.listItem.three,
                  px: 3,
                  gap: 2,
                  justifyContent: 'flex-start',
                  textAlign: 'left',
                  bgcolor: on ? mobile.secondaryContainer : 'transparent',
                }}
              >
                {m.set === 'counter' ? (
                  <LunchDiningOutlined sx={{ color: md3.onSurfaceVariant }} />
                ) : (
                  <RestaurantMenuOutlined sx={{ color: md3.onSurfaceVariant }} />
                )}
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body1">
                    {m.title}{' '}
                    <Typography component="span" variant="caption">
                      · {MENUS.find((x) => x.id === m.set)?.name}
                    </Typography>
                  </Typography>
                  <Typography variant="body2" sx={{ color: md3.onSurfaceVariant }}>
                    {menuWindow(m)}
                  </Typography>
                  <Typography variant="caption" sx={{ color: live ? md3.primary : '#92400e', fontWeight: 600 }}>
                    {notRunningReason(m, now) ?? 'Running now'}
                  </Typography>
                </Box>
              </ButtonBase>
            );
          })}
        </Box>
      </BottomSheet>
    </MobileScreen>
  );
}
