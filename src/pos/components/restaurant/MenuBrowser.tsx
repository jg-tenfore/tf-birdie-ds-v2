import { useState, type ReactNode } from 'react';
import { Box, ButtonBase, Menu, MenuItem as MuiMenuItem, Typography } from '@mui/material';
import { md3, radius } from '../../../theme/tokens';
import { demoNow } from '../../data/bookings';
import { menuItemsIn, modifierGroup, type MenuId, type MenuItem } from '../../data/menu';
import { menuImage } from '../../data/menu-images';
import { isMenuRunning, menuWindow, menusInOrder, notRunningReason, openingMenu, scheduledMenu, type ScheduledMenu } from '../../data/menu-schedule';
import { money } from '../../logic/cart';
import { groupsOf } from '../../logic/dish-choice';
import type { DishTarget } from '../../state/restaurant';
import { usePos } from '../../state/PosProvider';
import { Icon } from '../primitives';
import { Stack } from '../Stack';

/**
 * The menu, as both Tabs and Quick Order sell from it (V1 → V2, Wave 2).
 *
 * ## What v1 did
 *
 * Two different browsers for one catalog. Quick Order's category tiles **replaced the whole
 * browsing surface** — search, menu sets and grid all vanished behind a tall header card naming
 * the category, and the only way back was a BACK button greyed out until you had drilled in.
 * The tab editor had its own copy with different menu sets, and it too swapped the grid out from
 * under you. Tiles were photographs (Del Frisco's, off Uber Eats — not ours to publish).
 *
 * ## What this does
 *
 * One component, three rows that never leave the screen: the **menu**, its **categories**, and the
 * **items** of the chosen one. Changing category changes only the bottom row, so where you are is
 * always visible and one tap from anywhere else. Tiles carry the dish's photo (Nov 26), its name,
 * price and a line of description, and say when an item has options to choose.
 *
 * ## Menus by day and time (Nov 26, from TF Buck)
 *
 * The menu row lists Buck's menus (`data/menu-schedule.ts`): the ones **running now** as segments,
 * and the rest behind **More menus**, each saying when it runs. A screen opens on the running menu
 * of its own kind — the counter on the *19th Hole Menu*, a table on *Lunch* at noon and *Dinner*
 * after five. Picking one that is not running is allowed (a guest asks for a dinner side at four)
 * and says so under the row, rather than refusing.
 *
 * Tapping an item sells it to `target` (a tab, or the register's own order) at `seat`. An item
 * with a **required** choice — a burger's temperature, a sandwich's side — opens the dish dialog,
 * because it cannot be cooked without the answer. Everything else is added at once, and stays
 * editable: tapping the line opens the same dialog for allergies or add-ons. The first cut opened
 * the dialog for any item with options, which, because allergies apply to nearly everything, put
 * an extra tap in front of most of the dining-room menu. Doing this here, rather than in each
 * screen, is what makes the two screens behave the same.
 */
export function MenuBrowser({
  target,
  seat,
  defaultMenu = 'counter',
  caption,
}: {
  target: DishTarget;
  /** The seat that receives the next item. Absent on the counter, or for a shared plate. */
  seat?: number;
  /** Which kind of menu this screen opens on — it opens on the running menu of this set. */
  defaultMenu?: MenuId;
  /** Drawn at the right of the menu row — the tab says which seat is receiving here. */
  caption?: ReactNode;
}) {
  const { dispatch, toast } = usePos();
  const now = demoNow();
  const [menuId, setMenuId] = useState<string>(() => openingMenu(defaultMenu, now).id);
  const menu = scheduledMenu(menuId) ?? openingMenu(defaultMenu, now);
  const [category, setCategory] = useState(menu.categories[0]);
  const [moreAnchor, setMoreAnchor] = useState<HTMLElement | null>(null);
  const shown = menu.categories.includes(category) ? category : menu.categories[0];
  const items = menuItemsIn(menu.set, shown);

  const ordered = menusInOrder(now);
  const running = ordered.filter((m) => isMenuRunning(m, now));
  // The segments: what is running, plus the chosen menu if it is not — so the choice stays visible.
  const segments = running.includes(menu) ? running : [...running, menu];
  const others = ordered.filter((m) => !segments.includes(m));
  const offHours = notRunningReason(menu, now);

  const pickMenu = (m: ScheduledMenu) => {
    setMenuId(m.id);
    setCategory(m.categories[0]);
    setMoreAnchor(null);
  };

  const sell = (item: MenuItem) => {
    if ((item.modifiers ?? []).some((g) => modifierGroup(g)?.required)) {
      dispatch({ type: 'openModal', modal: { kind: 'dish', target, menuItemId: item.id, seat } });
      return;
    }
    dispatch({ type: 'addDish', target, menuItemId: item.id, modifiers: [], seat });
    toast(`Added: ${item.name}${seat ? ` · Seat ${seat}` : target === 'cart' ? '' : ' · Shared'}`);
  };

  return (
    <Stack data-menu-browser={menu.set} data-menu-open={menu.id} sx={{ flex: 1, minWidth: 0, minHeight: 0, bgcolor: md3.surface }}>
      <Stack direction="row" alignItems="center" gap={1.5} sx={{ p: '12px 16px 8px', flexShrink: 0 }}>
        <Stack
          direction="row"
          role="group"
          aria-label="Menu"
          sx={{ p: '3px', borderRadius: `${radius.xl}px`, bgcolor: md3.surfaceHighest, flexShrink: 0 }}
        >
          {segments.map((m) => {
            const on = m.id === menu.id;
            const live = isMenuRunning(m, now);
            return (
              <ButtonBase
                key={m.id}
                // The set, so "the counter's menu" and "the dining room's" are one selector each;
                // `data-menu` names the Buck menu itself.
                data-menu-switch={m.set}
                data-menu={m.id}
                aria-pressed={on}
                title={menuWindow(m)}
                onClick={() => pickMenu(m)}
                sx={{
                  minHeight: 44,
                  px: 2.25,
                  gap: 0.75,
                  borderRadius: `${radius.xl}px`,
                  bgcolor: on ? '#fff' : 'transparent',
                  boxShadow: on ? '0 1px 3px rgba(0,0,0,.15)' : 'none',
                  color: on ? md3.onSurface : md3.onSurfaceVariant,
                  fontSize: 14,
                  fontWeight: on ? 800 : 600,
                }}
              >
                <Icon name={m.set === 'counter' ? 'lunch_dining' : 'restaurant_menu'} size={17} />
                {m.title}
                {!live && <Icon name="schedule" size={15} color={md3.outline} />}
              </ButtonBase>
            );
          })}
        </Stack>
        {others.length > 0 && (
          <ButtonBase
            data-more-menus
            aria-haspopup="menu"
            onClick={(e) => setMoreAnchor(e.currentTarget)}
            sx={{ minHeight: 44, px: 1.5, gap: 0.5, borderRadius: `${radius.xl}px`, border: `1.5px solid ${md3.outlineVariant}`, fontSize: 13, fontWeight: 700, color: md3.onSurfaceVariant, flexShrink: 0 }}
          >
            More menus
            <Icon name="expand_more" size={17} />
          </ButtonBase>
        )}
        <Menu anchorEl={moreAnchor} open={Boolean(moreAnchor)} onClose={() => setMoreAnchor(null)} slotProps={{ paper: { sx: { width: 320 } } }}>
          {others.map((m) => (
            <MuiMenuItem key={m.id} data-menu-option={m.id} onClick={() => pickMenu(m)} sx={{ display: 'block', py: 1 }}>
              <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{m.title}</Typography>
              <Typography sx={{ fontSize: 11.5, color: md3.onSurfaceVariant, whiteSpace: 'normal' }}>{menuWindow(m)}</Typography>
              <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#92400e' }}>{notRunningReason(m, now) ?? 'Running now'}</Typography>
            </MuiMenuItem>
          ))}
        </Menu>
        <Box sx={{ flex: 1 }} />
        {caption}
      </Stack>

      {offHours && (
        <Stack direction="row" alignItems="center" gap={0.75} data-menu-off-hours sx={{ mx: 2, mb: 1, px: 1.25, py: 0.75, borderRadius: `${radius.sm}px`, bgcolor: '#fef3c7', color: '#92400e', fontSize: 12.5, fontWeight: 600, flexShrink: 0 }}>
          <Icon name="schedule" size={15} />
          {menu.title} is not running now ({offHours}). Its items still ring at their usual price.
        </Stack>
      )}

      <Stack
        direction="row"
        role="group"
        aria-label="Category"
        gap={0.75}
        sx={{ px: 2, pb: 1.25, flexWrap: 'wrap', flexShrink: 0, borderBottom: `1px solid ${md3.outlineVariant}` }}
      >
        {menu.categories.map((c) => {
          const on = c === shown;
          return (
            <ButtonBase
              key={c}
              data-menu-category={c}
              aria-pressed={on}
              onClick={() => setCategory(c)}
              sx={{
                minHeight: 44,
                px: 2,
                borderRadius: `${radius.xl}px`,
                border: `1.5px solid ${on ? md3.primary : md3.outlineVariant}`,
                bgcolor: on ? md3.primaryContainer : '#fff',
                color: on ? md3.onPrimaryContainer : md3.onSurfaceVariant,
                fontSize: 13.5,
                fontWeight: on ? 800 : 600,
              }}
            >
              {c}
            </ButtonBase>
          );
        })}
      </Stack>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          p: 2,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(176px, 1fr))',
          gridAutoRows: 'min-content',
          gap: '10px',
        }}
      >
        {items.map((item) => (
          <ItemTile key={item.id} item={item} onClick={() => sell(item)} />
        ))}
      </Box>
    </Stack>
  );
}

/**
 * One item. A photo on top when it has one (`menuImage` — its own, or an unbranded stand-in for a
 * branded snack or drink), then name, description and price; without one, the text tile it always
 * was, so a dish added before its photo still reads as finished. "Options" marks an item that opens
 * the dish dialog, and "Choose" one that cannot be sent until something is chosen, so the extra step
 * is expected rather than a surprise.
 */
function ItemTile({ item, onClick }: { item: MenuItem; onClick: () => void }) {
  const groups = groupsOf(item);
  const required = groups.some((g) => g.required);
  const photo = menuImage(item);
  return (
    <ButtonBase
      data-menu-item={item.id}
      data-has-photo={photo ? true : undefined}
      onClick={onClick}
      sx={{
        minHeight: 104,
        p: 0,
        borderRadius: `${radius.md}px`,
        border: `1.5px solid ${md3.outlineVariant}`,
        bgcolor: '#fff',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        justifyContent: 'flex-start',
        textAlign: 'left',
        '&:active': { borderColor: md3.primary, bgcolor: md3.primaryContainer },
      }}
    >
      {photo && (
        <Box
          component="img"
          src={photo}
          alt=""
          loading="lazy"
          draggable={false}
          sx={{ display: 'block', width: '100%', height: 120, objectFit: 'contain', bgcolor: '#fff', borderBottom: `1px solid ${md3.outlineVariant}` }}
        />
      )}
      <Stack gap={0.5} sx={{ flex: 1, p: '10px 14px 12px' }}>
        <Typography sx={{ fontSize: 14, fontWeight: 800, lineHeight: 1.25 }}>{item.name}</Typography>
        <Typography
          sx={{
            fontSize: 11.5,
            color: md3.onSurfaceVariant,
            lineHeight: 1.35,
            display: '-webkit-box',
            WebkitLineClamp: photo ? 1 : 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {item.description}
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
          <Typography sx={{ fontSize: 14, fontWeight: 800, color: md3.primary }}>{money(item.price)}</Typography>
          {groups.length > 0 && (
            <Stack
              direction="row"
              alignItems="center"
              gap={0.375}
              sx={{ fontSize: 10.5, fontWeight: 700, color: required ? md3.onSurface : md3.outline }}
            >
              <Icon name="tune" size={13} />
              {required ? 'Choose' : 'Options'}
            </Stack>
          )}
        </Stack>
      </Stack>
    </ButtonBase>
  );
}
