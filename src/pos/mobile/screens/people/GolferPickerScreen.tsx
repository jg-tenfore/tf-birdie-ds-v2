import { Box, ListItemButton, ListItemText } from '@mui/material';
import PersonAddOutlined from '@mui/icons-material/PersonAddOutlined';
import { md3, mobile } from '../../../../theme/tokens';
import { usePos } from '../../../state/PosProvider';
import { MobileScreen, TopAppBar } from '../../chrome';
import { useMobileNav } from '../../navigation';
import type { ScreenProps } from '../types';
import { GolferList, GolferSearchHeader } from './parts';
import { useGolferSearch } from './people-utils';
import { attachGolfer } from './pick-golfer';

/**
 * The People search in picker mode.
 *
 * A push, not a dialog: picking is a single tap with nothing to abandon, so a back arrow
 * is the honest exit and there is no Save. Tapping a golfer attaches them and pops back to
 * whoever opened the picker — the order, a seat on a round, or the new-tee-time form
 * (`booking`, which sets `bookingGolfer` and leaves the open order's customer alone).
 */
export function GolferPickerScreen({ route }: ScreenProps<'golferPicker'>) {
  const nav = useMobileNav();
  const { state, dispatch, toast } = usePos();
  const search = useGolferSearch();
  const { target } = route;

  const seatTarget = typeof target === 'object' ? target : null;
  const item = seatTarget ? state.cart[seatTarget.itemIdx] : null;
  const seat = seatTarget ? item?.players?.[seatTarget.playerIdx] : null;
  const title = target === 'booking' ? 'Customer for tee time' : 'Add golfer';
  const subtitle =
    target === 'primary'
      ? 'Customer for this order'
      : target === 'booking'
        ? state.bookingGolfer
          ? `Replaces ${state.bookingGolfer.name}`
          : 'Who the tee time is booked for'
        : `Player ${target.playerIdx + 1}${seat?.name ? ` · replaces ${seat.name}` : ''} · ${item?.name ?? 'round'}`;

  return (
    <MobileScreen
      topBar={
        <TopAppBar title={title} subtitle={subtitle}>
          <GolferSearchHeader search={search} />
        </TopAppBar>
      }
    >
      <GolferList
        golfers={search.results}
        onPick={(g) => {
          attachGolfer(dispatch, target, g);
          toast(`${g.name} added`);
          nav.pop();
        }}
        leading={
          <li>
            <ListItemButton onClick={() => nav.push({ name: 'newCustomer' })} sx={{ minHeight: mobile.listItem.one, gap: 2 }}>
              <Box
                sx={{ width: 40, height: 40, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: md3.primaryContainer, color: md3.onPrimaryContainer }}
              >
                <PersonAddOutlined />
              </Box>
              <ListItemText
                primary="Add new customer"
                secondary="Not in the system yet"
                slotProps={{ primary: { sx: { color: md3.primary, fontWeight: 500 } } }}
              />
            </ListItemButton>
          </li>
        }
      />
    </MobileScreen>
  );
}
