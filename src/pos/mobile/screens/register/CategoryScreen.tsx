import { Box, ButtonBase, Typography } from '@mui/material';
import AddCircleOutlined from '@mui/icons-material/AddCircleOutlined';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import LockOutlined from '@mui/icons-material/LockOutlined';
import { md3, mobile, radius } from '../../../../theme/tokens';
import { CATALOG, CATEGORY_ICONS, MEMBER_ITEM_TYPES } from '../../../data/catalog';
import { hasImages, itemImage } from '../../../data/item-images';
import { usePos } from '../../../state/PosProvider';
import type { CatalogItem } from '../../../types';
import { Icon } from '../../../components/primitives';
import { Stack } from '../../../components/Stack';
import { MobileScreen, TopAppBar } from '../../chrome';
import type { ScreenProps } from '../types';
import { Callout, ViewOrderBar, categoryColors, isHoleLocked, priceLabel, titleCase, useAddItem } from './parts';

/**
 * One category's items — pushed from the register, back arrow returns to it.
 *
 * Tapping an item adds it and confirms with a snackbar, but *doesn't* leave the screen:
 * ringing up three sleeves and a glove is three taps in one place, and the View order bar
 * at the bottom shows the running total as it grows.
 *
 * Two layouts, matching the terminal's rule: categories with product photos get a
 * two-column card grid (goods are sold by sight); rates, modifiers and services get an
 * MD3 list, because a blank image panel reads as missing content.
 */
export function CategoryScreen({ route }: ScreenProps<'category'>) {
  const { state } = usePos();
  const { add, sheets, lock } = useAddItem();
  const d = CATALOG[route.category];
  const c = categoryColors(route.category);
  const hasCheckIn = state.cart.some((i) => i.isCheckIn);
  const photos = d ? hasImages(d.items.map((i) => i.n)) : false;

  const qtyOf = (name: string) =>
    state.cart.filter((i) => i.name === name).reduce((s, i) => s + i.qty, 0);

  const flowBanner =
    route.category === 'CHECK IN' && state.flowMode && !hasCheckIn
      ? state.flowMode === 'reserve'
        ? 'Reserving a tee time — choose a rate, then a time on the order.'
        : 'Walk-in — choose a rate. Add a player for each golfer from the order.'
      : null;

  return (
    <MobileScreen
      topBar={<TopAppBar title={titleCase(route.category)} subtitle={`${d?.items.length ?? 0} items`} />}
      bottomBar={<ViewOrderBar />}
    >
      {!d ? (
        <Typography sx={{ p: 2 }}>Unknown category.</Typography>
      ) : (
        <>
          {(flowBanner || (d.isModifier && !hasCheckIn) || (route.category === 'CHECK IN' && lock)) && (
            <Box sx={{ px: 2, pt: 1 }}>
              {d.isModifier && !hasCheckIn ? (
                <Callout tone="warning" icon={<InfoOutlined fontSize="small" />}>
                  Modifiers change a round's price. Add a Check In rate first.
                </Callout>
              ) : route.category === 'CHECK IN' && lock ? (
                <Callout tone="info" icon={<LockOutlined fontSize="small" />}>
                  This order is {lock === '18H' ? '18' : '9'} holes, so {lock === '18H' ? '9' : '18'}-hole rates
                  are unavailable. One tee time can't mix hole counts.
                </Callout>
              ) : (
                <Callout tone="info" icon={<InfoOutlined fontSize="small" />}>
                  {flowBanner}
                </Callout>
              )}
            </Box>
          )}

          {photos ? (
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5, p: 2 }}>
              {d.items.map((item) => (
                <PhotoCard
                  key={item.n}
                  item={item}
                  qty={qtyOf(item.n)}
                  wash={c.wash}
                  line={c.line}
                  color={c.color}
                  icon={CATEGORY_ICONS[route.category] ?? 'sell'}
                  onClick={() => add(item)}
                />
              ))}
            </Box>
          ) : (
            <Box sx={{ py: 1 }}>
              {d.items.map((item) => {
                const locked = isHoleLocked(item, lock);
                const disabled = locked || (Boolean(d.isModifier) && !hasCheckIn);
                const qty = qtyOf(item.n);
                const support = locked
                  ? `Not available on ${lock === '18H' ? 'an 18' : 'a 9'}-hole order`
                  : item.desc ??
                    (MEMBER_ITEM_TYPES[item.n] ? 'Member rate · verify member' : qty ? `${qty} on order` : undefined);
                return (
                  <ButtonBase
                    key={item.n}
                    disabled={disabled}
                    onClick={() => add(item)}
                    sx={{
                      width: '100%',
                      justifyContent: 'flex-start',
                      gap: 2,
                      px: 2,
                      minHeight: support ? mobile.listItem.two : mobile.listItem.one,
                      opacity: disabled ? 0.4 : 1,
                    }}
                  >
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: `${radius.sm}px`,
                        bgcolor: item.tagColor ?? c.color,
                        color: md3.onPrimary,
                        display: 'grid',
                        placeItems: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {locked ? <LockOutlined fontSize="small" /> : <Icon name={CATEGORY_ICONS[route.category] ?? 'sell'} size={20} />}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                      <Typography variant="body1" noWrap>
                        {item.n}
                      </Typography>
                      {support && (
                        <Typography variant="body2" noWrap sx={{ color: md3.onSurfaceVariant }}>
                          {support}
                        </Typography>
                      )}
                    </Box>
                    <Typography
                      variant="subtitle2"
                      sx={{ color: item.p < 0 || item.isDiscount ? md3.error : md3.onSurface }}
                    >
                      {priceLabel(item)}
                    </Typography>
                    <AddCircleOutlined sx={{ color: md3.primary }} />
                  </ButtonBase>
                );
              })}
            </Box>
          )}
        </>
      )}
      {sheets}
    </MobileScreen>
  );
}

/** A product card: photo on white (the source shots are cut out on white), name, price. */
function PhotoCard({
  item,
  qty,
  wash,
  line,
  color,
  icon,
  onClick,
}: {
  item: CatalogItem;
  qty: number;
  wash: string;
  line: string;
  color: string;
  icon: string;
  onClick: () => void;
}) {
  const img = itemImage(item.n);
  return (
    <ButtonBase
      onClick={onClick}
      sx={{
        position: 'relative',
        flexDirection: 'column',
        alignItems: 'stretch',
        borderRadius: `${radius.md}px`,
        border: `1px solid ${line}`,
        bgcolor: wash,
        overflow: 'hidden',
        textAlign: 'left',
      }}
    >
      <Box
        sx={{
          height: 120,
          bgcolor: img ? md3.onPrimary : 'transparent',
          color: color,
          position: 'relative',
          borderBottom: `1px solid ${line}`,
          display: 'grid',
          placeItems: 'center',
        }}
      >
        {/* No photo: the category glyph, so the card doesn't read as a failed image. */}
        {!img && <Icon name={icon} size={40} />}
        {img && (
          <Box
            component="img"
            src={img}
            alt=""
            loading="lazy"
            sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', p: 1, boxSizing: 'border-box' }}
          />
        )}
      </Box>
      <Stack gap={0.25} sx={{ p: 1.5, flex: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 500, minHeight: 40, lineHeight: 1.43 }}>
          {item.n}
        </Typography>
        <Typography variant="subtitle2" sx={{ color: item.p < 0 ? md3.error : md3.onSurface }}>
          {priceLabel(item)}
        </Typography>
      </Stack>
      {qty > 0 && (
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            minWidth: 24,
            height: 24,
            px: 0.75,
            borderRadius: 12,
            bgcolor: md3.primary,
            color: md3.onPrimary,
            fontSize: 12,
            fontWeight: 700,
            display: 'grid',
            placeItems: 'center',
          }}
        >
          {qty}
        </Box>
      )}
    </ButtonBase>
  );
}
