import type { ScreenMap } from '../types';
import { BookingActionScreen } from './BookingActionScreen';
import { BookingDetailScreen } from './BookingDetailScreen';
import { DaySummaryScreen } from './DaySummaryScreen';
import { MovePlayersScreen } from './MovePlayersScreen';
import { NewTeeTimeScreen } from './NewTeeTimeScreen';
import { PlayerDetailScreen } from './PlayerDetailScreen';
import { TeeSheetFiltersScreen } from './TeeSheetFiltersScreen';
import { TeeSheetScreen } from './TeeSheetScreen';
import { TeeSheetSearchScreen } from './TeeSheetSearchScreen';

/** Tee Sheet destination — desktop sections 2 · Tee Sheet and 3 · Booking & Check-in. */
export const teeScreens: Pick<
  ScreenMap,
  | 'teeSheet'
  | 'teeSheetFilters'
  | 'teeSheetSearch'
  | 'daySummary'
  | 'bookingDetail'
  | 'playerDetail'
  | 'bookingAction'
  | 'newTeeTime'
  | 'movePlayers'
> = {
  teeSheet: TeeSheetScreen,
  teeSheetFilters: TeeSheetFiltersScreen,
  teeSheetSearch: TeeSheetSearchScreen,
  daySummary: DaySummaryScreen,
  bookingDetail: BookingDetailScreen,
  playerDetail: PlayerDetailScreen,
  bookingAction: BookingActionScreen,
  newTeeTime: NewTeeTimeScreen,
  movePlayers: MovePlayersScreen,
};
